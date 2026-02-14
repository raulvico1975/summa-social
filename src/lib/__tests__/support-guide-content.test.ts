import test from 'node:test'
import assert from 'node:assert/strict'
import { loadGuideContent } from '../support/load-kb'

test('loadGuideContent includes then/doNext steps in actionable section', () => {
  const content = loadGuideContent('splitRemittance', 'ca')
  assert.match(content, /Què fer ara:/)
  assert.match(content, /Mapeja columnes/)
  assert.match(content, /Revisa l'estat de matching/)
})

test('loadGuideContent includes verification section from checkBeforeExport', () => {
  const content = loadGuideContent('projects', 'ca')
  assert.match(content, /Com comprovar-ho:/)
  assert.match(content, /Cap partida amb desviació crítica/)
})

test('loadGuideContent keeps numbered steps for donor certificate guide', () => {
  const content = loadGuideContent('generateDonorCertificate', 'ca')
  assert.match(content, /1\. Ves a Donants al menú lateral\./)
  assert.match(content, /5\. Descarrega o visualitza el PDF generat\./)
})
