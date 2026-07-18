/**
 * API Route: Support Bot Feedback
 *
 * Stores per-question helpful feedback (yes/no) for continuous KB improvement.
 * Firestore path: organizations/{orgId}/supportBotQuestions/{hash}
 *
 */

import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, validateUserMembership, verifyIdToken } from '@/lib/api/admin-sdk'
import { requireOperationalAccess } from '@/lib/api/require-operational-access'
import { createQuestionHash, deriveResponseSubtype, maskPII, normalizeForHash } from '@/lib/support/bot-question-log'
import { resolveSupportLanguage } from '@/lib/support/language'
import {
  resolveSupportOrganizationId,
  SupportOrganizationResolutionError,
} from '@/lib/support/request-context'

type ApiResponse =
  | { ok: true }
  | { ok: false; error: string }

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const body = await request.json() as {
      question?: string
      lang?: string
      helpful?: boolean
      cardId?: string
      mode?: 'card' | 'fallback'
      responseSubtype?: unknown
      organizationId?: unknown
      orgSlug?: unknown
    }

    const question = typeof body.question === 'string' ? body.question.trim() : ''
    if (!question) {
      return NextResponse.json({ ok: false, error: 'question obligatòria' }, { status: 400 })
    }

    const helpful = body.helpful === true
    const lang = resolveSupportLanguage(question, body.lang).inputLang
    const mode = body.mode === 'card' ? 'card' : 'fallback'
    const cardId = typeof body.cardId === 'string' ? body.cardId : null
    const responseSubtype = deriveResponseSubtype({
      mode,
      cardId,
      responseSubtype: body.responseSubtype,
    })

    const db = getAdminDb()

    const orgId = await resolveSupportOrganizationId({
      db,
      uid: authResult.uid,
      requestedOrganizationId: body.organizationId,
      requestedOrgSlug: body.orgSlug,
    })

    const membership = await validateUserMembership(db, authResult.uid, orgId)
    const accessDenied = requireOperationalAccess(membership)
    if (accessDenied) {
      return NextResponse.json({ ok: false, error: 'Accés denegat' }, { status: 403 })
    }

    const normalized = normalizeForHash(question)
    const hash = createQuestionHash(lang, normalized)

    const ref = db
      .collection('organizations')
      .doc(orgId)
      .collection('supportBotQuestions')
      .doc(hash)

    await ref.set(
      {
        lang,
        messageRaw: maskPII(question),
        messageNormalized: normalized,
        resultMode: mode,
        cardIdOrFallbackId: cardId,
        responseSubtype,
        helpfulYes: helpful ? FieldValue.increment(1) : FieldValue.increment(0),
        helpfulNo: helpful ? FieldValue.increment(0) : FieldValue.increment(1),
        lastFeedbackHelpful: helpful,
        lastFeedbackAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
        environment: orgId === 'qa-ong-summa' ? 'qa' : 'production',
      },
      { merge: true }
    )

    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    console.error('[API] support/bot-feedback error:', error)
    if (error instanceof SupportOrganizationResolutionError) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: error.status }
      )
    }
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message?.slice(0, 200) ?? 'Error intern' },
      { status: 500 }
    )
  }
}
