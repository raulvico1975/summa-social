import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadAllCards } from '../support/load-kb'
import { loadKbCards } from '../support/load-kb-runtime'
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

test('runtime KB only loads repo cards and fallbacks', async () => {
  const here = dirname(fileURLToPath(import.meta.url))
  const kbDir = join(here, '..', '..', '..', 'docs', 'kb')
  const fallbacksPath = join(kbDir, '_fallbacks.json')
  const cardsDir = join(kbDir, 'cards')

  const fallbacks = JSON.parse(readFileSync(fallbacksPath, 'utf-8')) as unknown[]
  const cardFiles = findJsonFiles(cardsDir)
  const expectedCount = fallbacks.length + cardFiles.length

  const baseCards = loadAllCards()
  const runtimeCards = await loadKbCards()

  assert.equal(baseCards.length, expectedCount)
  assert.equal(runtimeCards.length, expectedCount)
  assert.deepEqual(
    runtimeCards.map(card => card.id).sort(),
    baseCards.map(card => card.id).sort()
  )
})

test('policy keeps dashboard route ui paths actionable for bot navigation', () => {
  assert.deepEqual(
    normalizeUiPathsAgainstCatalog(['/dashboard/donants']),
    ['Donants']
  )
})
