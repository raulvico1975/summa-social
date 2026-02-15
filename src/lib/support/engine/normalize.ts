import type { AssistantTone, InputLang } from './types'
import type { KbLang } from '../bot-retrieval'

export function normalizeLang(rawLang: unknown): { inputLang: InputLang; kbLang: KbLang } {
  const allowedLangs = ['ca', 'es', 'fr', 'pt'] as const
  const inputLang = allowedLangs.includes(rawLang as InputLang)
    ? (rawLang as InputLang)
    : 'ca'

  // KB retrieval is currently CA/ES only.
  const kbLang: KbLang = inputLang === 'es' || inputLang === 'pt' ? 'es' : 'ca'
  return { inputLang, kbLang }
}

export function normalizeAssistantTone(rawTone: unknown): AssistantTone {
  return rawTone === 'neutral' ? 'neutral' : 'warm'
}

export function parseClarifyOptionIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return Array.from(
    new Set(
      raw
        .filter(v => typeof v === 'string')
        .map(v => v.trim())
        .filter(Boolean)
    )
  ).slice(0, 3)
}

export function clampTimeout(
  rawValue: unknown,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = Number(rawValue)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.round(parsed)))
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
  })

  try {
    return await Promise.race([promise, timeoutPromise])
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}
