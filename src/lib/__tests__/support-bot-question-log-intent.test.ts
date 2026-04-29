import test from 'node:test'
import assert from 'node:assert/strict'
import { logBotQuestion } from '../support/bot-question-log'

function buildFakeDb() {
  let capturedPath = ''
  let capturedData: Record<string, unknown> | null = null

  const docRef = {
    collection(name: string) {
      capturedPath += `/${name}`
      return collectionRef
    },
    doc(id: string) {
      capturedPath += `/${id}`
      return docRef
    },
    async set(data: Record<string, unknown>) {
      capturedData = data
    },
  }

  const collectionRef = {
    doc(id: string) {
      capturedPath += `/${id}`
      return docRef
    },
  }

  return {
    db: {
      collection(name: string) {
        capturedPath = name
        return collectionRef
      },
    },
    getCapturedPath: () => capturedPath,
    getCapturedData: () => capturedData,
  }
}

test('logBotQuestion stores optional retrieval intent diagnostics without undefined fields', async () => {
  const fake = buildFakeDb()

  await logBotQuestion(
    fake.db as never,
    'org-1',
    'com imputo un abonament de Stripe?',
    'ca',
    'card',
    'guide-stripe-donations',
    {
      intentDetected: 'stripe_imputation',
      intentConfidence: 0.86,
      intentReason: 'strong:stripe+abonament',
      candidateCardIds: ['guide-stripe-donations', 'guide-split-remittance'],
      candidateScores: [742, 210],
      candidateReasons: ['intent_boost', 'domain_penalty'],
      retrievalDomain: 'stripe',
      retrievalOutcome: 'card',
      languageDetected: 'ca',
    } as any
  )

  const data = fake.getCapturedData()
  assert.ok(data)
  assert.match(fake.getCapturedPath(), /^organizations\/org-1\/supportBotQuestions\//)
  assert.equal(data.intentDetected, 'stripe_imputation')
  assert.equal(data.intentConfidence, 0.86)
  assert.equal(data.intentReason, 'strong:stripe+abonament')
  assert.deepEqual(data.candidateCardIds, ['guide-stripe-donations', 'guide-split-remittance'])
  assert.deepEqual(data.candidateScores, [742, 210])
  assert.deepEqual(data.candidateReasons, ['intent_boost', 'domain_penalty'])
  assert.equal(data.retrievalDomain, 'stripe')
  assert.equal(data.retrievalOutcome, 'card')
  assert.equal(data.languageDetected, 'ca')

  for (const [key, value] of Object.entries(data)) {
    assert.notEqual(value, undefined, `${key} must not be written as undefined`)
  }
})
