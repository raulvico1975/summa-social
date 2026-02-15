import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import { runKbQualityGate } from '@/lib/support/kb-quality-gate'
import { validateKbCards } from '@/lib/support/validate-kb-cards'
import {
  PROTECTED_CARD_IDS,
  deleteCard,
  loadKbStorageState,
  mergeKbCardsWithMetadata,
  publishCards,
  saveDraftCards,
  upsertCard,
  writeSupportKbDeletedIds,
  writeSupportKbDraftMetadata,
} from '@/lib/support/kb-draft-store'
import { toHumanIssues, type HumanIssue } from '@/lib/support/kb-human-errors'
import { resolveWizardCard, type WizardCardInput } from '@/lib/support/kb-wizard-mapper'

type PublishPrecheckResponse = {
  ok: boolean
  published: boolean
  version?: number
  issues: HumanIssue[]
}

type MutationPayload =
  | {
      action: 'upsert'
      input: WizardCardInput
    }
  | {
      action: 'delete'
      cardId: string
    }

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseWizardInput(value: unknown): WizardCardInput | null {
  if (!isObjectRecord(value)) return null
  if (value.mode !== 'from_unanswered' && value.mode !== 'manual') return null
  if (typeof value.questionCa !== 'string' || !value.questionCa.trim()) return null
  if (typeof value.answerCa !== 'string' || !value.answerCa.trim()) return null

  return {
    mode: value.mode,
    questionCa: value.questionCa,
    questionEs: typeof value.questionEs === 'string' ? value.questionEs : undefined,
    answerCa: value.answerCa,
    answerEs: typeof value.answerEs === 'string' ? value.answerEs : undefined,
    cardId: typeof value.cardId === 'string' ? value.cardId : undefined,
  }
}

function parseMutation(body: unknown): MutationPayload | null {
  if (!isObjectRecord(body)) return null

  if (body.action === 'upsert') {
    const input = parseWizardInput(body.input)
    if (!input) return null
    return { action: 'upsert', input }
  }

  if (body.action === 'delete') {
    if (typeof body.cardId !== 'string' || !body.cardId.trim()) return null
    return { action: 'delete', cardId: body.cardId.trim() }
  }

  return null
}

export async function POST(request: NextRequest): Promise<NextResponse<PublishPrecheckResponse>> {
  try {
    const auth = await verifyIdToken(request)
    if (!auth) {
      return NextResponse.json(
        { ok: false, published: false, issues: [{ field: 'auth', message: 'Token invàlid o absent', severity: 'error' }] },
        { status: 401 }
      )
    }

    const superOk = await isSuperAdmin(auth.uid)
    if (!superOk) {
      return NextResponse.json(
        { ok: false, published: false, issues: [{ field: 'auth', message: 'Només SuperAdmin', severity: 'error' }] },
        { status: 403 }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json(
        { ok: false, published: false, issues: [{ field: 'general', message: 'Body invàlid', severity: 'error' }] },
        { status: 400 }
      )
    }

    const mutation = parseMutation(rawBody)
    if (!mutation) {
      return NextResponse.json(
        { ok: false, published: false, issues: [{ field: 'general', message: 'Mutació invàlida', severity: 'error' }] },
        { status: 400 }
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

    let nextCards = [...merged.activeCards]
    let nextDeletedIds = [...state.settings.deletedCardIds]

    if (mutation.action === 'upsert') {
      const existingIds = new Set(merged.rows.map(row => row.card.id))
      const resolved = resolveWizardCard({
        input: mutation.input,
        existingIds,
        fallbackCardId: mutation.input.cardId,
      })

      nextCards = upsertCard(nextCards, resolved.card)
      nextDeletedIds = nextDeletedIds.filter(id => id !== resolved.card.id)
    }

    if (mutation.action === 'delete') {
      if (PROTECTED_CARD_IDS.includes(mutation.cardId as (typeof PROTECTED_CARD_IDS)[number])) {
        return NextResponse.json(
          {
            ok: false,
            published: false,
            issues: [{ field: 'cardId', message: 'Aquesta targeta és obligatòria i no es pot esborrar.', severity: 'error' }],
          },
          { status: 400 }
        )
      }

      const existing = merged.rows.find(row => row.card.id === mutation.cardId)
      if (!existing) {
        return NextResponse.json(
          {
            ok: false,
            published: false,
            issues: [{ field: 'cardId', message: 'Targeta no trobada.', severity: 'error' }],
          },
          { status: 404 }
        )
      }

      if (existing.card.type === 'fallback') {
        return NextResponse.json(
          {
            ok: false,
            published: false,
            issues: [{ field: 'cardId', message: 'Les targetes de fallback no es poden esborrar.', severity: 'error' }],
          },
          { status: 400 }
        )
      }

      nextCards = deleteCard(nextCards, mutation.cardId)
      nextDeletedIds = Array.from(new Set([...nextDeletedIds, mutation.cardId]))
    }

    await Promise.all([
      saveDraftCards(nextCards, auth.uid),
      writeSupportKbDeletedIds(db, nextDeletedIds, auth.uid),
      writeSupportKbDraftMetadata(db, { draftCardCount: nextCards.length, uid: auth.uid }),
    ])

    const structural = validateKbCards(nextCards)
    const gate = runKbQualityGate(nextCards)
    const issues = toHumanIssues({
      errors: [...structural.errors, ...gate.errors],
      warnings: [...structural.warnings, ...gate.warnings],
    })

    if (structural.errors.length > 0 || gate.errors.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          published: false,
          issues,
        },
        { status: 400 }
      )
    }

    const version = await publishCards({
      db,
      cards: nextCards,
      uid: auth.uid,
      deletedCardIds: nextDeletedIds,
      stats: {
        cards: gate.stats.cards,
        evalCa: gate.stats.evalCa,
        evalEs: gate.stats.evalEs,
        golden: gate.stats.golden,
      },
    })

    return NextResponse.json({
      ok: true,
      published: true,
      version,
      issues,
    })
  } catch (error) {
    console.error('[API] support/kb/cards/precheck-and-publish error:', error)
    return NextResponse.json(
      {
        ok: false,
        published: false,
        issues: [{ field: 'general', message: 'Error intern', severity: 'error' }],
      },
      { status: 500 }
    )
  }
}
