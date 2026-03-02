import { NextRequest, NextResponse } from 'next/server'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { BATCH_SIZE, getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import {
  FISCAL_PENDING_REVIEW_ALERT_TYPE,
  addThirtyDays,
  isAlertExpired,
} from '@/lib/admin/admin-alerts'

type CreateAdminAlertInput = {
  orgId?: string
  type?: string
  payload?: {
    pendingCount?: number
    pendingAmountCents?: number
    year?: number
  }
}

type ApiResponse =
  | {
      ok: true
      created: boolean
      alert: {
        id: string
        type: string
        status: 'open'
        payload: {
          pendingCount: number
          pendingAmountCents: number
          year: number
        }
      }
    }
  | { ok: false; error: string }

function chunkArray<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return []
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size))
  }
  return chunks
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const superOk = await isSuperAdmin(authResult.uid)
    if (!superOk) {
      return NextResponse.json({ ok: false, error: 'Només SuperAdmin pot crear avisos' }, { status: 403 })
    }

    const body = (await request.json()) as CreateAdminAlertInput
    const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : ''
    const type = typeof body.type === 'string' ? body.type.trim() : ''
    const pendingCount = Number(body.payload?.pendingCount)
    const pendingAmountCents = Number(body.payload?.pendingAmountCents)
    const year = Number(body.payload?.year)

    if (!orgId) {
      return NextResponse.json({ ok: false, error: 'orgId obligatori' }, { status: 400 })
    }

    if (type !== FISCAL_PENDING_REVIEW_ALERT_TYPE) {
      return NextResponse.json({ ok: false, error: 'type no suportat' }, { status: 400 })
    }

    if (!Number.isFinite(pendingCount) || pendingCount < 0) {
      return NextResponse.json({ ok: false, error: 'pendingCount invàlid' }, { status: 400 })
    }

    if (!Number.isFinite(pendingAmountCents) || pendingAmountCents < 0) {
      return NextResponse.json({ ok: false, error: 'pendingAmountCents invàlid' }, { status: 400 })
    }

    if (!Number.isFinite(year) || year < 2000 || year > 2200) {
      return NextResponse.json({ ok: false, error: 'year invàlid' }, { status: 400 })
    }

    if (pendingCount < 5) {
      return NextResponse.json({ ok: false, error: 'pendingCount ha de ser >= 5 per enviar avís' }, { status: 400 })
    }

    const db = getAdminDb()

    const orgSnap = await db.doc(`organizations/${orgId}`).get()
    if (!orgSnap.exists) {
      return NextResponse.json({ ok: false, error: 'Organització no trobada' }, { status: 404 })
    }

    const now = new Date()
    const openAlertsSnap = await db
      .collection(`organizations/${orgId}/adminAlerts`)
      .where('type', '==', FISCAL_PENDING_REVIEW_ALERT_TYPE)
      .where('status', '==', 'open')
      .get()

    const expiredAlertRefs = [] as Array<ReturnType<typeof db.doc>>

    for (const doc of openAlertsSnap.docs) {
      const data = doc.data() as Record<string, unknown>
      const payload = data.payload as Record<string, unknown> | undefined
      const alertYear = Number(payload?.year)
      if (!Number.isFinite(alertYear) || alertYear !== year) continue

      if (isAlertExpired(data.expiresAt, now)) {
        expiredAlertRefs.push(doc.ref)
        continue
      }

      return NextResponse.json({
        ok: true,
        created: false,
        alert: {
          id: doc.id,
          type: FISCAL_PENDING_REVIEW_ALERT_TYPE,
          status: 'open',
          payload: {
            pendingCount,
            pendingAmountCents,
            year,
          },
        },
      })
    }

    const expiredChunks = chunkArray(expiredAlertRefs, BATCH_SIZE)
    for (const refsChunk of expiredChunks) {
      const batch = db.batch()
      for (const ref of refsChunk) {
        batch.update(ref, {
          status: 'expired',
        })
      }
      await batch.commit()
    }

    const alertRef = db.collection(`organizations/${orgId}/adminAlerts`).doc()
    await alertRef.set({
      type: FISCAL_PENDING_REVIEW_ALERT_TYPE,
      status: 'open',
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromDate(addThirtyDays(now)),
      createdByUid: authResult.uid,
      readAt: null,
      readByUid: null,
      payload: {
        pendingCount,
        pendingAmountCents,
        year,
      },
    })

    return NextResponse.json({
      ok: true,
      created: true,
      alert: {
        id: alertRef.id,
        type: FISCAL_PENDING_REVIEW_ALERT_TYPE,
        status: 'open',
        payload: {
          pendingCount,
          pendingAmountCents,
          year,
        },
      },
    })
  } catch (error: unknown) {
    console.error('[admin-alerts/create] error:', error)
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message?.slice(0, 200) ?? 'Error intern' },
      { status: 500 }
    )
  }
}
