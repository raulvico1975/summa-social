import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAllCards } from '../support/load-kb'
import { inferQuestionDomain, retrieveCard, suggestKeywordsFromMessage } from '../support/bot-retrieval'

const cards = loadAllCards()

test('retrieveCard understands donation certificate phrasing variants', () => {
  const result = retrieveCard('com faig arribar el certificat de donatius a un soci?', 'ca', cards)
  assert.equal(result.card.id, 'guide-donor-certificate')
  assert.equal(result.mode, 'card')
})

test('retrieveCard understands remittance split variants', () => {
  const result = retrieveCard('vull fraccionar la remesa de rebuts en quotes', 'ca', cards)
  assert.equal(result.card.id, 'guide-split-remittance')
  assert.equal(result.mode, 'card')
})

test('retrieveCard understands expense allocation variants', () => {
  const result = retrieveCard('com reparteixo una despesa entre dos projectes?', 'ca', cards)
  assert.equal(result.card.id, 'guide-projects')
  assert.equal(result.mode, 'card')
})

test('inferQuestionDomain detects fiscal and remittances', () => {
  assert.equal(inferQuestionDomain('Com envio certificat de donació model 182?'), 'fiscal')
  assert.equal(inferQuestionDomain('Puc desfer una remesa de rebuts?'), 'remittances')
})

test('suggestKeywordsFromMessage returns meaningful canonical keywords', () => {
  const keywords = suggestKeywordsFromMessage('com imputo despeses entre projectes i remeses?', 4)
  assert.deepEqual(keywords, ['imputar', 'despesa', 'projecte', 'remesa'])
})
