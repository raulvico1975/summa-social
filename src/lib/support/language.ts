import type { InputLang } from './engine/types'

export type SupportLanguageResolution = {
  inputLang: InputLang
  kbLang: 'ca' | 'es'
  detected: boolean
  caScore: number
  esScore: number
}

const CA_TOKENS = new Set([
  'aixo', 'aquesta', 'aquest', 'abans', 'banc', 'canviar', 'canvio', 'cobrem', 'com',
  'compte', 'dades', 'desfer', 'despesa', 'despeses', 'despres', 'dins', 'donant',
  'donants', 'em', 'encara', 'entitat', 'efectiu', 'fer', 'fitxa', 'fitxer', 'he',
  'mes', 'meu', 'meva', 'nomes', 'on', 'puc', 'pugui', 'quota', 'quotes', 'soci',
  'socis', 'surt', 'tinc', 'tocar', 'tornar', 'usuari', 'vegi', 'veure', 'vinent', 'vull',
])

const ES_TOKENS = new Set([
  'antes', 'archivo', 'banco', 'cambiar', 'cambio', 'cobrar', 'como', 'cuenta', 'cuota',
  'cuotas', 'datos', 'declarar', 'deshacer', 'despues', 'donde', 'donante', 'donantes',
  'efectivo', 'entidad', 'ficha', 'fichero', 'gasto', 'gastos', 'hacer', 'mes', 'necesito',
  'pasa', 'pagar', 'pueda', 'puedo', 'quiero', 'sale', 'socio', 'socios', 'solo', 'tengo',
  'tocar', 'usuario', 'vea', 'ver', 'viene', 'volver', 'ya',
])

const CA_PHRASES = [
  'com ho', 'com puc', 'no em surt', 'tornar enrere', 'abans d hora', 'el mes vinent',
  'nomes pugui', 'nomes veure', 'vull canviar', 'que haig de', 'que he de',
]

const ES_PHRASES = [
  'como puedo', 'no me sale', 'volver atras', 'antes de tiempo', 'el mes que viene',
  'solo pueda', 'solo ver', 'quiero cambiar', 'que tengo que', 'que debo',
]

function normalizeLanguageText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreLanguage(normalized: string, tokens: Set<string>, phrases: string[]): number {
  if (!normalized) return 0
  const words = normalized.split(' ').filter(Boolean)
  let score = 0
  for (const word of words) {
    if (tokens.has(word)) score += 1
  }
  for (const phrase of phrases) {
    if (` ${normalized} `.includes(` ${phrase} `)) score += 3
  }
  return score
}

export function resolveSupportLanguage(message: string, rawUiLang: unknown): SupportLanguageResolution {
  const fallbackInput: InputLang = rawUiLang === 'es' || rawUiLang === 'fr' || rawUiLang === 'pt'
    ? rawUiLang
    : 'ca'
  const fallbackKb: 'ca' | 'es' = fallbackInput === 'es' || fallbackInput === 'pt' ? 'es' : 'ca'
  const normalized = normalizeLanguageText(message)
  const caScore = scoreLanguage(normalized, CA_TOKENS, CA_PHRASES)
  const esScore = scoreLanguage(normalized, ES_TOKENS, ES_PHRASES)

  if (caScore === esScore || Math.max(caScore, esScore) < 2) {
    return { inputLang: fallbackInput, kbLang: fallbackKb, detected: false, caScore, esScore }
  }

  const detectedLang: InputLang = caScore > esScore ? 'ca' : 'es'
  return {
    inputLang: detectedLang,
    kbLang: detectedLang,
    detected: true,
    caScore,
    esScore,
  }
}
