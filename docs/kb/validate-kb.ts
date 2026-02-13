/**
 * Knowledge Base Validator — Summa Social
 *
 * Validates all KB cards against _schema.json rules.
 * Zero dependencies (only Node built-ins).
 *
 * Usage:
 *   node --import tsx docs/kb/validate-kb.ts
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const KB_DIR = __dirname
const CARDS_DIR = join(KB_DIR, 'cards')
const FALLBACKS_PATH = join(KB_DIR, '_fallbacks.json')
const EXPECTED_CA_PATH = join(KB_DIR, '_eval', 'expected.json')
const EXPECTED_ES_PATH = join(KB_DIR, '_eval', 'expected-es.json')
const I18N_CA_PATH = join(KB_DIR, '..', '..', 'src', 'i18n', 'locales', 'ca.json')

// --- Enums from _schema.json ---

const VALID_TYPES = ['howto', 'concept', 'troubleshooting', 'glossary', 'fallback'] as const
const VALID_DOMAINS = [
  'general', 'config', 'donors', 'transactions', 'remittances',
  'sepa', 'fiscal', 'documents', 'projects', 'superadmin',
] as const
const VALID_RISKS = ['safe', 'guarded'] as const
const VALID_GUARDRAILS = ['none', 'b1_fiscal', 'b1_sepa', 'b1_remittances', 'b1_danger'] as const
const VALID_ANSWER_MODES = ['full', 'limited'] as const
const GUARDED_DOMAINS = new Set(['fiscal', 'sepa', 'remittances', 'superadmin'])
const KEBAB_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

// Verbs that limited-mode answers should NOT contain (best-effort regex, CA + ES)
const RISKY_VERBS_RE = /\b(processa|desfés|reprocessa|genera\b|exporta\b|esborra|elimina\b|confirma\b|procesa\b|deshaz|reprocesa|genera\b|exporta\b|borra\b|elimina\b|confirma\b)/i

// ---

interface Card {
  id: string
  type: string
  domain: string
  risk: string
  guardrail: string
  answerMode: string
  title: { ca?: string; es?: string }
  intents: { ca?: string[]; es?: string[] }
  guideId?: string | null
  answer?: { ca?: string; es?: string } | null
  uiPaths: string[]
  needsSnapshot: boolean
  snapshotClaims?: string[]
  keywords: string[]
  source_faq: string[]
  source_manual: string[]
  source_guides: string[]
  related: string[]
  error_key: string | null
  symptom: { ca?: string | null; es?: string | null }
}

interface Expected {
  q: string
  expectedCardId?: string
  expectedFallbackId?: string
  note?: string
}

const errors: string[] = []
const warnings: string[] = []

function err(file: string, msg: string) {
  errors.push(`[ERROR] ${file}: ${msg}`)
}

function warn(file: string, msg: string) {
  warnings.push(`[WARN]  ${file}: ${msg}`)
}

// --- Load all card files recursively ---

function findJsonFiles(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      results.push(...findJsonFiles(full))
    } else if (entry.endsWith('.json')) {
      results.push(full)
    }
  }
  return results
}

function loadJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T
  } catch (e) {
    err(relative(KB_DIR, path), `Cannot parse JSON: ${(e as Error).message}`)
    return null
  }
}

// --- Validation ---

function validateCard(card: Card, file: string) {
  const f = relative(KB_DIR, file)

  // id
  if (!card.id || typeof card.id !== 'string') return err(f, 'Missing or invalid id')
  if (!KEBAB_RE.test(card.id)) err(f, `id "${card.id}" is not kebab-case`)

  // type
  if (!VALID_TYPES.includes(card.type as any)) err(f, `Invalid type "${card.type}"`)

  // domain
  if (!VALID_DOMAINS.includes(card.domain as any)) err(f, `Invalid domain "${card.domain}"`)

  // risk
  if (!VALID_RISKS.includes(card.risk as any)) err(f, `Invalid risk "${card.risk}"`)

  // guardrail
  if (!VALID_GUARDRAILS.includes(card.guardrail as any)) err(f, `Invalid guardrail "${card.guardrail}"`)

  // answerMode
  if (!VALID_ANSWER_MODES.includes(card.answerMode as any)) err(f, `Invalid answerMode "${card.answerMode}"`)

  // title
  if (!card.title?.ca) err(f, 'Missing title.ca')
  if (!card.title?.es) err(f, 'Missing title.es')

  // intents
  if (!card.intents?.ca?.length) err(f, 'intents.ca must have at least 1 element')
  if (!card.intents?.es?.length) err(f, 'intents.es must have at least 1 element')

  // Content: guideId or answer required
  const hasGuide = card.guideId != null && card.guideId !== ''
  const hasAnswer = card.answer != null && (card.answer.ca || card.answer.es)
  if (!hasGuide && !hasAnswer) err(f, 'Must have guideId or answer (at least one)')

  if (hasAnswer) {
    if (!card.answer!.ca) err(f, 'answer.ca is missing')
    if (!card.answer!.es) err(f, 'answer.es is missing')
  }

  // uiPaths
  if (!Array.isArray(card.uiPaths)) err(f, 'uiPaths must be an array')

  // needsSnapshot
  if (typeof card.needsSnapshot !== 'boolean') err(f, 'needsSnapshot must be boolean')
  if (card.needsSnapshot && (!card.snapshotClaims || card.snapshotClaims.length === 0)) {
    err(f, 'needsSnapshot=true requires non-empty snapshotClaims')
  }

  // Arrays
  for (const field of ['keywords', 'source_faq', 'source_manual', 'source_guides', 'related'] as const) {
    if (!Array.isArray(card[field])) err(f, `${field} must be an array`)
  }

  // symptom
  if (card.symptom === undefined || card.symptom === null) err(f, 'symptom must be an object with ca/es')

  // --- Coherence rules ---

  // GUARDED_DOMAIN: guarded domains must have risk=guarded and guardrail!=none
  if (GUARDED_DOMAINS.has(card.domain)) {
    if (card.risk !== 'guarded') err(f, `domain "${card.domain}" requires risk="guarded"`)
    if (card.guardrail === 'none') err(f, `domain "${card.domain}" requires guardrail != "none"`)
  }

  // GUARDED_FULL_NEEDS_SOURCE: guarded + full + no guideId → must have source_faq or source_manual
  if (card.risk === 'guarded' && card.answerMode === 'full' && !hasGuide) {
    const hasFaqSource = card.source_faq?.length > 0
    const hasManualSource = card.source_manual?.length > 0
    if (!hasFaqSource && !hasManualSource) {
      err(f, 'Guarded card with answerMode=full and no guideId requires source_faq or source_manual')
    }
  }

  // LIMITED_NO_RISKY_VERBS: limited answers shouldn't contain risky verbs
  if (card.answerMode === 'limited' && hasAnswer) {
    const combinedText = `${card.answer!.ca || ''} ${card.answer!.es || ''}`
    if (RISKY_VERBS_RE.test(combinedText)) {
      warn(f, `answerMode=limited but answer contains risky verbs (best-effort check)`)
    }
  }
}

// --- Load valid guideIds from i18n ---

function loadValidGuideIds(): Set<string> {
  const ids = new Set<string>()
  try {
    const raw = JSON.parse(readFileSync(I18N_CA_PATH, 'utf-8'))
    // Flatten nested object and find keys matching guides.{id}.title
    function walk(obj: Record<string, unknown>, prefix: string) {
      for (const [key, val] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key
        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
          walk(val as Record<string, unknown>, fullKey)
        } else if (fullKey.match(/^guides\.([^.]+)\.title$/)) {
          ids.add(fullKey.split('.')[1])
        }
      }
    }
    walk(raw, '')
  } catch (e) {
    warn('i18n', `Cannot load ca.json for guideId validation: ${(e as Error).message}`)
  }
  return ids
}

// --- Main ---

console.log('=== Summa Social KB Validator ===\n')

// 1. Load fallbacks
const fallbacks = loadJson<Card[]>(FALLBACKS_PATH) ?? []
const allCards: Card[] = []
const allIds = new Set<string>()

for (const fb of fallbacks) {
  validateCard(fb, FALLBACKS_PATH)
  if (allIds.has(fb.id)) err('_fallbacks.json', `Duplicate id "${fb.id}"`)
  allIds.add(fb.id)
  allCards.push(fb)
}

// 2. Load all card files
const cardFiles = findJsonFiles(CARDS_DIR)
for (const file of cardFiles) {
  const card = loadJson<Card>(file)
  if (!card) continue
  validateCard(card, file)
  if (allIds.has(card.id)) err(relative(KB_DIR, file), `Duplicate id "${card.id}"`)
  allIds.add(card.id)
  allCards.push(card)
}

// 3. Validate `related` references
for (const card of allCards) {
  if (!card.related) continue
  for (const relId of card.related) {
    if (!allIds.has(relId)) {
      warn(`card:${card.id}`, `related "${relId}" does not exist in KB`)
    }
  }
}

// 4. Validate guideId references against i18n
const validGuideIds = loadValidGuideIds()
for (const card of allCards) {
  if (card.guideId) {
    if (!validGuideIds.has(card.guideId)) {
      err(`card:${card.id}`, `guideId "${card.guideId}" not found in i18n (guides.${card.guideId}.title missing from ca.json)`)
    }
  }
}

// 5. Validate expected.json references (CA)
const expectedCaEntries = loadJson<Expected[]>(EXPECTED_CA_PATH) ?? []
for (const entry of expectedCaEntries) {
  const targetId = entry.expectedCardId ?? entry.expectedFallbackId
  if (targetId && !allIds.has(targetId)) {
    err('_eval/expected.json', `Referenced id "${targetId}" does not exist (query: "${entry.q.slice(0, 40)}...")`)
  }
}

// 6. Validate expected-es.json references (ES)
const expectedEsEntries = loadJson<Expected[]>(EXPECTED_ES_PATH) ?? []
for (const entry of expectedEsEntries) {
  const targetId = entry.expectedCardId ?? entry.expectedFallbackId
  if (targetId && !allIds.has(targetId)) {
    err('_eval/expected-es.json', `Referenced id "${targetId}" does not exist (query: "${entry.q.slice(0, 40)}...")`)
  }
}

// 7. Stats
const guardedCards = allCards.filter(c => c.risk === 'guarded')
const safeCards = allCards.filter(c => c.risk === 'safe')
const troubleshootingCards = allCards.filter(c => c.type === 'troubleshooting')
const fallbackCards = allCards.filter(c => c.type === 'fallback')
const withGuideId = allCards.filter(c => c.guideId != null && c.guideId !== '')

console.log(`Cards loaded:     ${allCards.length} (${cardFiles.length} files + ${fallbacks.length} fallbacks)`)
console.log(`  Safe:           ${safeCards.length}`)
console.log(`  Guarded:        ${guardedCards.length}`)
console.log(`  Troubleshooting:${troubleshootingCards.length}`)
console.log(`  Fallback:       ${fallbackCards.length}`)
console.log(`  With guideId:   ${withGuideId.length}`)
console.log(`i18n guideIds:    ${validGuideIds.size}`)
console.log(`Eval queries CA:  ${expectedCaEntries.length}`)
console.log(`Eval queries ES:  ${expectedEsEntries.length}`)
console.log()

if (warnings.length > 0) {
  console.log(`--- Warnings (${warnings.length}) ---`)
  for (const w of warnings) console.log(w)
  console.log()
}

if (errors.length > 0) {
  console.log(`--- Errors (${errors.length}) ---`)
  for (const e of errors) console.log(e)
  console.log()
  console.log('VALIDATION FAILED')
  process.exit(1)
} else {
  console.log('VALIDATION PASSED')
}
