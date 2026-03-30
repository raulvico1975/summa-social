import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import nextConfig from '../../../next.config'
import { loadAllCards } from '../support/load-kb'
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

test('next config traces support KB assets into production server bundle', () => {
  const includes = nextConfig.outputFileTracingIncludes ?? {}
  const supportBotIncludes = includes['/api/support/bot'] ?? []

  assert.ok(
    supportBotIncludes.includes('docs/kb/**/*'),
    'Missing docs/kb tracing include for /api/support/bot'
  )
  assert.ok(
    supportBotIncludes.includes('src/i18n/locales/**/*.json'),
    'Missing i18n locale tracing include for /api/support/bot'
  )
})
