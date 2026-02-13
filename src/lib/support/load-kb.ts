/**
 * KB Loader — Summa Social Support Bot
 *
 * Loads all KB cards (fallbacks + cards/) and guide content from i18n.
 * Cached in module memory (singleton) for performance.
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

// -------------------------------------------------------------------
// Types
// -------------------------------------------------------------------

export interface KBCard {
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
  keywords: string[]
  related: string[]
  error_key: string | null
  symptom: { ca?: string | null; es?: string | null }
}

// -------------------------------------------------------------------
// Paths
// -------------------------------------------------------------------

const __filename2 = fileURLToPath(import.meta.url)
const __dirname2 = dirname(__filename2)
const KB_DIR = join(__dirname2, '..', '..', '..', 'docs', 'kb')
const CARDS_DIR = join(KB_DIR, 'cards')
const FALLBACKS_PATH = join(KB_DIR, '_fallbacks.json')
const I18N_DIR = join(__dirname2, '..', '..', 'i18n', 'locales')

// -------------------------------------------------------------------
// Cache
// -------------------------------------------------------------------

let cachedCards: KBCard[] | null = null
const cachedI18n: Record<string, Record<string, string>> = {}

// -------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------

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

function loadI18n(lang: string): Record<string, string> {
  if (cachedI18n[lang]) return cachedI18n[lang]
  try {
    const raw = JSON.parse(readFileSync(join(I18N_DIR, `${lang}.json`), 'utf-8'))
    // Flat JSON: keys are dot-separated like "guides.firstDay.title"
    cachedI18n[lang] = raw
    return raw
  } catch {
    return {}
  }
}

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

export function loadAllCards(): KBCard[] {
  if (cachedCards) return cachedCards

  const cards: KBCard[] = []

  // Fallbacks
  try {
    const fallbacks = JSON.parse(readFileSync(FALLBACKS_PATH, 'utf-8')) as KBCard[]
    cards.push(...fallbacks)
  } catch (e) {
    console.error('[load-kb] Cannot load fallbacks:', e)
  }

  // Cards from subdirectories
  try {
    const files = findJsonFiles(CARDS_DIR)
    for (const file of files) {
      try {
        const card = JSON.parse(readFileSync(file, 'utf-8')) as KBCard
        cards.push(card)
      } catch (e) {
        console.error(`[load-kb] Cannot parse ${file}:`, e)
      }
    }
  } catch (e) {
    console.error('[load-kb] Cannot read cards dir:', e)
  }

  cachedCards = cards
  return cards
}

/**
 * Builds raw guide text from i18n for a given guideId.
 * Returns structured text with title, intro, steps, avoid, costlyError.
 */
export function loadGuideContent(guideId: string, lang: string): string {
  const i18n = loadI18n(lang)
  const prefix = `guides.${guideId}`

  const title = i18n[`${prefix}.title`] || ''
  const intro = i18n[`${prefix}.intro`] || i18n[`${prefix}.whatIs`] || ''
  const summary = i18n[`${prefix}.summary`] || ''
  const cardText = i18n[`${prefix}.cardText`] || ''

  // Collect ordered steps (lookFirst, steps, doNext)
  const sections: { label: string; items: string[] }[] = []

  for (const [section, label] of [
    ['lookFirst', 'Primer pas'],
    ['steps', 'Pas a pas'],
    ['doNext', 'Després'],
  ] as const) {
    const items: string[] = []
    for (let i = 0; i < 20; i++) {
      const val = i18n[`${prefix}.${section}.${i}`]
      if (!val) break
      items.push(val)
    }
    if (items.length > 0) sections.push({ label, items })
  }

  // Avoid
  const avoidItems: string[] = []
  for (let i = 0; i < 10; i++) {
    const val = i18n[`${prefix}.avoid.${i}`]
    if (!val) break
    avoidItems.push(val)
  }

  // Costly error
  const costlyError = i18n[`${prefix}.costlyError`] || ''

  // Build text
  const parts: string[] = []
  if (title) parts.push(`# ${title}`)
  if (summary) parts.push(summary)
  if (intro) parts.push(intro)
  if (cardText) parts.push(cardText)

  for (const sec of sections) {
    parts.push(`\n**${sec.label}:**`)
    sec.items.forEach((item, i) => parts.push(`${i + 1}. ${item}`))
  }

  if (avoidItems.length > 0) {
    parts.push('\n**Evita:**')
    avoidItems.forEach(item => parts.push(`- ${item}`))
  }

  if (costlyError) {
    parts.push(`\n**Error costós:** ${costlyError}`)
  }

  return parts.join('\n')
}
