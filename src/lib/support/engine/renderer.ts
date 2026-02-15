import { loadGuideContent, type KBCard } from '../load-kb'
import type { KbLang } from '../bot-retrieval'
import {
  canRenderOperational,
  containsProceduralFreeform,
  enforceNonProceduralIfUntrusted,
  extractOperationalSteps,
  isTrustedOperationalCard,
  normalizeUiPathsAgainstCatalog,
  SAFE_FALLBACK_PATHS,
} from './policy'
import type { AssistantTone, EngineCard, IntentType } from './types'

export type ReformatFnInput = {
  userQuestion: string
  rawAnswer: string
  isGuarded: boolean
  isLimited: boolean
  isWarm: boolean
  lang: KbLang
  uiPathHint: string
}

export type ReformatFn = (input: ReformatFnInput) => Promise<string>

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

function buildNoCardFallbackAnswer(lang: KbLang, intentType: IntentType): string {
  if (intentType === 'operational') {
    return lang === 'es'
      ? 'Entiendo lo que quieres hacer, pero ahora mismo no tengo una guía con pasos verificados para este caso. Si quieres, te ayudo a concretar entre 2 opciones para darte la ruta correcta.'
      : 'Entenc què vols fer, però ara mateix no tinc una guia amb passos verificats per a aquest cas. Si vols, t’ajudo a concretar entre 2 opcions per donar-te la ruta correcta.'
  }

  return lang === 'es'
    ? 'Ahora mismo no he encontrado información exacta para esta consulta. Puedes abrir el Hub de Guías y buscar por palabra clave.'
    : 'Ara mateix no he trobat informació exacta per a aquesta consulta. Pots obrir el Hub de Guies i buscar per paraula clau.'
}

function buildFallbackAnswerFromCard(card: KBCard, lang: KbLang): string {
  const fromCard = card.answer?.[lang] ?? card.answer?.ca ?? card.answer?.es ?? ''
  return fromCard.trim()
}

function buildRawAnswer(card: KBCard, kbLang: KbLang): string {
  if (card.guideId) {
    return loadGuideContent(card.guideId, kbLang)
  }

  if (card.id.startsWith('guide-')) {
    return kbLang === 'es'
      ? 'No he encontrado una guía válida para esta consulta. Consulta el Hub de Guías (icono ? arriba a la derecha).'
      : 'No he trobat una guia vàlida per a aquesta consulta. Consulta el Hub de Guies (icona ? a dalt a la dreta).'
  }

  return card.answer?.[kbLang] ?? card.answer?.ca ?? card.answer?.es ?? ''
}

export function toEngineCard(card: KBCard, rawAnswer: string): EngineCard {
  const uiPathsAllowed = normalizeUiPathsAgainstCatalog(card.uiPaths)
  const steps = extractOperationalSteps(rawAnswer)

  return {
    ...card,
    source: 'validated-kb',
    uiPathsAllowed,
    steps,
  }
}

export async function renderAnswer(input: {
  message: string
  kbLang: KbLang
  card: KBCard
  mode: 'card' | 'fallback'
  intentType: IntentType
  assistantTone: AssistantTone
  allowAiReformat: boolean
  reformat?: ReformatFn
}): Promise<{ answer: string; card: EngineCard; trustedOperationalCard: boolean; uiPaths: string[] }> {
  const {
    message,
    kbLang,
    card,
    mode,
    intentType,
    assistantTone,
    allowAiReformat,
    reformat,
  } = input

  const rawAnswer = mode === 'fallback' ? buildFallbackAnswerFromCard(card, kbLang) : buildRawAnswer(card, kbLang)
  const engineCard = toEngineCard(card, rawAnswer)

  // P0 hard guardrail: operational procedures are rendered only from validated KB cards with concrete steps.
  if (intentType === 'operational' && !canRenderOperational(engineCard)) {
    const safeAnswer = buildNoCardFallbackAnswer(kbLang, intentType)
    return {
      answer: safeAnswer,
      card: {
        ...engineCard,
        uiPathsAllowed: SAFE_FALLBACK_PATHS[kbLang],
      },
      trustedOperationalCard: false,
      uiPaths: SAFE_FALLBACK_PATHS[kbLang],
    }
  }

  let finalAnswer = rawAnswer

  const canUseReformat =
    allowAiReformat &&
    Boolean(reformat) &&
    mode === 'card' &&
    !card.guideId &&
    intentType === 'informational'

  if (canUseReformat && reformat) {
    try {
      finalAnswer = await reformat({
        userQuestion: message,
        rawAnswer,
        isGuarded: card.risk === 'guarded',
        isLimited: card.answerMode === 'limited',
        isWarm: assistantTone === 'warm',
        lang: kbLang,
        uiPathHint: buildUiPathHint(card),
      })
    } catch (error) {
      console.warn('[bot] reformatter failed, using raw answer:', (error as Error)?.message)
      finalAnswer = rawAnswer
    }
  }

  const trustedOperationalCard = isTrustedOperationalCard(engineCard)

  // Explicit block for untrusted procedural text patterns.
  if ((!trustedOperationalCard || mode === 'fallback') && containsProceduralFreeform(finalAnswer)) {
    finalAnswer = enforceNonProceduralIfUntrusted(finalAnswer, engineCard)
  }

  if (assistantTone === 'warm') {
    finalAnswer = withWarmOpening(finalAnswer, kbLang)
  }

  const uiPaths = engineCard.uiPathsAllowed.length > 0
    ? engineCard.uiPathsAllowed
    : (mode === 'fallback' ? SAFE_FALLBACK_PATHS[kbLang] : [])

  return {
    answer: finalAnswer,
    card: engineCard,
    trustedOperationalCard,
    uiPaths,
  }
}

export function buildEmergencyFallback(lang: KbLang, cardId = 'emergency-fallback') {
  return {
    ok: true as const,
    mode: 'fallback' as const,
    cardId,
    answer: lang === 'es'
      ? 'Entiendo tu duda. Ahora mismo no he encontrado información exacta. Puedes abrir el Hub de Guías para encontrar la guía más cercana.'
      : 'Entenc el teu dubte. Ara mateix no he trobat informació exacta. Pots obrir el Hub de Guies per trobar la guia més propera.',
    guideId: null,
    uiPaths: SAFE_FALLBACK_PATHS[lang],
  }
}
