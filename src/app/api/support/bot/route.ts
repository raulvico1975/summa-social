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
import { loadAllCards, loadGuideContent, type KBCard } from '@/lib/support/load-kb'
import { logBotQuestion } from '@/lib/support/bot-question-log'

// =============================================================================
// SCHEMAS
// =============================================================================

const BotInputSchema = z.object({
  userQuestion: z.string().describe('The user question in natural language.'),
  rawAnswer: z.string().describe('The raw KB answer content to reformulate.'),
  risk: z.string().describe('Risk level: safe or guarded.'),
  answerMode: z.string().describe('Answer mode: full or limited.'),
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
{{#if (eq risk "guarded")}}
- IMPORTANT: Aquesta és una consulta sobre un tema sensible ({{risk}}).
{{#if (eq answerMode "limited")}}
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
// RETRIEVAL — Deterministic scoring
// =============================================================================

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .split(/[\s,;:.!?¿¡()\[\]{}"']+/)
    .filter(t => t.length > 1)
}

function scoreCard(tokens: string[], card: KBCard, lang: 'ca' | 'es'): number {
  let score = 0
  const intents = card.intents?.[lang] ?? []
  const title = card.title?.[lang] ?? ''
  const keywords = card.keywords ?? []
  const errorKey = card.error_key ?? ''

  for (const token of tokens) {
    // Intent match: substring within any intent string
    for (const intent of intents) {
      const normIntent = intent.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (normIntent.includes(token)) {
        score += 50
        break // one match per token per category
      }
    }

    // Keyword match
    for (const kw of keywords) {
      const normKw = kw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (normKw === token || token.includes(normKw) || normKw.includes(token)) {
        score += 20
        break
      }
    }

    // Title match
    const normTitle = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    if (normTitle.includes(token)) {
      score += 10
    }

    // Error key match
    if (errorKey) {
      const normError = errorKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      if (normError.includes(token) || token.includes(normError)) {
        score += 5
      }
    }
  }

  return score
}

function detectFallbackDomain(tokens: string[]): string {
  const joined = tokens.join(' ')

  // Fiscal
  if (/fiscal|182|347|aeat|hisenda|hacienda|certificat|certificado|model|modelo/.test(joined)) {
    return 'fallback-fiscal-unclear'
  }
  // SEPA
  if (/sepa|pain|pain008|pain001|domiciliacio|xml|banc|banco/.test(joined)) {
    return 'fallback-sepa-unclear'
  }
  // Remittances
  if (/remesa|remesas|quotes|cuotas|dividir|processar|procesar|desfer|deshacer/.test(joined)) {
    return 'fallback-remittances-unclear'
  }
  // Danger
  if (/esborrar|borrar|eliminar|perill|peligro|irreversible|superadmin/.test(joined)) {
    return 'fallback-danger-unclear'
  }

  return 'fallback-no-answer'
}

function retrieveCard(message: string, lang: 'ca' | 'es'): { card: KBCard; mode: 'card' | 'fallback' } {
  const cards = loadAllCards()
  const tokens = normalize(message)

  // Score all non-fallback cards
  const regularCards = cards.filter(c => c.type !== 'fallback')
  let bestCard: KBCard | null = null
  let bestScore = 0

  for (const card of regularCards) {
    const s = scoreCard(tokens, card, lang)
    if (s > bestScore) {
      bestScore = s
      bestCard = card
    }
  }

  // Threshold: >= 30
  if (bestCard && bestScore >= 30) {
    return { card: bestCard, mode: 'card' }
  }

  // Fallback: detect domain
  const fallbackId = detectFallbackDomain(tokens)
  const fallbackCard = cards.find(c => c.id === fallbackId)
  if (fallbackCard) {
    return { card: fallbackCard, mode: 'fallback' }
  }

  // Last resort
  const genericFallback = cards.find(c => c.id === 'fallback-no-answer')!
  return { card: genericFallback, mode: 'fallback' }
}

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
}

type ErrorResponse = {
  ok: false
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'INVALID_INPUT' | 'QUOTA_EXCEEDED' | 'RATE_LIMITED' | 'TRANSIENT' | 'AI_ERROR'
  message: string
}

type ApiResponse = SuccessResponse | ErrorResponse

// =============================================================================
// ROUTE HANDLER
// =============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // --- Auth ---
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, code: 'UNAUTHORIZED', message: 'Token invàlid o absent' }, { status: 401 })
    }

    const body = await request.json()
    const { message, lang: rawLang } = body as { message?: string; lang?: string }

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ ok: false, code: 'INVALID_INPUT', message: 'message obligatori' }, { status: 400 })
    }

    const lang = (rawLang === 'es' ? 'es' : 'ca') as 'ca' | 'es'

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

    // --- Retrieval ---
    const { card, mode } = retrieveCard(message, lang)

    // --- Log question (fire-and-forget) ---
    void logBotQuestion(db, orgId, message, lang, mode, card.id).catch(e =>
      console.error('[bot] log error:', e)
    )

    // --- Build raw answer ---
    let rawAnswer: string
    if (card.guideId) {
      rawAnswer = loadGuideContent(card.guideId, lang)
    } else if (card.answer?.[lang]) {
      rawAnswer = card.answer[lang]!
    } else {
      rawAnswer = card.answer?.ca ?? card.answer?.es ?? ''
    }

    // --- LLM Reformat ---
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      // No LLM available: return raw answer
      return NextResponse.json({
        ok: true,
        mode,
        cardId: card.id,
        answer: rawAnswer,
        guideId: card.guideId ?? null,
        uiPaths: card.uiPaths,
      })
    }

    const { output } = await reformatPrompt({
      userQuestion: message,
      rawAnswer,
      risk: card.risk,
      answerMode: card.answerMode,
      lang,
    })

    return NextResponse.json({
      ok: true,
      mode,
      cardId: card.id,
      answer: output?.answer ?? rawAnswer,
      guideId: card.guideId ?? null,
      uiPaths: card.uiPaths,
    })
  } catch (error: unknown) {
    console.error('[API] support/bot error:', error)

    const errorMsg = (error as Error)?.message || String(error)
    const errorMsgLower = errorMsg.toLowerCase()

    if (errorMsg.includes('429') || errorMsgLower.includes('quota') || errorMsgLower.includes('resource_exhausted') || errorMsgLower.includes('exceeded')) {
      return NextResponse.json({ ok: false, code: 'QUOTA_EXCEEDED', message: "Quota d'IA esgotada. Torna-ho a provar més tard." })
    }

    if (errorMsgLower.includes('rate limit') || errorMsgLower.includes('rate_limit')) {
      return NextResponse.json({ ok: false, code: 'RATE_LIMITED', message: 'Massa peticions. Espera uns segons.' })
    }

    if (errorMsg.includes('503') || errorMsg.includes('504') || errorMsgLower.includes('timeout') || errorMsgLower.includes('unavailable')) {
      return NextResponse.json({ ok: false, code: 'TRANSIENT', message: 'Error temporal. Torna-ho a provar.' })
    }

    return NextResponse.json({ ok: false, code: 'AI_ERROR', message: errorMsg.substring(0, 200) })
  }
}
