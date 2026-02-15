import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeKbCardsWithMetadata, PROTECTED_CARD_IDS } from '../support/kb-draft-store'
import { toHumanIssues } from '../support/kb-human-errors'
import { generateUniqueCardId, resolveWizardCard } from '../support/kb-wizard-mapper'
import type { KBCard } from '../support/load-kb'

function makeCard(id: string, overrides?: Partial<KBCard>): KBCard {
  return {
    id,
    type: 'howto',
    domain: 'general',
    risk: 'safe',
    guardrail: 'none',
    answerMode: 'full',
    title: { ca: `Titol ${id}`, es: `Titulo ${id}` },
    intents: { ca: [`pregunta ${id}`], es: [`pregunta ${id}`] },
    guideId: null,
    answer: { ca: `Resposta ${id}`, es: `Respuesta ${id}` },
    uiPaths: [],
    needsSnapshot: false,
    keywords: ['test'],
    related: [],
    error_key: null,
    symptom: { ca: null, es: null },
    ...overrides,
  }
}

test('resolveWizardCard mapa fiscal -> guarded + b1_fiscal + limited', () => {
  const resolved = resolveWizardCard({
    input: {
      mode: 'manual',
      questionCa: 'Com genero el model 182?',
      answerCa: 'Revisa els donants i genera el model.',
    },
    existingIds: new Set(),
  })

  assert.equal(resolved.card.domain, 'fiscal')
  assert.equal(resolved.card.risk, 'guarded')
  assert.equal(resolved.card.guardrail, 'b1_fiscal')
  assert.equal(resolved.card.answerMode, 'limited')
})

test('generateUniqueCardId evita col·lisions quan la base ja existeix', () => {
  const existingIds = new Set(['com-genero-el-model-182', 'com-genero-el-model-182-a1b2c3'])

  const generated = generateUniqueCardId({
    baseText: 'Com genero el model 182',
    existingIds,
    fixedSeed: 'fixed-seed',
  })

  assert.notEqual(generated, 'com-genero-el-model-182')
  assert.ok(!existingIds.has(generated))
})

test('toHumanIssues transforma errors tècnics en missatges humans', () => {
  const issues = toHumanIssues({
    errors: ['card:x: Missing title.es', 'Missing required fallback card: fallback-no-answer'],
    warnings: ['Golden: 2 consultes operatives han caigut a fallback (sense card)'],
  })

  assert.ok(issues.some(issue => issue.message.includes('Falta la pregunta en castellà.')))
  assert.ok(issues.some(issue => issue.message.includes('Falta una resposta bàsica del sistema')))
  assert.ok(issues.some(issue => issue.severity === 'warning'))
})

test('mergeKbCardsWithMetadata aplica deletedCardIds i marca protected cards', () => {
  const protectedId = PROTECTED_CARD_IDS[0]

  const merged = mergeKbCardsWithMetadata({
    baseCards: [makeCard(protectedId), makeCard('manual-card')],
    publishedCards: [makeCard('published-card')],
    draftCards: [makeCard('draft-card')],
    deletedCardIds: ['manual-card'],
  })

  assert.ok(merged.activeCards.every(card => card.id !== 'manual-card'))
  assert.ok(merged.rows.some(row => row.card.id === 'manual-card' && row.isDeleted))
  assert.ok(merged.rows.some(row => row.card.id === protectedId && row.isRequiredCore))
})
