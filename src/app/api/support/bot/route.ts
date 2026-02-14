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
import { retrieveCard, type KbLang, type RetrievalResult } from '@/lib/support/bot-retrieval'

const DEFAULT_REFORMAT_TIMEOUT_MS = 3500
const MIN_REFORMAT_TIMEOUT_MS = 1500
const MAX_REFORMAT_TIMEOUT_MS = 8000

type InputLang = 'ca' | 'es' | 'fr' | 'pt'
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
  lang: z.string().describe('Response language: ca or es.'),
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
Reformata la resposta proporcionada per respondre la pregunta de l'usuari.

REGLES ESTRICTES:
- NO inventis passos nous, contingut extra ni procediments que no estiguin al text original.
- NO parlis de suport humà, reports, formularis ni IDs de seguiment.
- NO donis consells fiscals; només mostra els procediments documentats.
- Pots reordenar, simplificar i fer més llegible el text original.
- Respon sempre en l'idioma indicat ({{lang}}).
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

Respon de forma clara i concisa.`,
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
      ? 'No he encontrado información sobre esto. Consulta el Hub de Guías (icono ? arriba a la derecha).'
      : 'No he trobat informació sobre això. Consulta el Hub de Guies (icona ? a dalt a la dreta).',
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

function buildClarifyAnswer(lang: KbLang, options: KBCard[]): string {
  const intro = lang === 'es'
    ? 'No quiero darte una respuesta equivocada. ¿Cuál de estas dos situaciones se parece más a la tuya?'
    : 'No vull donar-te una resposta equivocada. Quina d’aquestes dues situacions s’assembla més al teu cas?'

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

    // --- Load KB version + cards ---
    const snap = await db.doc('system/supportKb').get()
    const version = snap.exists ? (snap.data()?.version ?? 0) : 0
    const aiReformatEnabled = snap.exists ? (snap.data()?.aiReformatEnabled !== false) : true
    const reformatTimeoutMs = getReformatTimeoutMs(snap.data()?.reformatTimeoutMs)

    let cards: KBCard[] = []
    try {
      cards = await loadKbCards(version)
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

      void logBotQuestion(db, orgId, message, inputLang, 'fallback', clarifyCardId).catch(e =>
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
    void logBotQuestion(db, orgId, message, inputLang, mode, card.id).catch(e =>
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

    if (apiKey && aiReformatEnabled) {
      // Precompute boolean flags to avoid Handlebars helper issues
      const isGuarded = card.risk === 'guarded'
      const isLimited = card.answerMode === 'limited'

      try {
        const { output } = await withTimeout(
          reformatPrompt({
            userQuestion: message,
            rawAnswer,
            isGuarded,
            isLimited,
            lang: kbLang,
          }),
          reformatTimeoutMs
        )

        finalAnswer = output?.answer ?? rawAnswer
      } catch (reformatError) {
        console.warn('[bot] reformatter failed, using raw answer:', (reformatError as Error)?.message)
        // finalAnswer = rawAnswer (ja assignat)
      }
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
