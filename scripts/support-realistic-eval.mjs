import loadKbModule from '../src/lib/support/load-kb.ts'
import realisticEvalModule from '../src/lib/support/eval/realistic-simulations.ts'

const loadKb = loadKbModule?.default ?? loadKbModule
const realisticEval = realisticEvalModule?.default ?? realisticEvalModule

const { loadAllCards } = loadKb
const { REALISTIC_SIMULATION_CASES, evaluateRealisticSimulations } = realisticEval

const cards = loadAllCards()
const { metrics, failures } = await evaluateRealisticSimulations({ cards })

console.log('=== Support Realistic Simulations ===')
console.log(`Cases: ${REALISTIC_SIMULATION_CASES.length}`)
console.log(`Exact card: ${(metrics.exactCardAccuracy * 100).toFixed(2)}% (${metrics.exactCardHits}/${metrics.total})`)
console.log(`Exact mode: ${(metrics.exactModeAccuracy * 100).toFixed(2)}% (${metrics.exactModeHits}/${metrics.total})`)
console.log(`Quality pass: ${(metrics.qualityPassRate * 100).toFixed(2)}% (${metrics.qualityPasses}/${metrics.total})`)

if (failures.length > 0) {
  console.log('\n--- Failures (first 20) ---')
  for (const failure of failures.slice(0, 20)) {
    console.log(`[${failure.lang}] ${failure.caseId}: ${failure.question}`)
    console.log(`  expected: ${failure.expectedCardId}/${failure.expectedMode}`)
    console.log(`  actual:   ${failure.actualCardId}/${failure.actualMode}`)
    console.log(`  why:      ${failure.reason}`)
    if (failure.decisionReason) {
      console.log(`  decision: ${failure.decisionReason}`)
    }
  }
  process.exit(1)
}

console.log('\nRealistic simulation gate PASSED')
