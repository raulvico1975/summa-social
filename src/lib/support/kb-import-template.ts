/**
 * KB Import Template
 *
 * Official template for importing KB cards via CSV/XLSX.
 * Provides template download and header validation.
 */

import * as XLSX from 'xlsx'

// Official KB import headers (exact order required)
export const KB_IMPORT_HEADERS = [
  'id',
  'type',
  'domain',
  'risk',
  'guardrail',
  'answerMode',
  'title_ca',
  'title_es',
  'answer_ca',
  'answer_es',
  'keywords',
  'intents_ca',
  'intents_es',
  'guideId',
  'uiPaths',
] as const

/**
 * Check if the provided headers match the official KB template.
 * Headers must match exactly in order.
 */
export function isOfficialKbTemplate(headers: string[]): boolean {
  if (headers.length !== KB_IMPORT_HEADERS.length) return false
  return headers.every((h, i) => h === KB_IMPORT_HEADERS[i])
}

/**
 * Build an XLSX workbook with the official KB template.
 * Includes headers and one example row.
 */
export function buildKbTemplateWorkbook(): XLSX.WorkBook {
  const exampleRow = {
    id: 'example-card',
    type: 'regular',
    domain: 'general',
    risk: 'safe',
    guardrail: '',
    answerMode: 'full',
    title_ca: 'Exemple de targeta',
    title_es: 'Ejemplo de tarjeta',
    answer_ca: 'Aquesta és una resposta d\'exemple en català.',
    answer_es: 'Esta es una respuesta de ejemplo en español.',
    keywords: 'exemple;prova;test',
    intents_ca: 'com faig un exemple?;exemple de targeta',
    intents_es: 'cómo hago un ejemplo?;ejemplo de tarjeta',
    guideId: '',
    uiPaths: '',
  }

  const ws = XLSX.utils.json_to_sheet([exampleRow], {
    header: [...KB_IMPORT_HEADERS],
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'KB')

  return wb
}
