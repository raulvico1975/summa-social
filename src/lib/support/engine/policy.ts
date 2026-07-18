import type { EngineCard, IntentType } from './types'
import type { KbLang } from '../bot-retrieval'
import { CONTEXT_HELP_UI_PATHS, DEFAULT_MANUAL_UI_PATHS } from '@/help/help-manual-links'

const OPERATIONAL_HINT_RE =
  /\b(com|como|on|donde|dónde|pujo|pujar|subir|imputo|imputar|dividir|enviar|configurar|crear|editar|esborrar|eliminar|generar|adjuntar|vincular|processar|procesar|pas\s*a\s*paso|pas\s*a\s*pas)\b/i

const PROCEDURAL_FREEFORM_RE = /\b(ves a|fes clic a|navega a|ve a|haz clic en|navega a)\b/i

const OPERATIONAL_PLACEHOLDER_RE =
  /revisa la gu[ií]a d['’]?aquest proc[eé]s dins de l['’]app|revisa la gu[ií]a de este proceso dentro de la app/i

const OFFICIAL_UI_PATH_PREFIXES = [
  'Dashboard',
  'Movimientos',
  'Moviments',
  'Donantes',
  'Donants',
  'Informes',
  'Proyectos',
  'Projectes',
  'Manual',
  'Configuración',
  'Configuració',
  'Header',
  'Liquidaciones',
  'Liquidacions',
  'Página de login',
  'Pàgina de login',
  'Login',
  'Proveïdors',
  'Proveedores',
  'Treballadors',
  'Trabajadores',
  "Selector d'organització",
  'Selector de organización',
  'Ajuda contextual',
  'Ayuda contextual',
  'Hub de guies',
  'Hub de guías',
] as const

const DASHBOARD_ROUTE_UI_PATHS = [
  { prefix: '/dashboard/manual', uiPath: 'Manual' },
  { prefix: '/dashboard/movimientos', uiPath: 'Moviments' },
  { prefix: '/dashboard/donants', uiPath: 'Donants' },
  { prefix: '/dashboard/informes', uiPath: 'Informes' },
  { prefix: '/dashboard/configuracion', uiPath: 'Configuració' },
  { prefix: '/dashboard/project-module', uiPath: 'Projectes' },
  { prefix: '/dashboard/proveidors', uiPath: 'Proveïdors' },
  { prefix: '/dashboard/treballadors', uiPath: 'Treballadors' },
  { prefix: '/dashboard', uiPath: 'Dashboard' },
] as const

export const SAFE_FALLBACK_PATHS: Record<KbLang, string[]> = {
  ca: [CONTEXT_HELP_UI_PATHS.ca, DEFAULT_MANUAL_UI_PATHS.ca],
  es: [CONTEXT_HELP_UI_PATHS.es, DEFAULT_MANUAL_UI_PATHS.es],
}

export function isOperationalIntent(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  if (!normalized) return false
  return OPERATIONAL_HINT_RE.test(normalized)
}

function isCatalogPath(path: string): boolean {
  const cleaned = path.trim()
  if (!cleaned) return false
  return OFFICIAL_UI_PATH_PREFIXES.some(prefix => cleaned === prefix || cleaned.startsWith(`${prefix} > `))
}

function mapDashboardRouteToCatalogPath(path: string): string | null {
  const cleaned = path
    .trim()
    .split('?')[0]
    .split('#')[0]
    .replace(/\/+$/, '')

  if (!cleaned.startsWith('/')) return null

  const match = DASHBOARD_ROUTE_UI_PATHS.find(entry => cleaned === entry.prefix || cleaned.startsWith(`${entry.prefix}/`))
  return match?.uiPath ?? null
}

function normalizeUiPath(path: string): string {
  const mappedPath = mapDashboardRouteToCatalogPath(path)
  if (mappedPath) return mappedPath

  return path
    .trim()
    .replace(/\s*(->|→)\s*/g, ' > ')
    .replace(/\s+/g, ' ')
}

