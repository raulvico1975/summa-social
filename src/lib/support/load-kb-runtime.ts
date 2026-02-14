/**
 * Runtime KB Loader with versioned cache
 *
 * Loads KB cards from filesystem (base) + Storage (override).
 * Cache invalidation based on version from Firestore.
 *
 * @see src/lib/support/load-kb.ts — Filesystem loader
 */

import { getStorage } from 'firebase-admin/storage'
import type { KBCard } from './load-kb'
import { loadAllCards } from './load-kb'
import { runKbQualityGate } from './kb-quality-gate'

type CachedKB = {
  version: number
  storageVersion: number | null
  cards: KBCard[]
}

let cached: CachedKB | null = null

function buildEmergencyFallbackCards(): KBCard[] {
  const base = {
    type: 'fallback',
    domain: 'general',
    risk: 'safe',
    guardrail: 'none',
    answerMode: 'full',
    title: { ca: 'Fallback d’emergència', es: 'Fallback de emergencia' },
    intents: { ca: ['fallback'], es: ['fallback'] },
    guideId: null,
    uiPaths: ['Dashboard > ? (Hub de Guies)'],
    needsSnapshot: false,
    keywords: [],
    related: [],
    error_key: null,
    symptom: { ca: null, es: null },
  } as const satisfies Omit<KBCard, 'id' | 'answer'>

  return [
    {
      ...base,
      id: 'fallback-no-answer',
      answer: {
        ca: 'No he trobat informació exacta. Consulta el Hub de Guies (icona ?).',
        es: 'No he encontrado información exacta. Consulta el Hub de Guías (icono ?).',
      },
    },
    {
      ...base,
      id: 'fallback-fiscal-unclear',
      domain: 'fiscal',
      risk: 'guarded',
      guardrail: 'b1_fiscal',
      answerMode: 'limited',
      answer: {
        ca: 'Consulta fiscal detectada. Revisa Informes i la guia corresponent abans de continuar.',
        es: 'Consulta fiscal detectada. Revisa Informes y la guía correspondiente antes de continuar.',
      },
    },
    {
      ...base,
      id: 'fallback-sepa-unclear',
      domain: 'sepa',
      risk: 'guarded',
      guardrail: 'b1_sepa',
      answerMode: 'limited',
      answer: {
        ca: 'Consulta SEPA detectada. Revisa la guia de remeses abans de generar cap fitxer.',
        es: 'Consulta SEPA detectada. Revisa la guía de remesas antes de generar ningún fichero.',
      },
    },
    {
      ...base,
      id: 'fallback-remittances-unclear',
      domain: 'remittances',
      risk: 'guarded',
      guardrail: 'b1_remittances',
      answerMode: 'limited',
      answer: {
        ca: 'Consulta de remeses detectada. Revisa l’estat i la guia de remeses.',
        es: 'Consulta de remesas detectada. Revisa el estado y la guía de remesas.',
      },
    },
    {
      ...base,
      id: 'fallback-danger-unclear',
      domain: 'superadmin',
      risk: 'guarded',
      guardrail: 'b1_danger',
      answerMode: 'limited',
      answer: {
        ca: 'Acció sensible detectada. No facis canvis irreversibles sense revisar la guia.',
        es: 'Acción sensible detectada. No hagas cambios irreversibles sin revisar la guía.',
      },
    },
  ]
}

/**
 * Load KB cards with filesystem + Storage merge.
 * Cache per version: only reload if version changes.
 *
 * @param version - Current KB version from Firestore (system/supportKb.version)
 * @param storageVersion - Published storage version (must match version to use Storage)
 * @returns Merged KB cards (Storage published overrides filesystem by ID)
 */
export async function loadKbCards(version: number, storageVersion: number | null = null): Promise<KBCard[]> {
  // Cache hit: return if version hasn't changed
  if (cached && cached.version === version && cached.storageVersion === storageVersion) {
    return cached.cards
  }

  // 1. Filesystem (base)
  const fsCards = await loadAllCards()

  // 2. Storage (override)
  const shouldUseStoragePublished = storageVersion === version
  const storageCards = shouldUseStoragePublished ? await loadKbFromStorage() : null

  // 3. Merge: Storage overrides filesystem by ID
  const merged = mergeKbCards(fsCards, storageCards ?? [])

  // Runtime safety net:
  // if published KB is corrupt, keep serving a safe dataset instead of crashing/derailing answers.
  if (shouldUseStoragePublished && storageCards) {
    const mergedGate = runKbQualityGate(merged)
    if (!mergedGate.ok) {
      console.error('[load-kb-runtime] Published KB failed quality gate, using fallback dataset', {
        errors: mergedGate.errors.slice(0, 5),
        cards: merged.length,
      })

      const fsGate = fsCards.length > 0 ? runKbQualityGate(fsCards) : null
      if (fsGate?.ok) {
        cached = { version, storageVersion, cards: fsCards }
        return fsCards
      }

      const storageGate = storageCards.length > 0 ? runKbQualityGate(storageCards) : null
      if (storageGate?.ok) {
        cached = { version, storageVersion, cards: storageCards }
        return storageCards
      }

      const emergencyCards = buildEmergencyFallbackCards()
      cached = { version, storageVersion, cards: emergencyCards }
      return emergencyCards
    }
  }

  // 4. Cache per version
  cached = { version, storageVersion, cards: merged }
  return merged
}

/**
 * Load cards from Storage (support-kb/kb.json).
 * Returns null if file doesn't exist or error occurs.
 */
async function loadKbFromStorage(): Promise<KBCard[] | null> {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

  if (!bucketName) {
    console.warn('[load-kb-runtime] No storage bucket configured')
    return null
  }

  try {
    const bucket = getStorage().bucket(bucketName)
    const file = bucket.file('support-kb/kb.json')

    const [exists] = await file.exists()
    if (!exists) return null

    const [data] = await file.download()
    return JSON.parse(data.toString('utf-8')) as KBCard[]
  } catch (error) {
    console.warn('[load-kb-runtime] Error loading from Storage:', error)
    return null
  }
}

/**
 * Merge cards: Storage overrides filesystem by ID.
 * Order: filesystem first, then Storage (override).
 */
function mergeKbCards(fs: KBCard[], storage: KBCard[]): KBCard[] {
  const map = new Map<string, KBCard>()

  // Base: cards from filesystem
  for (const card of fs) {
    map.set(card.id, card)
  }

  // Override: cards from Storage
  for (const card of storage) {
    map.set(card.id, card)
  }

  return Array.from(map.values())
}
