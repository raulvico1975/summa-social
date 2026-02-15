/**
 * API Route: Support Bot
 *
 * Deterministic retrieval over KB cards + LLM reformatter (Genkit/Gemini).
 * Auth: verifyIdToken + validateUserMembership + requireOperationalAccess.
 *
 * @see CLAUDE.md — src/app/api/** = RISC ALT
 */

import { NextRequest, NextResponse } from 'next/server'
import { ai } from '@/ai/genkit'
import { z } from 'genkit'
import { verifyIdToken, getAdminDb, validateUserMembership } from '@/lib/api/admin-sdk'
import { requireOperationalAccess } from '@/lib/api/require-operational-access'
import { loadGuideContent, type KBCard } from '@/lib/support/load-kb'
import { loadKbCards } from '@/lib/support/load-kb-runtime'
import { logBotQuestion } from '@/lib/support/bot-question-log'
import { detectSmallTalkResponse, inferQuestionDomain, retrieveCard, suggestKeywordsFromMessage, type KbLang, type RetrievalResult } from '@/lib/support/bot-retrieval'

const DEFAULT_REFORMAT_TIMEOUT_MS = 3500
const MIN_REFORMAT_TIMEOUT_MS = 1500
const MAX_REFORMAT_TIMEOUT_MS = 8000
const DEFAULT_INTENT_TIMEOUT_MS = 1800
const MIN_INTENT_TIMEOUT_MS = 800
const MAX_INTENT_TIMEOUT_MS = 4000
const MAX_INTENT_CANDIDATES = 14

type InputLang = 'ca' | 'es' | 'fr' | 'pt'
type AssistantTone = 'neutral' | 'warm'
type ClarifyOption = {
  index: 1 | 2
  cardId: string
  label: string
}

type IntentCandidate = {
  id: string
  title: string
  hints: string
}

type CriticalProcedureResponse = {
  cardId: string
  answer: string
  uiPaths: string[]
}

// =============================================================================
// SCHEMAS
// =============================================================================

const BotInputSchema = z.object({
  userQuestion: z.string().describe('The user question in natural language.'),
  rawAnswer: z.string().describe('The raw KB answer content to reformulate.'),
  isGuarded: z.boolean().describe('True if the question is about a sensitive topic (risk=guarded).'),
  isLimited: z.boolean().describe('True if only general guidance should be given (answerMode=limited).'),
  isWarm: z.boolean().describe('True to use a warmer, more human tone.'),
  lang: z.string().describe('Response language: ca or es.'),
  uiPathHint: z.string().describe('Best UI location hint in Summa for this answer.'),
})

const BotOutputSchema = z.object({
  answer: z.string().describe('The reformulated answer for the user.'),
})

const IntentCandidateSchema = z.object({
  id: z.string(),
  title: z.string(),
  hints: z.string(),
})

const IntentInputSchema = z.object({
  userQuestion: z.string().describe('The original user question.'),
  lang: z.string().describe('Language hint: ca or es.'),
  candidates: z.array(IntentCandidateSchema).describe('Shortlisted KB card candidates.'),
})

