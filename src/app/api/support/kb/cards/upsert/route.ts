import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import {
  loadKbStorageState,
  mergeKbCardsWithMetadata,
  saveDraftCards,
  upsertCard,
  writeSupportKbDeletedIds,
  writeSupportKbDraftMetadata,
} from '@/lib/support/kb-draft-store'
import { resolveWizardCard, toHumanTopicLabel, type WizardCardInput } from '@/lib/support/kb-wizard-mapper'

type ApiResponse =
  | {
      ok: true
      cardId: string
      detected: {
        topic: string
        safetyLabel: string
      }
      draftCount: number
    }
  | { ok: false; error: string }

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parsePayload(body: unknown): { ok: true; value: WizardCardInput } | { ok: false; error: string } {
  if (!isObjectRecord(body)) return { ok: false, error: 'Body invàlid' }

  const mode = body.mode
  const questionCa = body.questionCa
  const questionEs = body.questionEs
  const answerCa = body.answerCa
  const answerEs = body.answerEs
  const cardId = body.cardId

  if (mode !== 'from_unanswered' && mode !== 'manual') {
    return { ok: false, error: 'mode invàlid' }
  }
  if (typeof questionCa !== 'string' || !questionCa.trim()) {
    return { ok: false, error: 'questionCa obligatori' }
  }
  if (typeof answerCa !== 'string' || !answerCa.trim()) {
    return { ok: false, error: 'answerCa obligatori' }
  }

  return {
    ok: true,
    value: {
      mode,
      questionCa,
      questionEs: typeof questionEs === 'string' ? questionEs : undefined,
      answerCa,
      answerEs: typeof answerEs === 'string' ? answerEs : undefined,
      cardId: typeof cardId === 'string' ? cardId : undefined,
    },
  }
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

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Body invàlid' }, { status: 400 })
    }

    const parsed = parsePayload(rawBody)
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
    }

    const db = getAdminDb()
    const state = await loadKbStorageState(db)

    const merged = mergeKbCardsWithMetadata({
      baseCards: state.baseCards,
      publishedCards: state.publishedCards,
      draftCards: state.draftCards,
      deletedCardIds: state.settings.deletedCardIds,
    })

    const existingIds = new Set(merged.rows.map(row => row.card.id))
    const resolved = resolveWizardCard({
      input: parsed.value,
      existingIds,
      fallbackCardId: parsed.value.cardId,
    })

    const nextDraftCards = upsertCard(merged.activeCards, resolved.card)
    const nextDeletedIds = state.settings.deletedCardIds.filter(id => id !== resolved.card.id)

    await Promise.all([
      saveDraftCards(nextDraftCards, auth.uid),
      writeSupportKbDeletedIds(db, nextDeletedIds, auth.uid),
      writeSupportKbDraftMetadata(db, { draftCardCount: nextDraftCards.length, uid: auth.uid }),
    ])

    return NextResponse.json({
      ok: true,
      cardId: resolved.card.id,
      detected: {
        topic: toHumanTopicLabel(resolved.detected.domain),
        safetyLabel: resolved.detected.safetyLabel,
      },
      draftCount: nextDraftCards.length,
    })
  } catch (error) {
    console.error('[API] support/kb/cards/upsert error:', error)
    return NextResponse.json({ ok: false, error: 'Error intern' }, { status: 500 })
  }
}
