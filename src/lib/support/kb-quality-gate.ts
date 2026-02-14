import expectedCaRaw from '../../../docs/kb/_eval/expected.json'
import expectedEsRaw from '../../../docs/kb/_eval/expected-es.json'
import type { KBCard } from './load-kb'
import { validateKbCards } from './validate-kb-cards'
import { retrieveCard } from './bot-retrieval'

type ExpectedRow = {
  q: string
  expectedCardId?: string
  expectedFallbackId?: string
}

const REQUIRED_FALLBACK_IDS = [
  'fallback-no-answer',
  'fallback-fiscal-unclear',
  'fallback-sepa-unclear',
  'fallback-remittances-unclear',
  'fallback-danger-unclear',
] as const

const MAX_MISMATCH_ERRORS = 30
const MIN_EVAL_ACCURACY = 0.78

type EvalStats = {
  total: number
  passed: number
  failed: number
}

export type KbQualityGateResult = {
  ok: boolean
  errors: string[]
  warnings: string[]
  stats: {
    cards: number
    structuralErrors: number
    structuralWarnings: number
    evalCa: EvalStats
    evalEs: EvalStats
  }
}

function toExpectedRows(raw: unknown): ExpectedRow[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((row): row is ExpectedRow => {
      if (!row || typeof row !== 'object') return false
      const rec = row as Record<string, unknown>
      return typeof rec.q === 'string'
    })
    .map(row => ({
      q: row.q,
      expectedCardId: row.expectedCardId,
      expectedFallbackId: row.expectedFallbackId,
    }))
}

function evaluateExpectedSet(cards: KBCard[], lang: 'ca' | 'es', rows: ExpectedRow[]) {
  const errors: string[] = []
  let passed = 0

  for (const row of rows) {
    const expectedId = row.expectedCardId ?? row.expectedFallbackId
    if (!expectedId) {
      passed++
      continue
    }

    try {
      const result = retrieveCard(row.q, lang, cards)
      const actualId = result.clarifyOptions?.length ? 'clarify-disambiguation' : result.card.id

      if (actualId === expectedId) {
        passed++
      } else if (errors.length < MAX_MISMATCH_ERRORS) {
        errors.push(
          `[${lang}] "${row.q}" -> expected "${expectedId}" but got "${actualId}" (${result.mode})`
        )
      }
    } catch (error) {
      if (errors.length < MAX_MISMATCH_ERRORS) {
        errors.push(
          `[${lang}] "${row.q}" -> retrieval error: ${(error as Error)?.message || String(error)}`
        )
      }
    }
  }

  return {
    errors,
    stats: {
      total: rows.length,
      passed,
      failed: rows.length - passed,
    } satisfies EvalStats,
  }
}

export function runKbQualityGate(cards: KBCard[]): KbQualityGateResult {
  const validation = validateKbCards(cards)
  const errors = [...validation.errors]
  const warnings = [...validation.warnings]

  const cardIds = new Set(cards.map(c => c.id))
  for (const fallbackId of REQUIRED_FALLBACK_IDS) {
    if (!cardIds.has(fallbackId)) {
      errors.push(`Missing required fallback card: ${fallbackId}`)
    }
  }

  const expectedCa = toExpectedRows(expectedCaRaw)
  const expectedEs = toExpectedRows(expectedEsRaw)

  const evalCa = evaluateExpectedSet(cards, 'ca', expectedCa)
  const evalEs = evaluateExpectedSet(cards, 'es', expectedEs)

  const caAccuracy = evalCa.stats.total > 0 ? evalCa.stats.passed / evalCa.stats.total : 0
  const esAccuracy = evalEs.stats.total > 0 ? evalEs.stats.passed / evalEs.stats.total : 0

  if (caAccuracy < MIN_EVAL_ACCURACY) {
    errors.push(
      `Eval CA sota mínim (${(caAccuracy * 100).toFixed(1)}% < ${(MIN_EVAL_ACCURACY * 100).toFixed(0)}%)`
    )
  }

  if (esAccuracy < MIN_EVAL_ACCURACY) {
    errors.push(
      `Eval ES sota mínim (${(esAccuracy * 100).toFixed(1)}% < ${(MIN_EVAL_ACCURACY * 100).toFixed(0)}%)`
    )
  }

  // Keep detailed mismatches as warnings for operator visibility.
  warnings.push(...evalCa.errors, ...evalEs.errors)

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    stats: {
      cards: cards.length,
      structuralErrors: validation.errors.length,
      structuralWarnings: validation.warnings.length,
      evalCa: evalCa.stats,
      evalEs: evalEs.stats,
    },
  }
}
