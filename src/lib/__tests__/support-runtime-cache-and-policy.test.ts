import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAllCards, loadGuideContent } from '../support/load-kb'
import { isEmergencyRuntimeKb, loadKbCards } from '../support/load-kb-runtime'
import { normalizeUiPathsAgainstCatalog } from '../support/engine/policy'

function findJsonFiles(dir: string): string[] {
  const entries = readdirSync(dir)
  const results: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry)
    if (statSync(fullPath).isDirectory()) {
      results.push(...findJsonFiles(fullPath))
      continue
    }

    if (entry.endsWith('.json')) {
      results.push(fullPath)
    }
  }

  return results
}

test('runtime KB bundle matches repo cards and fallbacks', async () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const kbDir = join(here, '..', '..', '..', 'docs', 'kb')
  const fallbacksPath = join(kbDir, '_fallbacks.json')
  const cardsDir = join(kbDir, 'cards')

  const fallbacks = JSON.parse(readFileSync(fallbacksPath, 'utf-8')) as Array<{ id: string }>
  const cardFiles = findJsonFiles(cardsDir)
  const expectedIds = [
    ...fallbacks.map(card => card.id),
    ...cardFiles.map(file => (JSON.parse(readFileSync(file, 'utf-8')) as { id: string }).id),
  ].sort()

  const baseCards = loadAllCards()
  const runtimeCards = await loadKbCards()

  assert.equal(baseCards.length, expectedIds.length)
  assert.equal(runtimeCards.length, expectedIds.length)
  assert.deepEqual(
    runtimeCards.map(card => card.id).sort(),
    baseCards.map(card => card.id).sort()
  )
  assert.deepEqual(
    baseCards.map(card => card.id).sort(),
    expectedIds
  )
})

test('policy keeps dashboard route ui paths actionable for bot navigation', () => {
  assert.deepEqual(
    normalizeUiPathsAgainstCatalog(['/dashboard/donants']),
    ['Donants']
  )
})

test('runtime KB health check detects emergency-only dataset', () => {
  const emergencyCards = [
    { id: 'fallback-no-answer', type: 'fallback' },
    { id: 'fallback-fiscal-unclear', type: 'fallback' },
    { id: 'fallback-sepa-unclear', type: 'fallback' },
    { id: 'fallback-remittances-unclear', type: 'fallback' },
    { id: 'fallback-danger-unclear', type: 'fallback' },
  ] as typeof loadAllCards extends () => Array<infer T> ? T[] : never

  assert.equal(isEmergencyRuntimeKb(emergencyCards), true)
  assert.equal(isEmergencyRuntimeKb(loadAllCards()), false)
})

test('guide content loads from bundled locales without filesystem access', () => {
  const guide = loadGuideContent('firstDay', 'es')

  assert.match(guide, /Orientarse el primer día sin perderse/i)
  assert.match(guide, /Qué hacer ahora:/i)
})
