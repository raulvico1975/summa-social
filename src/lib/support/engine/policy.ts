import type { EngineCard, IntentType } from './types'
import type { KbLang } from '../bot-retrieval'

const OPERATIONAL_HINT_RE =
  /\b(com|como|on|donde|dónde|pujo|pujar|subir|imputo|imputar|dividir|enviar|configurar|crear|editar|esborrar|eliminar|generar|adjuntar|vincular|processar|procesar|pas\s*a\s*paso|pas\s*a\s*pas)\b/i

const PROCEDURAL_FREEFORM_RE = /\b(ves a|fes clic a|navega a|ve a|haz clic en|navega a)\b/i

const OPERATIONAL_PLACEHOLDER_RE =
  /revisa la gu[ií]a d['’]?aquest proc[eé]s dins de l['’]app|revisa la gu[ií]a de este proceso dentro de la app/i

const OFFICIAL_UI_PATH_PREFIXES = [
  'Dashboard',
  'Moviments',
  'Donants',
  'Informes',
  'Projectes',
  'Configuració',
  'Header',
  'Hub de Guies',
  'Liquidacions',
  'Pàgina de login',
  'Login',
] as const

export const SAFE_FALLBACK_PATHS: Record<KbLang, string[]> = {
  ca: ['Dashboard > ? (Hub de Guies)', 'Dashboard > Manual'],
  es: ['Dashboard > ? (Hub de Guías)', 'Dashboard > Manual'],
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

export function normalizeUiPathsAgainstCatalog(paths: string[] | null | undefined): string[] {
  if (!Array.isArray(paths)) return []
  const unique = Array.from(new Set(paths.map(path => path.trim()).filter(Boolean)))
  return unique.filter(isCatalogPath)
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
