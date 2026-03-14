import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractToc } from '../help/manual-toc'
import { MANUAL_HINT_ANCHORS, ROUTE_MANUAL_ANCHORS, resolveManualAnchorFromHint } from '../../help/help-manual-links'

const manualCa = readFileSync(
  resolve(process.cwd(), 'public/docs/manual-usuari-summa-social.ca.md'),
  'utf8'
)
const anchorSet = new Set(extractToc(manualCa).map((entry) => entry.id))

test('all HelpSheet manual anchors exist in the public CA manual', () => {
  for (const entry of ROUTE_MANUAL_ANCHORS) {
    assert.equal(
      anchorSet.has(entry.anchor),
      true,
      `Missing manual anchor for route prefix ${entry.routePrefix}: ${entry.anchor}`
    )
  }
})

test('all bot manual hint anchors exist in the public CA manual', () => {
  for (const entry of MANUAL_HINT_ANCHORS) {
    assert.equal(
      anchorSet.has(entry.anchor),
      true,
      `Missing manual anchor for bot hint: ${entry.anchor}`
    )
  }
})

test('resolveManualAnchorFromHint maps manual hints to concrete anchors', () => {
  assert.equal(resolveManualAnchorFromHint('Manual > Remeses'), '6-divisor-de-remeses')
  assert.equal(resolveManualAnchorFromHint('manual > informes'), '9-informes-fiscals')
  assert.equal(resolveManualAnchorFromHint('Header > ? (Ajuda contextual)'), null)
})
