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
import { detectSmallTalkResponse, retrieveCard, type KbLang, type RetrievalResult } from '@/lib/support/bot-retrieval'

const DEFAULT_REFORMAT_TIMEOUT_MS = 3500
const MIN_REFORMAT_TIMEOUT_MS = 1500
const MAX_REFORMAT_TIMEOUT_MS = 8000

type InputLang = 'ca' | 'es' | 'fr' | 'pt'
type AssistantTone = 'neutral' | 'warm'
type ClarifyOption = {
  index: 1 | 2
  cardId: string
  label: string
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
1) Una frase inicial breu i clara.
2) Passos accionables numerats (màxim 5), només si existeixen al contingut.
3) Frase final curta de verificació.
4) Si hi ha ubicació, acaba amb: "On anar a Summa: <ubicació>".
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

function withUiPathFooter(answer: string, card: KBCard, lang: KbLang): string {
  const trimmed = (answer ?? '').trim()
  if (!trimmed) return trimmed

  const uiPathHint = buildUiPathHint(card)
  if (!uiPathHint) return trimmed

  const lower = trimmed.toLowerCase()
  if (lower.includes('on anar a summa:') || lower.includes('donde ir en summa:')) {
    return trimmed
  }

  const footerLabel = lang === 'es' ? 'Dónde ir en Summa:' : 'On anar a Summa:'
  return `${trimmed}\n\n${footerLabel} ${uiPathHint}`
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

    // --- Load KB version + cards ---
    const snap = await db.doc('system/supportKb').get()
    const version = snap.exists ? (snap.data()?.version ?? 0) : 0
    const storageVersion = snap.exists ? (snap.data()?.storageVersion ?? null) : null
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

    // --- LLM Reformat with hard fallback ---
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY

    let finalAnswer = rawAnswer
    const uiPathHint = buildUiPathHint(card)

    if (apiKey && aiReformatEnabled) {
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
    finalAnswer = withUiPathFooter(finalAnswer, card, kbLang)

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
