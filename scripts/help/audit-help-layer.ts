import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractToc } from '../../src/lib/help/manual-toc'
import { loadAllCards } from '../../src/lib/support/load-kb'
import { MANUAL_HINT_ANCHORS, ROUTE_MANUAL_ANCHORS } from '../../src/help/help-manual-links'

function readManual(locale: 'ca' | 'es' | 'fr'): string {
  return readFileSync(resolve(process.cwd(), 'public/docs', `manual-usuari-summa-social.${locale}.md`), 'utf8')
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function main(): Promise<void> {
  const manualCa = readManual('ca')
  const manualEs = readManual('es')
  const manualFr = readManual('fr')
  const caAnchorSet = new Set(extractToc(manualCa).map((entry) => entry.id))
  const cards = loadAllCards()

  const routeRows = ROUTE_MANUAL_ANCHORS.map((entry) => ({
    routePrefix: entry.routePrefix,
    anchor: entry.anchor,
    exists: caAnchorSet.has(entry.anchor),
  }))

  const hintRows = MANUAL_HINT_ANCHORS.map((entry) => ({
    anchor: entry.anchor,
    exists: caAnchorSet.has(entry.anchor),
    patterns: entry.patterns.join(' | '),
  }))

  const legacyGuideCards = cards
    .filter((card) =>
      (card.uiPaths ?? []).some((path) => {
        const normalizedPath = normalize(path)
        return normalizedPath.includes('hub de guies') || normalizedPath.includes('hub de guias') || normalizedPath.includes('/guides')
      })
    )
    .map((card) => ({
      id: card.id,
      uiPaths: (card.uiPaths ?? []).join(' · '),
    }))

  const localeSummary = [
    { locale: 'ca', toc: extractToc(manualCa).length, bytes: Buffer.byteLength(manualCa, 'utf8') },
    { locale: 'es', toc: extractToc(manualEs).length, bytes: Buffer.byteLength(manualEs, 'utf8') },
    { locale: 'fr', toc: extractToc(manualFr).length, bytes: Buffer.byteLength(manualFr, 'utf8') },
  ]

  const outPath = resolve(process.cwd(), 'help/audit-report.md')
  const output: string[] = []

  output.push('# Audit capa Help')
  output.push('')
  output.push(`- Data: ${new Date().toISOString()}`)
  output.push(`- Anchors auditats (rutes): ${routeRows.length}`)
  output.push(`- Anchors auditats (hints bot/manual): ${hintRows.length}`)
  output.push(`- Cards amb referències legacy a guides/hub: ${legacyGuideCards.length}`)
  output.push('')

  output.push('## Manual públic per idioma')
  output.push('')
  output.push('| Idioma | Entrades TOC | Mida (bytes) | Observació |')
  output.push('|---|---:|---:|---|')
  for (const row of localeSummary) {
    const observation = row.locale === 'ca'
      ? 'Base principal'
      : row.toc < 8
        ? 'Manual resumit: runtime ha de fer fallback a CA'
        : 'Manual amb estructura suficient'
    output.push(`| ${row.locale} | ${row.toc} | ${row.bytes} | ${observation} |`)
  }

  output.push('')
  output.push('## Rutes HelpSheet -> Manual')
  output.push('')
  output.push('| Prefix de ruta | Anchor manual | Existeix a manual CA |')
  output.push('|---|---|---|')
  for (const row of routeRows) {
    output.push(`| ${row.routePrefix} | ${row.anchor} | ${row.exists ? 'SI' : 'NO'} |`)
  }

  output.push('')
  output.push('## Hints de navegació del bot -> Manual')
  output.push('')
  output.push('| Anchor manual | Existeix a manual CA | Patrons |')
  output.push('|---|---|---|')
  for (const row of hintRows) {
    output.push(`| ${row.anchor} | ${row.exists ? 'SI' : 'NO'} | ${row.patterns} |`)
  }

  output.push('')
  output.push('## Referències legacy a guides/hub dins la KB')
  output.push('')
  if (legacyGuideCards.length === 0) {
    output.push('- Cap.')
  } else {
    output.push('| Card ID | UI paths |')
    output.push('|---|---|')
    for (const row of legacyGuideCards) {
      output.push(`| ${row.id} | ${row.uiPaths} |`)
    }
  }

  writeFileSync(outPath, `${output.join('\n')}\n`, 'utf8')

  console.log(`[help:audit] Report generated: ${outPath}`)
  console.log(`[help:audit] Broken route anchors: ${routeRows.filter((row) => !row.exists).length}`)
  console.log(`[help:audit] Broken hint anchors: ${hintRows.filter((row) => !row.exists).length}`)
  console.log(`[help:audit] Legacy guide references: ${legacyGuideCards.length}`)
}

main().catch((error) => {
  console.error('[help:audit] Unexpected error:', error)
  process.exit(1)
})
