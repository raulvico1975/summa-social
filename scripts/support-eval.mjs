import loadKbModule from '../src/lib/support/load-kb.ts'
import goldenSetModule from '../src/lib/support/eval/golden-set.ts'
import orchestratorModule from '../src/lib/support/engine/orchestrator.ts'
import policyModule from '../src/lib/support/engine/policy.ts'

const loadKb = loadKbModule?.default ?? loadKbModule
const goldenSet = goldenSetModule?.default ?? goldenSetModule
const engineOrchestrator = orchestratorModule?.default ?? orchestratorModule
const policy = policyModule?.default ?? policyModule

const { loadAllCards } = loadKb
const { GOLDEN_SET, GOLDEN_SET_MIN_CRITICAL_TOP1 } = goldenSet
const { orchestrator } = engineOrchestrator
const { containsProceduralFreeform } = policy

const cards = loadAllCards()

let top1Hits = 0
let criticalTop1Hits = 0
let criticalTotal = 0
let fallbackCount = 0
let hallucinationCount = 0
const mismatches = []

for (const testCase of GOLDEN_SET) {
  const result = await orchestrator({
    message: testCase.question,
    kbLang: testCase.lang,
    cards,
    clarifyOptionIds: [],
    assistantTone: 'neutral',
    allowAiIntent: false,
    allowAiReformat: false,
  })

  const actualCardId = result.response.cardId
  const isHit = actualCardId === testCase.expectedCardId
  if (isHit) {
    top1Hits += 1
    if (testCase.critical) criticalTop1Hits += 1
  } else {
    mismatches.push(`[${testCase.lang}] "${testCase.question}" => expected "${testCase.expectedCardId}" got "${actualCardId}" (${result.response.mode})`)
  }

  if (testCase.critical) {
    criticalTotal += 1
  }

  if (result.response.mode === 'fallback') {
    fallbackCount += 1
  }

  const hasProceduralText = containsProceduralFreeform(result.response.answer)
  const operationalWithoutCard = result.meta.intentType === 'operational' && result.response.mode !== 'card'
  const untrustedOperationalCard =
    result.meta.intentType === 'operational' &&
    result.response.mode === 'card' &&
    !result.meta.trustedOperationalCard

  if ((operationalWithoutCard || untrustedOperationalCard) && hasProceduralText) {
    hallucinationCount += 1
  }
}

const total = GOLDEN_SET.length
const top1Accuracy = total > 0 ? top1Hits / total : 0
const criticalTop1Accuracy = criticalTotal > 0 ? criticalTop1Hits / criticalTotal : 0
const fallbackRate = total > 0 ? fallbackCount / total : 0

console.log('=== Support Golden Set Eval ===')
console.log(`Cases: ${total}`)
console.log(`Top1: ${(top1Accuracy * 100).toFixed(2)}% (${top1Hits}/${total})`)
console.log(`Critical Top1: ${(criticalTop1Accuracy * 100).toFixed(2)}% (${criticalTop1Hits}/${criticalTotal})`)
console.log(`Fallback rate: ${(fallbackRate * 100).toFixed(2)}% (${fallbackCount}/${total})`)
console.log(`Hallucination (operational without trusted card): ${hallucinationCount}`)

if (mismatches.length > 0) {
  console.log('\n--- Mismatches (first 20) ---')
  for (const line of mismatches.slice(0, 20)) {
    console.log(line)
  }
}

if (criticalTop1Accuracy < GOLDEN_SET_MIN_CRITICAL_TOP1) {
  console.error(`\nERROR: Critical Top1 below threshold (${(criticalTop1Accuracy * 100).toFixed(2)}% < ${(GOLDEN_SET_MIN_CRITICAL_TOP1 * 100).toFixed(2)}%)`)
  process.exit(1)
}

if (hallucinationCount > 0) {
  console.error(`\nERROR: Hallucination guardrail violated (${hallucinationCount} cases).`)
  process.exit(1)
}

console.log('\nGolden set gate PASSED')
