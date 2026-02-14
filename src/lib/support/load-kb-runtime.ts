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
