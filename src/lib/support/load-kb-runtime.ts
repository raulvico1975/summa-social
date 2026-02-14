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

type CachedKB = {
  version: number
  cards: KBCard[]
}

let cached: CachedKB | null = null

/**
 * Load KB cards with filesystem + Storage merge.
 * Cache per version: only reload if version changes.
 *
 * @param version - Current KB version from Firestore (system/supportKb.version)
 * @returns Merged KB cards (Storage overrides filesystem by ID)
 */
export async function loadKbCards(version: number): Promise<KBCard[]> {
  // Cache hit: return if version hasn't changed
  if (cached && cached.version === version) {
    return cached.cards
  }

  // 1. Filesystem (base)
  const fsCards = await loadAllCards()

  // 2. Storage (override)
  const storageCards = await loadKbFromStorage()

  // 3. Merge: Storage overrides filesystem by ID
  const merged = mergeKbCards(fsCards, storageCards ?? [])

  // 4. Cache per version
  cached = { version, cards: merged }
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
