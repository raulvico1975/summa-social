import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAllCards } from '../support/load-kb'
import {
  TOP_SUPPORT_USER_QUESTIONS_CA,
  evaluateTopSupportQuestionsBenchmark,
} from '../support/eval/top-support-questions'

test('top support benchmark defines exactly 100 unique catalan user questions', () => {
  assert.equal(TOP_SUPPORT_USER_QUESTIONS_CA.length, 100)

  const uniqueIds = new Set(TOP_SUPPORT_USER_QUESTIONS_CA.map(item => item.id))
  const uniqueQuestions = new Set(TOP_SUPPORT_USER_QUESTIONS_CA.map(item => item.question))

  assert.equal(uniqueIds.size, 100)
  assert.equal(uniqueQuestions.size, 100)
})

test('top support benchmark evaluator accepts expected cards for representative cases', async () => {
  const cards = loadAllCards()
  const representativeCases = TOP_SUPPORT_USER_QUESTIONS_CA.filter(item => [
    'donants-01',
    'remeses-02',
    'importacio-03',
    'fiscal-03',
    'equip-03',
    'projectes-02',
  ].includes(item.id))

  const { metrics, mismatches } = await evaluateTopSupportQuestionsBenchmark(
    cards,
    representativeCases
  )

  assert.equal(metrics.total, 6)
  assert.equal(metrics.positiveCount, 6)
  assert.equal(mismatches.length, 0)
})