const UI_PATH_SEGMENTS: Array<[ca: string, es: string]> = [
  ['Resolució de problemes', 'Resolución de problemas'],
  ['Accions avançades', 'Acciones avanzadas'],
  ['Moviments', 'Movimientos'],
  ['Donants', 'Donantes'],
  ['Projectes', 'Proyectos'],
  ['Configuració', 'Configuración'],
  ['Liquidacions', 'Liquidaciones'],
  ['Pendents', 'Pendientes'],
  ['Proveïdors', 'Proveedores'],
  ['Treballadors', 'Trabajadores'],
  ['Comptes bancaris', 'Cuentas bancarias'],
  ['Fitxa del donant', 'Ficha del donante'],
  ['Remeses de cobrament', 'Remesas de cobro'],
  ['Detall de remesa', 'Detalle de remesa'],
  ['Desfer remesa', 'Deshacer remesa'],
  ['Assignació de despeses', 'Asignación de gastos'],
  ['Importar extracte bancari', 'Importar extracto bancario'],
  ['Selecciona projecte', 'Selecciona proyecto'],
  ['Pàgina de login', 'Página de login'],
  ["Selector d'organització", 'Selector de organización'],
  ['Ajuda contextual', 'Ayuda contextual'],
  ['Hub de guies', 'Hub de guías'],
  ['Afegir despesa', 'Añadir gasto'],
  ['Veure detall', 'Ver detalle'],
  ['Remeses', 'Remesas'],
  ['Membres', 'Miembros'],
  ['Llistat', 'Listado'],
  ['Editar', 'Editar'],
  ['Manual', 'Manual'],
  ['Informes', 'Informes'],
  ['Dashboard', 'Dashboard'],
  ['Header', 'Header'],
]

export function localizeUiPath(path: string, lang: KbLang): string {
  const normalized = normalizeUiPath(path)
  const segments = normalized.split(' > ').map(segment => segment.trim())
  return segments.map(segment => {
    const match = UI_PATH_SEGMENTS.find(([ca, es]) => segment === ca || segment === es)
    if (match) return lang === 'es' ? match[1] : match[0]

    return UI_PATH_SEGMENTS.reduce((localized, [ca, es]) => {
      const source = lang === 'es' ? ca : es
      const target = lang === 'es' ? es : ca
      return localized.split(source).join(target)
    }, segment)
  }).join(' > ')
}

export function normalizeUiPathsAgainstCatalog(
  paths: string[] | null | undefined,
  lang?: KbLang
): string[] {
  if (!Array.isArray(paths)) return []
  const unique = Array.from(new Set(paths.map(path => normalizeUiPath(path)).filter(Boolean)))
  const catalogPaths = unique.filter(isCatalogPath)
  if (!lang) return catalogPaths
  return Array.from(new Set(catalogPaths.map(path => localizeUiPath(path, lang))))
}

export function extractOperationalSteps(answer: string): string[] {
  if (!answer) return []
  return answer
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^\d+\.\s+/.test(line))
    .filter(line => !OPERATIONAL_PLACEHOLDER_RE.test(line))
}

// Required by product guardrail spec (P0)
export function canRenderOperational(card: EngineCard | null): boolean {
  return !!card && card.steps?.length > 0
}

export function containsProceduralFreeform(text: string): boolean {
  return PROCEDURAL_FREEFORM_RE.test(text)
}

export function isTrustedOperationalCard(card: EngineCard | null): boolean {
  return !!(
    card &&
    card.source === 'validated-kb' &&
    canRenderOperational(card) &&
    card.uiPathsAllowed.length > 0
  )
}

export function enforceNonProceduralIfUntrusted(answer: string, card: EngineCard | null): string {
  if (!answer) return answer
  if (isTrustedOperationalCard(card)) return answer

  const filteredLines = answer
    .split(/\r?\n/)
    .filter(line => !PROCEDURAL_FREEFORM_RE.test(line))

  const sanitized = filteredLines.join('\n').trim()
  if (sanitized) return sanitized

  return answer
}