const IntentOutputSchema = z.object({
  cardId: z.string().describe('Exact candidate id, or empty string if no reliable match.'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence for the selected card.'),
})

// =============================================================================
// GENKIT PROMPT
// =============================================================================

const reformatPrompt = ai.definePrompt({
  name: 'supportBotReformat',
  input: { schema: BotInputSchema },
  output: { schema: BotOutputSchema },
  prompt: `Ets l'assistent de Summa Social, una eina de gestió per a ONGs.
Reformata la resposta proporcionada per respondre la pregunta de l'usuari amb claredat i to humà.

REGLES ESTRICTES:
- NO inventis passos nous, contingut extra ni procediments que no estiguin al text original.
- NO parlis de suport humà, reports, formularis ni IDs de seguiment.
- NO donis consells fiscals; només mostra els procediments documentats.
- Pots reordenar, simplificar i fer més llegible el text original.
- Respon sempre en l'idioma indicat ({{lang}}).
- Prioritza la utilitat pràctica: primer què ha de fer ara mateix l'usuari.
{{#if isWarm}}
- Usa un to proper i empàtic, sense ser informal en excés.
- Pots començar amb una frase curta que faci sentir acompanyada la persona usuària.
{{/if}}
{{#if isGuarded}}
- IMPORTANT: Aquesta és una consulta sobre un tema sensible.
{{#if isLimited}}
- Dona NOMÉS orientació general. MAI donis passos operatius concrets.
{{/if}}
{{/if}}

Pregunta de l'usuari:
{{{userQuestion}}}

Contingut de referència:
{{{rawAnswer}}}

Ubicació útil dins Summa (si aplica):
{{{uiPathHint}}}

FORMAT:
1) Secció "Què passa" (o "Qué pasa" en castellà): 1 frase curta.
2) Secció "Què fer ara" (o "Qué hacer ahora"): passos accionables numerats (màxim 5), només si existeixen al contingut.
3) Secció "Com comprovar-ho" (o "Cómo comprobarlo"): una comprovació curta.
4) NO incloguis línies de navegació ni rutes dins del text (es mostraran fora de la resposta).
`,
})

const classifyIntentPrompt = ai.definePrompt({
  name: 'supportBotClassifyIntent',
  input: { schema: IntentInputSchema },
  output: { schema: IntentOutputSchema },
  prompt: `You classify user intent for a support bot.

RULES:
- You MUST select exactly one cardId from candidates, or return empty cardId if no clear fit.
- Never invent IDs.
- Use semantic meaning, not exact wording.
- Prefer operational "how-to" cards over generic fallback behavior.
- If two cards are close, choose the more actionable one.
- confidence must be: high, medium, or low.

User language: {{lang}}
User question:
{{{userQuestion}}}

Candidates:
{{#each candidates}}
- {{id}} | {{title}} | {{hints}}
{{/each}}
`,
})

// =============================================================================
// RESPONSE TYPES
// =============================================================================

type SuccessResponse = {
  ok: true
  mode: 'card' | 'fallback'
  cardId: string
  answer: string
  guideId: string | null
  uiPaths: string[]
  clarifyOptions?: ClarifyOption[]
}

type ErrorResponse = {
  ok: false
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'TRANSIENT' | 'AI_ERROR'
  message: string
}

type ApiResponse = SuccessResponse | ErrorResponse

function normalizeLang(rawLang: unknown): { inputLang: InputLang; kbLang: KbLang } {
  const allowedLangs = ['ca', 'es', 'fr', 'pt'] as const
  const inputLang = allowedLangs.includes(rawLang as InputLang)
    ? (rawLang as InputLang)
    : 'ca'

  // La KB actual encara està en ca/es. mapegem fr -> ca i pt -> es.
  const kbLang: KbLang = inputLang === 'es' || inputLang === 'pt' ? 'es' : 'ca'
  return { inputLang, kbLang }
}

function getReformatTimeoutMs(rawValue: unknown): number {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return DEFAULT_REFORMAT_TIMEOUT_MS
  return Math.min(MAX_REFORMAT_TIMEOUT_MS, Math.max(MIN_REFORMAT_TIMEOUT_MS, Math.round(parsed)))
}

function normalizeAssistantTone(rawTone: unknown): AssistantTone {
  return rawTone === 'neutral' ? 'neutral' : 'warm'
}

function getIntentTimeoutMs(rawValue: unknown): number {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return DEFAULT_INTENT_TIMEOUT_MS
  return Math.min(MAX_INTENT_TIMEOUT_MS, Math.max(MIN_INTENT_TIMEOUT_MS, Math.round(parsed)))
}

const INTENT_STOPWORDS = new Set([
  'com', 'que', 'què', 'quin', 'quina', 'quins', 'quines', 'como', 'como', 'qué', 'cual', 'cuál',
  'de', 'del', 'dels', 'des', 'la', 'el', 'els', 'les', 'los', 'las', 'un', 'una', 'uns', 'unes',
  'a', 'al', 'als', 'en', 'per', 'por', 'amb', 'con', 'i', 'y', 'o', 'u',
  'es', 'son', 'se', 'me', 'mi', 'my', 'ha', 'he', 'sóc', 'soc', 'soy',
  'puc', 'puedo', 'vull', 'quiero', 'necessito', 'necesito',
  'summa', 'social',
])

function tokenizeIntentText(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(token => token.trim())
    .filter(token => token.length > 2 && !INTENT_STOPWORDS.has(token))
}

function buildIntentCandidates(message: string, lang: KbLang, cards: KBCard[]): IntentCandidate[] {
  const messageTokens = tokenizeIntentText(message)
  if (messageTokens.length === 0) return []

  const messageSet = new Set(messageTokens)
  const scored = cards
    .filter(card => card.type !== 'fallback')
    .map(card => {
      const title = card.title?.[lang] ?? card.title?.ca ?? card.title?.es ?? card.id
      const intents = (card.intents?.[lang] ?? card.intents?.ca ?? card.intents?.es ?? []).slice(0, 6)
      const keywords = (card.keywords ?? []).slice(0, 8)
      const domain = card.domain ?? ''
      const uiPath = (card.uiPaths ?? []).slice(0, 2).join(' · ')

      const bag = [title, ...intents, ...keywords, domain, uiPath].join(' ')
      const cardTokens = new Set(tokenizeIntentText(bag))

      let overlap = 0
      for (const token of messageSet) {
        if (cardTokens.has(token)) {
          overlap += 4
          continue
        }
        let fuzzy = false
        for (const cardToken of cardTokens) {
          if (cardToken.startsWith(token) || token.startsWith(cardToken)) {
            overlap += 1
            fuzzy = true
            break
          }
        }
        if (fuzzy) continue
      }

      const normalizedTitle = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      const normalizedMessage = message
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      if (normalizedTitle && normalizedMessage.includes(normalizedTitle)) {
        overlap += 8
      }

      const hints = [
        intents.slice(0, 3).join(' | '),
        keywords.slice(0, 4).join(' | '),
        uiPath,
      ].filter(Boolean).join(' | ')

      return {
        id: card.id,
        title,
        hints,
        score: overlap,
      }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)

  const strategicIds = [
    'guide-projects',
    'guide-attach-document',
    'manual-member-paid-quotas',
    'guide-split-remittance',
    'guide-donor-certificate',
  ]

  const byId = new Map(scored.map(item => [item.id, item]))
  for (const strategicId of strategicIds) {
    if (!byId.has(strategicId)) {
      const card = cards.find(c => c.id === strategicId && c.type !== 'fallback')
      if (!card) continue
      byId.set(strategicId, {
        id: card.id,
        title: card.title?.[lang] ?? card.title?.ca ?? card.title?.es ?? card.id,
        hints: [
          (card.intents?.[lang] ?? card.intents?.ca ?? card.intents?.es ?? []).slice(0, 2).join(' | '),
          (card.keywords ?? []).slice(0, 4).join(' | '),
        ].filter(Boolean).join(' | '),
        score: 1,
      })
    }
  }

  return Array.from(byId.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_INTENT_CANDIDATES)
    .map(({ id, title, hints }) => ({ id, title, hints }))
}

async function classifyIntentCard(
  message: string,
  lang: KbLang,
  cards: KBCard[],
  timeoutMs: number
): Promise<{ card: KBCard; confidence: 'high' | 'medium' | 'low' } | null> {
  const candidates = buildIntentCandidates(message, lang, cards)
  if (candidates.length < 2) return null

  const { output } = await withTimeout(
    classifyIntentPrompt({
      userQuestion: message,
      lang,
      candidates,
    }),
    timeoutMs
  )

  const selectedId = output?.cardId?.trim()
  const confidence = output?.confidence ?? 'low'
  if (!selectedId || confidence === 'low') return null
  if (!candidates.some(c => c.id === selectedId)) return null

  const selectedCard = cards.find(card => card.id === selectedId && card.type !== 'fallback')
  if (!selectedCard) return null

  return {
    card: selectedCard,
    confidence,
  }
}

function detectGreetingFallback(message: string, lang: KbLang): string | null {
  const normalized = message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!normalized) return null
  const padded = ` ${normalized} `
  const greetingPhrases = [
    'hola', 'bon dia', 'bona tarda', 'bona nit', 'hey', 'hi', 'hello', 'ei',
    'buenos dias', 'buenas tardes', 'buenas noches',
  ]
  const isGreeting = greetingPhrases.some(phrase => padded.includes(` ${phrase} `))
  if (!isGreeting) return null

  return lang === 'es'
    ? 'Hola! Soy el asistente de Summa Social. ¿Qué quieres hacer ahora?'
    : 'Hola! Soc l’assistent de Summa Social. Què vols fer ara?'
}

function normalizeIntentText(message: string): string[] {
  return message
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
}

function hasAnyToken(tokens: Set<string>, values: string[]): boolean {
  return values.some(value => tokens.has(value))
}

function detectCriticalProcedureResponse(message: string, lang: KbLang): CriticalProcedureResponse | null {
  const tokens = new Set(normalizeIntentText(message))

  // 1) Imputar despesa a diversos projectes
  const asksProjectAllocation =
    hasAnyToken(tokens, ['imputo', 'imputar', 'reparto', 'repartir', 'distribuir', 'prorratejar', 'prorratear']) &&
    hasAnyToken(tokens, ['despesa', 'despeses', 'gasto', 'gastos']) &&
    hasAnyToken(tokens, ['projecte', 'projectes', 'proyecto', 'proyectos'])

  if (asksProjectAllocation) {
    return {
      cardId: 'critical-project-allocation',
      answer: lang === 'es'
        ? 'Para imputar un gasto a varios proyectos:\n\n1. Ve a Movimientos y abre el gasto.\n2. Activa la imputación por proyectos.\n3. Añade los proyectos que corresponden.\n4. Reparte el importe (por porcentaje o por importe).\n5. Guarda y verifica que el total imputado coincide con el gasto original.'
        : 'Per imputar una despesa a diversos projectes:\n\n1. Ves a Moviments i obre la despesa.\n2. Activa la imputació per projectes.\n3. Afegeix els projectes que pertoquen.\n4. Reparteix l’import (per percentatge o per import).\n5. Desa i comprova que el total imputat coincideix amb la despesa original.',
      uiPaths: ['Moviments > Detall moviment > Projectes'],
    }
  }

  // 2) Pujar factura/rebut/nomina
  const asksDocumentUpload =
    hasAnyToken(tokens, ['pujo', 'pujar', 'subo', 'subir', 'adjunto', 'adjuntar']) &&
    hasAnyToken(tokens, ['factura', 'rebut', 'rebut', 'recibo', 'nomina', 'document', 'documento'])

  if (asksDocumentUpload) {
    return {
      cardId: 'critical-document-upload',
      answer: lang === 'es'
        ? 'Para subir una factura, recibo o nómina:\n\n1. Ve a Movimientos.\n2. Opción rápida: arrastra el archivo encima del movimiento.\n3. Opción alternativa: abre el movimiento y pulsa “Adjuntar documento”.\n4. Si aún no existe movimiento bancario, usa “Movimientos > Pendientes > Subir documentos”.\n5. Revisa que el archivo quede vinculado correctamente.'
        : 'Per pujar una factura, rebut o nòmina:\n\n1. Ves a Moviments.\n2. Opció ràpida: arrossega el fitxer damunt del moviment.\n3. Opció alternativa: obre el moviment i clica “Adjuntar document”.\n4. Si encara no hi ha moviment bancari, usa “Moviments > Pendents > Pujar documents”.\n5. Revisa que el fitxer quedi vinculat correctament.',
      uiPaths: ['Moviments > Adjuntar document', 'Moviments > Pendents > Pujar documents'],
    }
  }

  // 3) Quotes pagades per soci
  const asksMemberPaidQuotas =
    hasAnyToken(tokens, ['quota', 'quotes', 'cuota', 'cuotas', 'pagat', 'pagats', 'pagado', 'pagados', 'historial']) &&
    hasAnyToken(tokens, ['soci', 'socis', 'socio', 'socios', 'donant', 'donants', 'donante', 'donantes'])

  if (asksMemberPaidQuotas) {
    return {
      cardId: 'critical-member-paid-quotas',
      answer: lang === 'es'
        ? 'Para ver las cuotas pagadas de un socio:\n\n1. Ve a Donantes.\n2. Busca el socio por nombre o DNI.\n3. Abre su ficha.\n4. Revisa el historial de aportaciones (cuotas y donaciones).\n5. Si quieres acotar, cambia el período para ver solo el año o mes que te interesa.'
        : 'Per veure les quotes pagades d’un soci:\n\n1. Ves a Donants.\n2. Cerca el soci per nom o DNI.\n3. Obre la seva fitxa.\n4. Revisa l’historial d’aportacions (quotes i donacions).\n5. Si vols acotar-ho, canvia el període per veure només l’any o mes que t’interessa.',
      uiPaths: ['Donants > Fitxa donant'],
    }
  }

  return null
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

function buildEmergencyFallbackResponse(lang: KbLang, cardId = 'emergency-fallback'): SuccessResponse {
  return {
    ok: true,
    mode: 'fallback',
    cardId,
    answer: lang === 'es'
      ? 'Entiendo tu duda. Ahora mismo no he encontrado información exacta sobre esto. Consulta el Hub de Guías (icono ? arriba a la derecha).'
      : 'Entenc el teu dubte. Ara mateix no he trobat informació exacta sobre això. Consulta el Hub de Guies (icona ? a dalt a la dreta).',
    guideId: null,
    uiPaths: [],
  }
}

function getCardLabel(card: KBCard, lang: KbLang): string {
  return (
    card.title?.[lang] ??
    card.title?.ca ??
    card.title?.es ??
    card.id
  )
}

function buildUiPathHint(card: KBCard): string {
  const uniquePaths = Array.from(new Set((card.uiPaths ?? []).map(p => p.trim()).filter(Boolean))).slice(0, 2)
  return uniquePaths.join(' · ')
}

function withWarmOpening(answer: string, lang: KbLang): string {
  const trimmed = (answer ?? '').trim()
  if (!trimmed) return trimmed

  const lower = trimmed.toLowerCase()
  if (
    lower.startsWith('perfecte') ||
    lower.startsWith('entenc') ||
    lower.startsWith('cap problema') ||
    lower.startsWith('perfecto') ||
    lower.startsWith('entiendo') ||
    lower.startsWith('sin problema')
  ) {
    return trimmed
  }

  const opening = lang === 'es' ? 'Perfecto, vamos paso a paso.' : 'Perfecte, anem pas a pas.'
  return `${opening}\n\n${trimmed}`
}

function buildFallbackSuggestions(message: string, lang: KbLang): string[] {
  const domain = inferQuestionDomain(message)
  if (domain === 'remittances') {
    return lang === 'es'
      ? [
          'cómo dividir una remesa paso a paso',
          'la remesa no cuadra con el banco',
          'cómo deshacer la última remesa',
        ]
      : [
          'com dividir una remesa pas a pas',
          'la remesa no quadra amb el banc',
          'com desfer l’última remesa',
        ]
  }
  if (domain === 'fiscal') {
    return lang === 'es'
      ? [
          'cómo enviar certificado de donación',
          'modelo 182: qué revisar antes de exportar',
          'diferencia entre donación y devolución fiscal',
        ]
      : [
          'com enviar certificat de donació',
          'model 182: què revisar abans d’exportar',
          'diferència entre donació i devolució fiscal',
        ]
  }
  if (domain === 'sepa') {
    return lang === 'es'
      ? [
          'cómo generar remesa SEPA',
          'error al generar pain008',
          'cómo validar IBAN antes de la remesa',
        ]
      : [
          'com generar remesa SEPA',
          'error en generar pain008',
          'com validar IBAN abans de la remesa',
        ]
  }

  const keywords = suggestKeywordsFromMessage(message, 3)
  if (keywords.length >= 2) {
    return lang === 'es'
      ? [`${keywords.join(' ')} en summa social`, `paso a paso ${keywords[0]}`, `error ${keywords[0]} ${keywords[1]}`]
      : [`${keywords.join(' ')} a summa social`, `pas a pas ${keywords[0]}`, `error ${keywords[0]} ${keywords[1]}`]
  }

  return lang === 'es'
    ? ['cómo hacerlo paso a paso', 'dónde está esta opción en Summa', 'qué revisar si no cuadra']
    : ['com fer-ho pas a pas', 'on és aquesta opció a Summa', 'què revisar si no quadra']
}

function withGuidedFallback(answer: string, message: string, lang: KbLang): string {
  const base = (answer ?? '').trim()
  const suggestions = buildFallbackSuggestions(message, lang)
  const suggestionTitle = lang === 'es'
    ? 'Si quieres, prueba una de estas preguntas:'
    : 'Si vols, prova una d’aquestes preguntes:'
  const copyError = lang === 'es'
    ? 'Si te sale un error, copia el texto exacto y te guío mejor.'
    : 'Si et surt un error, copia el text exacte i et guio millor.'

  const lines = suggestions.slice(0, 3).map((s, i) => `${i + 1}. ${s}`)
  return [base, suggestionTitle, ...lines, copyError].filter(Boolean).join('\n')
}

function buildClarifyAnswer(lang: KbLang, options: KBCard[]): string {
  const intro = lang === 'es'
    ? 'Quiero ayudarte bien sin confundirte. ¿Cuál de estas dos situaciones se parece más a la tuya?'
    : 'Vull ajudar-te bé sense confondre’t. Quina d’aquestes dues situacions s’assembla més al teu cas?'

  const lines = options.slice(0, 2).map((card, i) => {
    const label = getCardLabel(card, lang)
    const pathHint = card.uiPaths?.[0]
    return pathHint ? `${i + 1}. ${label} (${pathHint})` : `${i + 1}. ${label}`
  })

  const outro = lang === 'es'
    ? 'Respóndeme con "1" o "2", o pega el texto exacto del error que te sale.'
    : 'Respon-me amb "1" o "2", o enganxa el text exacte de l’error que et surt.'

  return [intro, ...lines, outro].join('\n')
}

function buildClarifyOptionsPayload(lang: KbLang, options: KBCard[]): ClarifyOption[] {
  return options.slice(0, 2).map((card, i) => ({
    index: (i + 1) as 1 | 2,
    cardId: card.id,
    label: getCardLabel(card, lang),
  }))
}

function parseClarifyOptionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return Array.from(
    new Set(
      raw
        .filter(v => typeof v === 'string')
        .map(v => v.trim())
        .filter(Boolean)
    )
  ).slice(0, 2)
}

function resolveClarifyChoice(
  message: string,
  clarifyOptionIds: string[],
  cards: KBCard[]
): KBCard | null {
  const normalized = message.trim()
  if (normalized !== '1' && normalized !== '2') return null
  if (clarifyOptionIds.length < 2) return null

  const selectedIndex = Number(normalized) - 1
  const selectedId = clarifyOptionIds[selectedIndex]
  if (!selectedId) return null

  const selectedCard = cards.find(c => c.id === selectedId && c.type !== 'fallback')
  return selectedCard ?? null
}

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  let kbLang: KbLang = 'ca'
  let inputLang: InputLang = 'ca'
  let assistantTone: AssistantTone = 'warm'
  let hasOperationalAccess = false

  try {
    // --- Auth ---
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message: 'Token invàlid o absent' }, { status: 401 })
    }

    const body = await request.json()
    const { message, lang: rawLang, clarifyOptionIds: rawClarifyOptionIds } = body as {
      message?: string
      lang?: string
      clarifyOptionIds?: unknown
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, code: 'INVALID_INPUT', message: 'message obligatori' }, { status: 400 })
    }
    const clarifyOptionIds = parseClarifyOptionIds(rawClarifyOptionIds)

    // Normalització idioma: accepta ca/es/fr/pt, mapeja a ca/es (KB actual).
    const normalizedLang = normalizeLang(rawLang)
    inputLang = normalizedLang.inputLang
    kbLang = normalizedLang.kbLang

    // Derive orgId from user profile (INVARIANT: never from client input)
    const db = getAdminDb()
    const userDoc = await db.doc(`users/${authResult.uid}`).get()
    const orgId = userDoc.data()?.organizationId as string | undefined
    if (!orgId) {
      return NextResponse.json({ ok: false, code: 'INVALID_INPUT', message: 'Usuari sense organització assignada' }, { status: 400 })
    }

    // Validate membership
    const membership = await validateUserMembership(db, authResult.uid, orgId)
    const accessDenied = requireOperationalAccess(membership)
    if (accessDenied) {
      return NextResponse.json({ ok: false, code: 'FORBIDDEN' as const, message: 'Accés denegat' }, { status: 403 })
    }
    hasOperationalAccess = true

    // --- Small talk (salutacions, agraïments, etc.) ---
    const smallTalk = detectSmallTalkResponse(message, kbLang)
    if (smallTalk) {
      void logBotQuestion(db, orgId, message, inputLang, 'fallback', smallTalk.cardId, {
        retrievalConfidence: 'high',
      }).catch(e =>
        console.error('[bot] log error:', e)
      )

      return NextResponse.json({
        ok: true,
        mode: 'fallback',
        cardId: smallTalk.cardId,
        answer: smallTalk.answer,
        guideId: null,
        uiPaths: [],
      })
    }

    const greetingFallback = detectGreetingFallback(message, kbLang)
    if (greetingFallback) {
      void logBotQuestion(db, orgId, message, inputLang, 'fallback', 'smalltalk-greeting', {
        retrievalConfidence: 'high',
      }).catch(e =>
        console.error('[bot] log error:', e)
      )

      return NextResponse.json({
        ok: true,
        mode: 'fallback',
        cardId: 'smalltalk-greeting',
        answer: greetingFallback,
        guideId: null,
        uiPaths: [],
      })
    }

    // --- Critical natural-language intents (hard route guard) ---
    // This bypasses KB/runtime drift for strategic, high-frequency queries.
    const criticalProcedure = detectCriticalProcedureResponse(message, kbLang)
    if (criticalProcedure) {
      void logBotQuestion(db, orgId, message, inputLang, 'card', criticalProcedure.cardId, {
        retrievalConfidence: 'high',
      }).catch(e =>
        console.error('[bot] log error:', e)
      )

      return NextResponse.json({
        ok: true,
        mode: 'card',
        cardId: criticalProcedure.cardId,
        answer: assistantTone === 'warm'
          ? withWarmOpening(criticalProcedure.answer, kbLang)
          : criticalProcedure.answer,
        guideId: null,
        uiPaths: criticalProcedure.uiPaths,
      })
    }

    // --- Load KB version + cards ---
    const snap = await db.doc('system/supportKb').get()
    const version = snap.exists ? (snap.data()?.version ?? 0) : 0
    const storageVersion = snap.exists ? (snap.data()?.storageVersion ?? null) : null
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY
    const aiIntentEnabled = snap.exists ? (snap.data()?.aiIntentEnabled !== false) : true
    const intentTimeoutMs = getIntentTimeoutMs(snap.data()?.intentTimeoutMs)
    const aiReformatEnabled = snap.exists ? (snap.data()?.aiReformatEnabled !== false) : true
    const reformatTimeoutMs = getReformatTimeoutMs(snap.data()?.reformatTimeoutMs)
    assistantTone = normalizeAssistantTone(snap.data()?.assistantTone)

    let cards: KBCard[] = []
    try {
      cards = await loadKbCards(version, storageVersion)
    } catch (cardsError) {
      console.error('[bot] loadKbCards error:', cardsError)
    }

    // --- Retrieval with hard fallback ---
    let result: RetrievalResult | null = null

    try {
      const selectedByClarify = resolveClarifyChoice(message, clarifyOptionIds, cards)
      if (selectedByClarify) {
        result = { card: selectedByClarify, mode: 'card' }
      } else {
        result = retrieveCard(message, kbLang, cards)
      }
    } catch (err) {
      console.error('[bot] retrieveCard error:', err)
      result = null
    }

    // Second-pass AI intent classification (only for weak retrieval cases).
    // Improves natural-language understanding while keeping deterministic fallback safety.
    if (
      apiKey &&
      aiIntentEnabled &&
      cards.length > 0 &&
      (!result || result.mode === 'fallback' || result.confidence === 'low')
    ) {
      try {
        const aiIntent = await classifyIntentCard(message, kbLang, cards, intentTimeoutMs)
        if (aiIntent?.card) {
          console.info('[bot] intent classifier override:', {
            selectedCardId: aiIntent.card.id,
            confidence: aiIntent.confidence,
            previousMode: result?.mode ?? null,
            previousCardId: result?.card?.id ?? null,
          })

          result = {
            card: aiIntent.card,
            mode: 'card',
            bestCardId: aiIntent.card.id,
            bestScore: Math.max(result?.bestScore ?? 0, 60),
            secondCardId: result?.bestCardId,
            secondScore: result?.bestScore ?? 0,
            confidence: aiIntent.confidence,
          }
        }
      } catch (intentError) {
        console.warn('[bot] intent classifier failed, keeping retrieval result:', (intentError as Error)?.message)
      }
    }

    let card: KBCard
    let mode: 'card' | 'fallback'

    if (!result || !result.card) {
      // Hard fallback: si retrieveCard falla o retorna null
      const fallback = cards.find(c => c.id === 'fallback-no-answer')

      if (!fallback) {
        return NextResponse.json(buildEmergencyFallbackResponse(kbLang))
      }

      card = fallback
      mode = 'fallback'
    } else {
      card = result.card
      mode = result.mode
    }

    if (result?.clarifyOptions?.length) {
      const clarifyCardId = 'clarify-disambiguation'
      const clarifyUiPaths = Array.from(new Set(result.clarifyOptions.flatMap(c => c.uiPaths ?? []))).slice(0, 4)
      const clarifyAnswer = buildClarifyAnswer(kbLang, result.clarifyOptions)
      const clarifyOptionsPayload = buildClarifyOptionsPayload(kbLang, result.clarifyOptions)

      void logBotQuestion(db, orgId, message, inputLang, 'fallback', clarifyCardId, {
        bestCardId: result?.bestCardId,
        bestScore: result?.bestScore,
        secondCardId: result?.secondCardId,
        secondScore: result?.secondScore,
        retrievalConfidence: result?.confidence,
      }).catch(e =>
        console.error('[bot] log error:', e)
      )

      return NextResponse.json({
        ok: true,
        mode: 'fallback',
        cardId: clarifyCardId,
        answer: clarifyAnswer,
        guideId: null,
        uiPaths: clarifyUiPaths,
        clarifyOptions: clarifyOptionsPayload,
      })
    }

    // --- Log question (fire-and-forget) ---
    void logBotQuestion(db, orgId, message, inputLang, mode, card.id, {
      bestCardId: result?.bestCardId,
      bestScore: result?.bestScore,
      secondCardId: result?.secondCardId,
      secondScore: result?.secondScore,
      retrievalConfidence: result?.confidence,
    }).catch(e =>
      console.error('[bot] log error:', e)
    )

    // --- Build raw answer ---
    let rawAnswer: string
    if (card.guideId) {
      rawAnswer = loadGuideContent(card.guideId, kbLang)
    } else if (card.id.startsWith('guide-')) {
      console.error('[bot] invalid guide card without guideId:', card.id)
      rawAnswer = kbLang === 'es'
        ? 'No he encontrado una guía válida para esta consulta. Consulta el Hub de Guías (icono ? arriba a la derecha).'
        : 'No he trobat una guia vàlida per a aquesta consulta. Consulta el Hub de Guies (icona ? a dalt a la dreta).'
    } else if (card.answer?.[kbLang]) {
      rawAnswer = card.answer[kbLang] ?? ''
    } else {
      rawAnswer = card.answer?.ca ?? card.answer?.es ?? ''
    }

    if (mode === 'fallback' && card.id.startsWith('fallback-')) {
      rawAnswer = withGuidedFallback(rawAnswer, message, kbLang)
    }

    // --- LLM Reformat with hard fallback ---
    let finalAnswer = rawAnswer
    const uiPathHint = buildUiPathHint(card)

    // Guide cards ja surten estructurades "pas a pas" des del loader.
    // Evitem reformatejar-les amb LLM per prioritzar exactitud i consistència.
    if (apiKey && aiReformatEnabled && mode === 'card' && !card.guideId) {
      // Precompute boolean flags to avoid Handlebars helper issues
      const isGuarded = card.risk === 'guarded'
      const isLimited = card.answerMode === 'limited'
      const isWarm = assistantTone === 'warm'

      try {
        const { output } = await withTimeout(
          reformatPrompt({
            userQuestion: message,
            rawAnswer,
            isGuarded,
            isLimited,
            isWarm,
            lang: kbLang,
            uiPathHint,
          }),
          reformatTimeoutMs
        )

        finalAnswer = output?.answer ?? rawAnswer
      } catch (reformatError) {
        console.warn('[bot] reformatter failed, using raw answer:', (reformatError as Error)?.message)
        // finalAnswer = rawAnswer (ja assignat)
      }
    }

    if (assistantTone === 'warm') {
      finalAnswer = withWarmOpening(finalAnswer, kbLang)
    }

    return NextResponse.json({
      ok: true,
      mode,
      cardId: card.id,
      answer: finalAnswer,
      guideId: card.guideId ?? null,
      uiPaths: card.uiPaths,
    })
  } catch (error: unknown) {
    console.error('[API] support/bot error:', error)
    if (!hasOperationalAccess) {
      return NextResponse.json(
        { ok: false, code: 'AI_ERROR', message: 'Error intern abans de validar accés' },
        { status: 500 }
      )
    }
    return NextResponse.json(buildEmergencyFallbackResponse(kbLang, 'runtime-fallback'))
  }
}
