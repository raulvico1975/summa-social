import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluateCommunicationStatus,
  evaluateStalenessStatus,
  evaluateSystemStatus,
  inferBotTopic,
  pickMostRecentIso,
} from '../admin/control-tower-summary'

test('evaluateSystemStatus follows conservative thresholds', () => {
  assert.equal(evaluateSystemStatus(0, false), 'ok')
  assert.equal(evaluateSystemStatus(1, false), 'warning')
  assert.equal(evaluateSystemStatus(3, false), 'critical')
  assert.equal(evaluateSystemStatus(1, true), 'critical')
})

test('evaluateStalenessStatus marks warning and critical by age', () => {
  const now = new Date('2026-02-14T12:00:00.000Z')

  assert.equal(evaluateStalenessStatus('2026-02-10T00:00:00.000Z', 45, 90, now), 'ok')
  assert.equal(evaluateStalenessStatus('2025-12-20T00:00:00.000Z', 45, 90, now), 'warning')
  assert.equal(evaluateStalenessStatus('2025-10-01T00:00:00.000Z', 45, 90, now), 'critical')
  assert.equal(evaluateStalenessStatus(null, 45, 90, now), 'critical')
})

test('evaluateCommunicationStatus combines age and pending drafts', () => {
  const now = new Date('2026-02-14T12:00:00.000Z')

  assert.equal(evaluateCommunicationStatus('2026-02-10T00:00:00.000Z', 2, now), 'ok')
  assert.equal(evaluateCommunicationStatus('2025-12-20T00:00:00.000Z', 2, now), 'warning')
  assert.equal(evaluateCommunicationStatus('2026-02-10T00:00:00.000Z', 7, now), 'warning')
  assert.equal(evaluateCommunicationStatus('2026-02-10T00:00:00.000Z', 11, now), 'critical')
  assert.equal(evaluateCommunicationStatus(null, 0, now), 'critical')
})

test('inferBotTopic groups common operational themes', () => {
  assert.equal(inferBotTopic('Error exportant model 182'), 'Model 182')
  assert.equal(inferBotTopic('no funciona stripe importer'), 'Stripe')
  assert.equal(inferBotTopic('com dividir una remesa sepa pain008'), 'Remeses')
  assert.equal(inferBotTopic('consulta genèrica sense patró'), 'Altres')
})

test('pickMostRecentIso picks latest valid candidate and ignores invalid values', () => {
  assert.equal(
    pickMostRecentIso([
      null,
      'invalid',
      '2026-02-10T09:00:00.000Z',
      '2026-02-10T11:00:00.000Z',
      undefined,
    ]),
    '2026-02-10T11:00:00.000Z'
  )
  assert.equal(pickMostRecentIso([null, undefined, 'invalid']), null)
})
