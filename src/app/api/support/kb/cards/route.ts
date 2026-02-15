import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import {
  PROTECTED_CARD_IDS,
  loadKbStorageState,
  mergeKbCardsWithMetadata,
} from '@/lib/support/kb-draft-store'

type ApiResponse =
  | {
      ok: true
      cards: Array<{
        id: string
        titleCa: string
        titleEs: string
        questionCa: string
        questionEs: string
        answerCa: string
        answerEs: string
        domain: string
        source: 'base' | 'published' | 'draft'
        isDraftOverride: boolean
        isDeleted: boolean
        isRequiredCore: boolean
      }>
      stats: {
        total: number
        active: number
        deleted: number
      }
    }
  | { ok: false; error: string }

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const auth = await verifyIdToken(request)
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const superOk = await isSuperAdmin(auth.uid)
    if (!superOk) {
      return NextResponse.json({ ok: false, error: 'Només SuperAdmin' }, { status: 403 })
    }

    const db = getAdminDb()
    const { baseCards, publishedCards, draftCards, settings } = await loadKbStorageState(db)

    const merged = mergeKbCardsWithMetadata({
      baseCards,
      publishedCards,
      draftCards,
      deletedCardIds: settings.deletedCardIds,
    })

    const cards = merged.rows.map(row => ({
      id: row.card.id,
      titleCa: row.card.title?.ca ?? '',
      titleEs: row.card.title?.es ?? '',
      questionCa: row.card.intents?.ca?.[0] ?? row.card.title?.ca ?? '',
      questionEs: row.card.intents?.es?.[0] ?? row.card.title?.es ?? '',
      answerCa: row.card.answer?.ca ?? '',
      answerEs: row.card.answer?.es ?? '',
      domain: row.card.domain,
      source: row.source,
      isDraftOverride: row.isDraftOverride,
      isDeleted: row.isDeleted,
      isRequiredCore: row.isRequiredCore || PROTECTED_CARD_IDS.includes(row.card.id as (typeof PROTECTED_CARD_IDS)[number]),
    }))

    return NextResponse.json({
      ok: true,
      cards,
      stats: {
        total: cards.length,
        active: cards.filter(card => !card.isDeleted).length,
        deleted: cards.filter(card => card.isDeleted).length,
      },
    })
  } catch (error) {
    console.error('[API] support/kb/cards error:', error)
    return NextResponse.json({ ok: false, error: 'Error intern' }, { status: 500 })
  }
}
