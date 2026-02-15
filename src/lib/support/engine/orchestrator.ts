import type { KBCard } from '../load-kb'
import type { KbLang } from '../bot-retrieval'
import { buildClarifyAnswer, buildClarifyOptionsPayload } from './disambiguation'
import { isOperationalIntent, normalizeUiPathsAgainstCatalog, SAFE_FALLBACK_PATHS } from './policy'
import { isConfidenceSufficient, pickTopDisambiguationOptions, resolveRetrieval, type IntentClassifier } from './retrieval'
import { buildEmergencyFallback, renderAnswer } from './renderer'
import type { AssistantTone, OrchestratorResult } from './types'

function findFallbackCard(cards: KBCard[]): KBCard | null {
  return cards.find(card => card.id === 'fallback-no-answer')
    ?? cards.find(card => card.type === 'fallback')
    ?? null
}

export async function orchestrator(input: {
  message: string
  kbLang: KbLang
  cards: KBCard[]
  clarifyOptionIds: string[]
  assistantTone: AssistantTone
  allowAiIntent: boolean
  allowAiReformat: boolean
  classifyIntent?: IntentClassifier
  reformat?: (input: {
    userQuestion: string
    rawAnswer: string
    isGuarded: boolean
    isLimited: boolean
    isWarm: boolean
    lang: KbLang
    uiPathHint: string
  }) => Promise<string>
}): Promise<OrchestratorResult> {
  const {
    message,
    kbLang,
    cards,
    clarifyOptionIds,
    assistantTone,
    allowAiIntent,
    allowAiReformat,
    classifyIntent,
    reformat,
  } = input

  if (cards.length === 0) {
    const emergency = buildEmergencyFallback(kbLang)
    return {
      response: emergency,
      meta: {
        intentType: 'informational',
        selectedCardId: emergency.cardId,
        usedClarification: false,
        trustedOperationalCard: false,
      },
      selectedCard: null,
      kbLang,
    }
  }

  const intentType = isOperationalIntent(message) ? 'operational' : 'informational'

  let retrievalResult = null
  let selectedByClarify = false

  try {
    const resolution = await resolveRetrieval({
      message,
      lang: kbLang,
      cards,
      clarifyOptionIds,
      useIntentClassifier: allowAiIntent,
      classifyIntent,
    })
    retrievalResult = resolution.result
    selectedByClarify = resolution.selectedByClarify
  } catch (error) {
    console.error('[bot] retrieve error:', error)
  }

  if (retrievalResult?.clarifyOptions?.length) {
    const options = retrievalResult.clarifyOptions.slice(0, 3)
    const clarifyUiPaths = normalizeUiPathsAgainstCatalog(
      options.flatMap(option => option.uiPaths ?? [])
    )
    return {
      response: {
        ok: true,
        mode: 'fallback',
        cardId: 'clarify-disambiguation',
        answer: buildClarifyAnswer(kbLang, options),
        guideId: null,
        uiPaths: clarifyUiPaths.length > 0 ? clarifyUiPaths : SAFE_FALLBACK_PATHS[kbLang],
        clarifyOptions: buildClarifyOptionsPayload(kbLang, options),
      },
      meta: {
        intentType,
        retrievalConfidence: retrievalResult.confidence,
        bestCardId: retrievalResult.bestCardId,
        bestScore: retrievalResult.bestScore,
        secondCardId: retrievalResult.secondCardId,
        secondScore: retrievalResult.secondScore,
        selectedCardId: 'clarify-disambiguation',
        usedClarification: true,
        trustedOperationalCard: false,
      },
      selectedCard: null,
      kbLang,
    }
  }

  const fallbackCard = findFallbackCard(cards)
  const selectedCard = retrievalResult?.card ?? fallbackCard

  if (!selectedCard) {
    const emergency = buildEmergencyFallback(kbLang)
    return {
      response: emergency,
      meta: {
        intentType,
        retrievalConfidence: retrievalResult?.confidence,
        bestCardId: retrievalResult?.bestCardId,
        bestScore: retrievalResult?.bestScore,
        secondCardId: retrievalResult?.secondCardId,
        secondScore: retrievalResult?.secondScore,
        selectedCardId: emergency.cardId,
        usedClarification: false,
        trustedOperationalCard: false,
      },
      selectedCard: null,
      kbLang,
    }
  }

  // P0 strict guardrail:
  // If intent is operational and confidence is not sufficient, only guided disambiguation or safe fallback.
  if (intentType === 'operational' && !isConfidenceSufficient(retrievalResult?.confidence)) {
    const options = pickTopDisambiguationOptions(cards, retrievalResult)
    if (options.length >= 2) {
      const clarifyUiPaths = normalizeUiPathsAgainstCatalog(
        options.flatMap(option => option.uiPaths ?? [])
      )
      return {
        response: {
          ok: true,
          mode: 'fallback',
          cardId: 'clarify-disambiguation',
          answer: buildClarifyAnswer(kbLang, options),
          guideId: null,
          uiPaths: clarifyUiPaths.length > 0 ? clarifyUiPaths : SAFE_FALLBACK_PATHS[kbLang],
          clarifyOptions: buildClarifyOptionsPayload(kbLang, options),
        },
        meta: {
          intentType,
          retrievalConfidence: retrievalResult?.confidence,
          bestCardId: retrievalResult?.bestCardId,
          bestScore: retrievalResult?.bestScore,
          secondCardId: retrievalResult?.secondCardId,
          secondScore: retrievalResult?.secondScore,
          selectedCardId: 'clarify-disambiguation',
          usedClarification: true,
          trustedOperationalCard: false,
        },
        selectedCard: null,
        kbLang,
      }
    }
  }

  const mode: 'card' | 'fallback' = retrievalResult?.mode ?? 'fallback'

  const rendered = await renderAnswer({
    message,
    kbLang,
    card: selectedCard,
    mode,
    intentType,
    assistantTone,
    allowAiReformat,
    reformat,
  })

  return {
    response: {
      ok: true,
      mode,
      cardId: rendered.card.id,
      answer: rendered.answer,
      guideId: rendered.card.guideId ?? null,
      uiPaths: rendered.uiPaths,
    },
    meta: {
      intentType,
      retrievalConfidence: retrievalResult?.confidence,
      bestCardId: retrievalResult?.bestCardId,
      bestScore: retrievalResult?.bestScore,
      secondCardId: retrievalResult?.secondCardId,
      secondScore: retrievalResult?.secondScore,
      selectedCardId: rendered.card.id,
      usedClarification: selectedByClarify,
      trustedOperationalCard: rendered.trustedOperationalCard,
    },
    selectedCard: rendered.card,
    kbLang,
  }
}
