import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import {
  PROTECTED_CARD_IDS,
  deleteCard,
  loadKbStorageState,
  mergeKbCardsWithMetadata,
  saveDraftCards,
  writeSupportKbDeletedIds,
  writeSupportKbDraftMetadata,
} from '@/lib/support/kb-draft-store'

type ApiResponse =
  | { ok: true; deleted: true; cardId: string; draftCount: number }
  | { ok: false; error: string }

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const auth = await verifyIdToken(request)
    if (!auth) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const superOk = await isSuperAdmin(auth.uid)
    if (!superOk) {
      return NextResponse.json({ ok: false, error: 'Només SuperAdmin' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Body invàlid' }, { status: 400 })
    }

    if (!isObjectRecord(body) || typeof body.cardId !== 'string' || !body.cardId.trim()) {
      return NextResponse.json({ ok: false, error: 'cardId obligatori' }, { status: 400 })
    }

    const cardId = body.cardId.trim()

    if (PROTECTED_CARD_IDS.includes(cardId as (typeof PROTECTED_CARD_IDS)[number])) {
      return NextResponse.json({ ok: false, error: 'Aquesta targeta és obligatòria i no es pot esborrar.' }, { status: 400 })
    }

    const db = getAdminDb()
    const state = await loadKbStorageState(db)

    const merged = mergeKbCardsWithMetadata({
      baseCards: state.baseCards,
      publishedCards: state.publishedCards,
      draftCards: state.draftCards,
      deletedCardIds: state.settings.deletedCardIds,
    })

    const existing = merged.rows.find(row => row.card.id === cardId)
    if (!existing) {
      return NextResponse.json({ ok: false, error: 'Targeta no trobada' }, { status: 404 })
    }

    if (existing.card.type === 'fallback') {
      return NextResponse.json({ ok: false, error: 'Les targetes de fallback no es poden esborrar.' }, { status: 400 })
    }

    const nextDraftCards = deleteCard(merged.activeCards, cardId)
    const nextDeletedIds = Array.from(new Set([...state.settings.deletedCardIds, cardId]))

    await Promise.all([
      saveDraftCards(nextDraftCards, auth.uid),
      writeSupportKbDeletedIds(db, nextDeletedIds, auth.uid),
      writeSupportKbDraftMetadata(db, { draftCardCount: nextDraftCards.length, uid: auth.uid }),
    ])

    return NextResponse.json({
      ok: true,
      deleted: true,
      cardId,
      draftCount: nextDraftCards.length,
    })
  } catch (error) {
    console.error('[API] support/kb/cards/delete error:', error)
    return NextResponse.json({ ok: false, error: 'Error intern' }, { status: 500 })
  }
}
