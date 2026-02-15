/**
 * API Route: Publish KB Version (with Quality Gate)
 *
 * Keeps compatibility with legacy publish button, now honoring deletedCardIds.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken, getAdminDb, isSuperAdmin } from '@/lib/api/admin-sdk'
import { runKbQualityGate } from '@/lib/support/kb-quality-gate'
import { loadKbStorageState, mergeKbCardsWithMetadata, publishCards } from '@/lib/support/kb-draft-store'

type ApiResponse =
  | {
      ok: true
      version: number
      stats: {
        cards: number
        evalCa: { total: number; passed: number; failed: number }
        evalEs: { total: number; passed: number; failed: number }
        golden: {
          total: number
          top1Hits: number
          top1Accuracy: number
          criticalTotal: number
          criticalTop1Hits: number
          criticalTop1Accuracy: number
          fallbackCount: number
          fallbackRate: number
          operationalWithoutCard: number
        }
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
        golden: {
          total: number
          top1Hits: number
          top1Accuracy: number
          criticalTotal: number
          criticalTop1Hits: number
          criticalTop1Accuracy: number
          fallbackCount: number
          fallbackRate: number
          operationalWithoutCard: number
        }
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
    const state = await loadKbStorageState(db)

    const merged = mergeKbCardsWithMetadata({
      baseCards: state.baseCards,
      publishedCards: state.publishedCards,
      draftCards: state.draftCards,
      deletedCardIds: state.settings.deletedCardIds,
    })

    const gate = runKbQualityGate(merged.activeCards)

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
            golden: gate.stats.golden,
          },
        },
        { status: 400 }
      )
    }

    const version = await publishCards({
      db,
      cards: merged.activeCards,
      uid: authResult.uid,
      deletedCardIds: state.settings.deletedCardIds,
      stats: {
        cards: gate.stats.cards,
        evalCa: gate.stats.evalCa,
        evalEs: gate.stats.evalEs,
        golden: gate.stats.golden,
      },
    })

    return NextResponse.json({
      ok: true,
      version,
      stats: {
        cards: gate.stats.cards,
        evalCa: gate.stats.evalCa,
        evalEs: gate.stats.evalEs,
        golden: gate.stats.golden,
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
