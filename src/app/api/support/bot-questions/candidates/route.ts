import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken, getAdminDb, validateUserMembership } from '@/lib/api/admin-sdk'
import { requireOperationalAccess } from '@/lib/api/require-operational-access'
import { inferQuestionDomain, suggestKeywordsFromMessage } from '@/lib/support/bot-retrieval'

type ApiResponse =
  | {
      ok: true
      items: Array<{
        question: string
        lang: string
        count: number
        lastSeen: string
        suggestedDomain: string
        suggestedKeywords: string[]
      }>
    }
  | { ok: false; error: string }

function toPositiveInt(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const db = getAdminDb()
    const userDoc = await db.doc(`users/${authResult.uid}`).get()
    const orgId = userDoc.data()?.organizationId as string | undefined

    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'Usuari sense organització assignada' }, { status: 400 })
    }

    const membership = await validateUserMembership(db, authResult.uid, orgId)
    const denied = requireOperationalAccess(membership)
    if (denied) {
      return NextResponse.json({ ok: false, error: 'Accés denegat' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = toPositiveInt(searchParams.get('days'), 30, 1, 365)
    const limit = toPositiveInt(searchParams.get('limit'), 50, 1, 500)

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)

    const snap = await db
      .collection(`organizations/${orgId}/supportBotQuestions`)
      .where('resultMode', '==', 'fallback')
      .where('lastSeenAt', '>=', cutoff)
      .orderBy('lastSeenAt', 'desc')
      .limit(limit)
      .get()

    const items = snap.docs
      .map(doc => doc.data() as Record<string, unknown>)
      .map(item => {
        const question = String(item.messageRaw ?? '')
        const lastSeenDate = item.lastSeenAt && typeof (item.lastSeenAt as { toDate?: () => Date }).toDate === 'function'
          ? (item.lastSeenAt as { toDate: () => Date }).toDate()
          : null

        return {
          question,
          lang: String(item.lang ?? 'ca'),
          count: Number(item.count ?? 0),
          lastSeen: lastSeenDate ? lastSeenDate.toISOString() : '',
          suggestedDomain: inferQuestionDomain(question),
          suggestedKeywords: suggestKeywordsFromMessage(question, 6),
        }
      })
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({ ok: true, items })
  } catch (error) {
    console.error('[API] support/bot-questions/candidates error:', error)
    return NextResponse.json({ ok: false, error: 'Error intern' }, { status: 500 })
  }
}
