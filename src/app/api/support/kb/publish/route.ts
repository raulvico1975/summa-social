/**
 * API Route: Publish KB Version (with Quality Gate)
 *
 * Runs structural + retrieval quality checks before incrementing
 * system/supportKb.version.
 *
 * Auth: SuperAdmin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from 'firebase-admin/storage'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyIdToken, getAdminDb, isSuperAdmin } from '@/lib/api/admin-sdk'
import { loadAllCards, type KBCard } from '@/lib/support/load-kb'
import { runKbQualityGate } from '@/lib/support/kb-quality-gate'

const KB_STORAGE_PATH = 'support-kb/kb.json'

type ApiResponse =
  | {
      ok: true
      version: number
      stats: {
        cards: number
        evalCa: { total: number; passed: number; failed: number }
        evalEs: { total: number; passed: number; failed: number }
      }
      warnings: string[]
    }
  | {
      ok: false
      error: string
      details?: string[]
      stats?: {
        cards: number
        evalCa: { total: number; passed: number; failed: number }
        evalEs: { total: number; passed: number; failed: number }
      }
    }

function mergeKbCards(fsCards: KBCard[], storageCards: KBCard[]): KBCard[] {
  const map = new Map<string, KBCard>()
  for (const card of fsCards) map.set(card.id, card)
  for (const card of storageCards) map.set(card.id, card)
  return Array.from(map.values())
}

async function loadKbFromStorage(): Promise<KBCard[]> {
  const bucketName =
    process.env.FIREBASE_STORAGE_BUCKET ||
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

  if (!bucketName) return []

  try {
    const bucket = getStorage().bucket(bucketName)
    const file = bucket.file(KB_STORAGE_PATH)
    const [exists] = await file.exists()
    if (!exists) return []

    const [data] = await file.download()
    const parsed = JSON.parse(data.toString('utf-8'))
    return Array.isArray(parsed) ? (parsed as KBCard[]) : []
  } catch (error) {
    console.warn('[kb-publish] Storage draft load error:', error)
    return []
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const superOk = await isSuperAdmin(authResult.uid)
    if (!superOk) {
      return NextResponse.json(
        { ok: false, error: 'Només SuperAdmin pot publicar la KB' },
        { status: 403 }
      )
    }

    const db = getAdminDb()
    const fsCards = loadAllCards()
    const storageCards = await loadKbFromStorage()
    const mergedCards = mergeKbCards(fsCards, storageCards)

    const gate = runKbQualityGate(mergedCards)

    if (!gate.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Quality Gate fallat. Revisa i corregeix abans de publicar.',
          details: gate.errors.slice(0, 20),
          stats: {
            cards: gate.stats.cards,
            evalCa: gate.stats.evalCa,
            evalEs: gate.stats.evalEs,
          },
        },
        { status: 400 }
      )
    }

    const supportKbRef = db.doc('system/supportKb')
    const currentSnap = await supportKbRef.get()
    const currentVersion = currentSnap.exists ? (currentSnap.data()?.version ?? 0) : 0
    const nextVersion = currentVersion + 1

    await supportKbRef.set(
      {
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: authResult.uid,
        lastQualityGateAt: FieldValue.serverTimestamp(),
        lastQualityGateBy: authResult.uid,
        lastQualityGateStats: {
          cards: gate.stats.cards,
          evalCa: gate.stats.evalCa,
          evalEs: gate.stats.evalEs,
        },
      },
      { merge: true }
    )

    return NextResponse.json({
      ok: true,
      version: nextVersion,
      stats: {
        cards: gate.stats.cards,
        evalCa: gate.stats.evalCa,
        evalEs: gate.stats.evalEs,
      },
      warnings: gate.warnings.slice(0, 10),
    })
  } catch (error: unknown) {
    console.error('[API] support/kb/publish error:', error)
    const errorMsg = (error as Error)?.message || String(error)
    return NextResponse.json(
      { ok: false, error: errorMsg.substring(0, 200) },
      { status: 500 }
    )
  }
}
