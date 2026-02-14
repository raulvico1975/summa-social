import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

type KBCard = {
  id: string
  source_faq?: string[]
  source_manual?: string[]
}

function walkJsonFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...walkJsonFiles(full))
      continue
    }
    if (entry.endsWith('.json')) out.push(full)
  }
  return out
}

function loadCards(): KBCard[] {
  const files = walkJsonFiles('docs/kb/cards')
  return files.map((file) => JSON.parse(readFileSync(file, 'utf8')) as KBCard)
}

function extractFaqQuestionIds(markdown: string): Set<string> {
  const ids = new Set<string>()
  const lines = markdown.split('\n')
  const re = /^###\s+([0-9]+(?:[a-z])?(?:[¼½¾])?)\./iu

  for (const line of lines) {
    const m = line.match(re)
    if (!m) continue
    ids.add(`Q${m[1]}`)
  }

  return ids
}

function extractManualSectionIds(markdown: string): Set<string> {
  const ids = new Set<string>()
  const lines = markdown.split('\n')
  // Exemples (headings): 1.1, 3.6, 6b.4, 10b, 12.3b, 6.a
  const headingRe = /^#{1,3}\s+([0-9]+(?:[a-z]|\.[a-z])?(?:\.[0-9]+(?:[a-z])?)?)\b/i
  // Exemples (índex): 6c. [Liquidacions ...]
  const tocAliasRe = /^\s*([0-9]+(?:[a-z])?)\.\s+\[/i

  const register = (raw: string) => {
    ids.add(raw)
    // Accepta variants amb i sense punt per casos legacy: 6.a <-> 6a
    const compact = raw.replace(/^([0-9]+)\.([a-z])$/i, '$1$2')
    ids.add(compact)
  }

  for (const line of lines) {
    const hm = line.match(headingRe)
    if (hm) register(hm[1])

    const tm = line.match(tocAliasRe)
    if (tm) register(tm[1])
  }

  return ids
}

function main() {
  const cards = loadCards()
  const faqMd = readFileSync('docs/FAQ_SUMMA_SOCIAL.md', 'utf8')
  const manualMd = readFileSync('docs/manual-usuari-summa-social.md', 'utf8')

  const faqIds = extractFaqQuestionIds(faqMd)
  const manualIds = extractManualSectionIds(manualMd)

  const errors: string[] = []
  let faqRefs = 0
  let manualRefs = 0

  for (const card of cards) {
    for (const ref of card.source_faq ?? []) {
      faqRefs++
      if (!faqIds.has(ref)) {
        errors.push(`[${card.id}] source_faq ref inexistent: ${ref}`)
      }
    }

    for (const ref of card.source_manual ?? []) {
      manualRefs++
      if (!manualIds.has(ref)) {
        errors.push(`[${card.id}] source_manual ref inexistent: ${ref}`)
      }
    }
  }

  console.log('=== KB Audit FAQ/Manual ===')
  console.log(`Cards auditades: ${cards.length}`)
  console.log(`Refs FAQ: ${faqRefs}`)
  console.log(`Refs manual: ${manualRefs}`)
  console.log(`FAQ IDs detectats: ${faqIds.size}`)
  console.log(`Manual IDs detectats: ${manualIds.size}`)

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`)
    for (const err of errors) console.log(`- ${err}`)
    process.exit(1)
  }

  console.log('\nOK: totes les referències FAQ/manual existeixen.')
}

main()
