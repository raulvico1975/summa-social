import test from 'node:test'
import assert from 'node:assert/strict'
import { loadAllCards } from '../support/load-kb'
import { detectSmallTalkResponse, inferQuestionDomain, retrieveCard, suggestKeywordsFromMessage } from '../support/bot-retrieval'

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

test('detectSmallTalkResponse handles greeting', () => {
  const response = detectSmallTalkResponse('Hola', 'ca')
  assert.ok(response)
  assert.equal(response?.cardId, 'smalltalk-greeting')
})

test('detectSmallTalkResponse handles greeting with punctuation', () => {
  const response = detectSmallTalkResponse('Hola!!!', 'ca')
  assert.ok(response)
  assert.equal(response?.cardId, 'smalltalk-greeting')
})

test('detectSmallTalkResponse handles identity question', () => {
  const response = detectSmallTalkResponse('qui ets?', 'ca')
  assert.ok(response)
  assert.equal(response?.cardId, 'smalltalk-about')
})

test('detectSmallTalkResponse handles thanks', () => {
  const response = detectSmallTalkResponse('gràcies', 'ca')
  assert.ok(response)
  assert.equal(response?.cardId, 'smalltalk-thanks')
})

test('detectSmallTalkResponse handles thanks with punctuation', () => {
  const response = detectSmallTalkResponse('gràcies!', 'ca')
  assert.ok(response)
  assert.equal(response?.cardId, 'smalltalk-thanks')
})

test('detectSmallTalkResponse handles acknowledgements', () => {
  const response = detectSmallTalkResponse("d'acord", 'ca')
  assert.ok(response)
  assert.equal(response?.cardId, 'smalltalk-ack')
})
