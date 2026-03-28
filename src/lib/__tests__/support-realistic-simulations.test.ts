import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAllCards, type KBCard } from '../support/load-kb'
import { REALISTIC_SIMULATION_CASES, evaluateRealisticSimulations } from '../support/eval/realistic-simulations'
import { canAcceptIntentSelection, resolveRetrieval } from '../support/engine/retrieval'

const cards = loadAllCards()

test('realistic support simulations keep exact answers across 50+ natural queries', async () => {
  const report = await evaluateRealisticSimulations({ cards })

  assert.ok(REALISTIC_SIMULATION_CASES.length >= 50)
  assert.equal(report.failures.length, 0, report.failures.slice(0, 5).map(item => `${item.caseId}: ${item.reason}`).join('\n'))
  assert.equal(report.metrics.exactCardHits, report.metrics.total)
  assert.equal(report.metrics.qualityPasses, report.metrics.total)
})

test('safe intent selection accepts ai rerank to deterministic runner-up only', () => {
  const deterministic = {
    card: cards.find(card => card.id === 'guide-access-security')!,
    mode: 'card' as const,
    bestCardId: 'guide-access-security',
    bestScore: 120,
    secondCardId: 'howto-member-user-permissions',
    secondScore: 112,
    confidence: 'medium' as const,
    confidenceBand: 'medium' as const,
  }

  assert.equal(canAcceptIntentSelection({
    deterministic,
    selectedBestCardId: 'howto-member-user-permissions',
    decisionReason: 'ai_intent_high_confidence',
  }), true)

  assert.equal(canAcceptIntentSelection({
    deterministic,
    selectedBestCardId: 'manual-login-access',
    decisionReason: 'ai_intent_high_confidence',
  }), false)

  assert.equal(canAcceptIntentSelection({
    deterministic,
    selectedBestCardId: 'howto-member-user-permissions',
    decisionReason: 'medium_confidence_card',
  }), false)
})

test('resolveRetrieval can use ai intent for non-high-confidence selections', async () => {
  const fallbackCard = cards.find(card => card.id === 'fallback-no-answer')
  assert.ok(fallbackCard, 'fallback-no-answer card must exist')

  const localCards: KBCard[] = [
    {
      id: 'kb-config-logo-medium',
      type: 'howto',
      domain: 'config',
      risk: 'safe',
      guardrail: 'none',
      answerMode: 'full',
      title: { ca: 'Canviar logo', es: 'Cambiar logo' },
      intents: { ca: ['com canvio el logo'], es: ['como cambio el logo'] },
      guideId: null,
      answer: {
        ca: '1. Ves a Configuració.\n2. Puja el logo.',
        es: '1. Ve a Configuración.\n2. Sube el logo.',
      },
      uiPaths: ['Configuració'],
      needsSnapshot: false,
      keywords: ['logo', 'configuracio'],
      related: [],
      error_key: null,
      symptom: { ca: null, es: null },
    },
    {
      id: 'kb-config-language-medium',
      type: 'howto',
      domain: 'config',
      risk: 'safe',
      guardrail: 'none',
      answerMode: 'full',
      title: { ca: 'Canviar idioma', es: 'Cambiar idioma' },
      intents: { ca: ['com canvio l idioma'], es: ['como cambio el idioma'] },
      guideId: null,
      answer: {
        ca: '1. Ves a Configuració.\n2. Tria idioma.',
        es: '1. Ve a Configuración.\n2. Elige idioma.',
      },
      uiPaths: ['Configuració'],
      needsSnapshot: false,
      keywords: ['idioma', 'configuracio'],
      related: [],
      error_key: null,
      symptom: { ca: null, es: null },
    },
    fallbackCard,
  ]

  const resolution = await resolveRetrieval({
    message: 'com canvio coses de configuracio',
    lang: 'ca',
    cards: localCards,
    clarifyOptionIds: [],
    useIntentClassifier: true,
    classifyIntent: async () => ({
      card: localCards[1],
      confidence: 'medium',
    }),
  })

  assert.equal(resolution.result?.bestCardId, 'kb-config-language-medium')
  assert.equal(resolution.result?.decisionReason, 'ai_intent_medium_confidence')
})
