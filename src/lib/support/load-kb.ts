/**
 * KB Loader — Summa Social Support Bot
 *
 * Loads all KB cards and guide content from build-bundled JSON assets.
 * Cached in module memory (singleton) for performance.
 */

import { bundledAllCards, bundledI18n } from './kb-bundle.generated'

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
// Cache
// -------------------------------------------------------------------

let cachedCards: KBCard[] | null = null
const cachedI18n: Record<string, Record<string, string>> = {}

function loadI18n(lang: string): Record<string, string> {
  if (cachedI18n[lang]) return cachedI18n[lang]
  const raw = bundledI18n[lang]
  if (!raw) return {}
  cachedI18n[lang] = raw
  return raw
}

function collectIndexedSection(
  i18n: Record<string, string>,
  prefix: string,
  section: string,
  max = 30
): string[] {
  const items: string[] = []
  for (let i = 0; i < max; i++) {
    const value = i18n[`${prefix}.${section}.${i}`]
    if (!value) break
    items.push(value.trim())
  }
  return items.filter(Boolean)
}

function uniqueItems(items: string[], max = 8): string[] {
  return Array.from(new Set(items.map(item => item.trim()).filter(Boolean))).slice(0, max)
}

function extractStepsFromCardText(cardText: string): string[] {
  if (!cardText) return []
  const normalized = cardText.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n').map(line => line.trim()).filter(Boolean)

  const stepAnchor = lines.findIndex(line => /pas a pas|paso a paso/i.test(line))
  const targetLine = stepAnchor >= 0 ? lines[stepAnchor + 1] : ''
  if (!targetLine) return []

  const steps = targetLine
    .split(/→|->|>/)
    .map(part => part.trim())
    .filter(Boolean)

  return uniqueItems(steps, 8)
}

// -------------------------------------------------------------------
// Public API
// -------------------------------------------------------------------

export function loadAllCards(): KBCard[] {
  if (cachedCards) return cachedCards
  cachedCards = bundledAllCards
  return bundledAllCards
}

/**
 * Builds raw guide text from i18n for a given guideId.
 * Returns structured text with title, intro, steps, avoid, costlyError.
 */
export function loadGuideContent(guideId: string, lang: string): string {
  const i18n = loadI18n(lang)
  const prefix = `guides.${guideId}`

  const isEs = lang === 'es'
  const title = i18n[`${prefix}.title`] || ''
  const intro = i18n[`${prefix}.intro`] || ''
  const whatIs = i18n[`${prefix}.whatIs`] || ''
  const summary = i18n[`${prefix}.summary`] || ''
  const cardText = i18n[`${prefix}.cardText`] || ''
  const costlyError = i18n[`${prefix}.costlyError`] || ''

  const lookFirst = collectIndexedSection(i18n, prefix, 'lookFirst')
  const steps = collectIndexedSection(i18n, prefix, 'steps')
  const thenItems = collectIndexedSection(i18n, prefix, 'then')
  const doNext = collectIndexedSection(i18n, prefix, 'doNext')
  const notResolved = collectIndexedSection(i18n, prefix, 'notResolved')
  const checkBeforeExport = collectIndexedSection(i18n, prefix, 'checkBeforeExport')
  const avoid = collectIndexedSection(i18n, prefix, 'avoid')
  const dontFixYet = collectIndexedSection(i18n, prefix, 'dontFixYet')
  const tips = collectIndexedSection(i18n, prefix, 'tip')

  let actionable = uniqueItems([...lookFirst, ...steps, ...thenItems, ...doNext], 6)
  if (actionable.length === 0) {
    actionable = uniqueItems(notResolved, 6)
  }
  if (actionable.length === 0) {
    actionable = extractStepsFromCardText(cardText)
  }

  let checks = uniqueItems(checkBeforeExport, 4)
  if (checks.length === 0 && notResolved.length > 0) {
    checks = uniqueItems(notResolved, 4)
  }
  if (checks.length === 0 && avoid.length > 0) {
    checks = [avoid[0]]
  }

  const cautions = uniqueItems([
    ...dontFixYet,
    ...tips,
    ...avoid,
    costlyError ? (isEs ? `Error costoso: ${costlyError}` : `Error costós: ${costlyError}`) : '',
  ], 3)

  const whatHappens = [summary, intro, whatIs, title].map(v => v.trim()).find(Boolean) || ''
  const whatLabel = isEs ? 'Qué pasa' : 'Què passa'
  const doLabel = isEs ? 'Qué hacer ahora' : 'Què fer ara'
  const checkLabel = isEs ? 'Cómo comprobarlo' : 'Com comprovar-ho'
  const cautionLabel = isEs ? 'Antes de continuar' : 'Abans de continuar'

  const parts: string[] = []
  if (whatHappens) {
    parts.push(`${whatLabel}:`)
    parts.push(whatHappens)
  }

  parts.push('')
  parts.push(`${doLabel}:`)
  if (actionable.length > 0) {
    actionable.forEach((item, i) => parts.push(`${i + 1}. ${item}`))
  } else if (cardText) {
    parts.push(cardText)
  } else {
    parts.push(isEs ? '1. Revisa la guía de este proceso dentro de la app.' : '1. Revisa la guia d’aquest procés dins de l’app.')
  }

  parts.push('')
  parts.push(`${checkLabel}:`)
  if (checks.length > 0) {
    checks.forEach(item => parts.push(`- ${item}`))
  } else {
    parts.push(isEs
      ? '- Si completas los pasos sin errores, el proceso debería quedar resuelto.'
      : '- Si completes els passos sense errors, el procés hauria de quedar resolt.')
  }

  if (cautions.length > 0) {
    parts.push('')
    parts.push(`${cautionLabel}:`)
    cautions.forEach(item => parts.push(`- ${item}`))
  }

  return parts.join('\n').trim()
}
