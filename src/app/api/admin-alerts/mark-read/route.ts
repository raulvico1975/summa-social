import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isSuperAdmin, validateUserMembership, verifyIdToken } from '@/lib/api/admin-sdk'
import { isAlertExpired } from '@/lib/admin/admin-alerts'

type MarkReadInput = {
  orgId?: string
  alertId?: string
}

type ApiResponse =
  | { ok: true; status: 'read' | 'expired' }
  | { ok: false; error: string }

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const body = (await request.json()) as MarkReadInput
    const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : ''
    const alertId = typeof body.alertId === 'string' ? body.alertId.trim() : ''

    if (!orgId || !alertId) {
      return NextResponse.json({ ok: false, error: 'orgId i alertId obligatoris' }, { status: 400 })
    }

    const db = getAdminDb()
    const [superOk, membership] = await Promise.all([
      isSuperAdmin(authResult.uid),
      validateUserMembership(db, authResult.uid, orgId),
    ])

    const canMarkAsRead = superOk || (membership.valid && membership.role === 'admin')
    if (!canMarkAsRead) {
      return NextResponse.json({ ok: false, error: 'Només admin de l\'organització o SuperAdmin' }, { status: 403 })
    }

    const alertRef = db.doc(`organizations/${orgId}/adminAlerts/${alertId}`)
    const alertSnap = await alertRef.get()
    if (!alertSnap.exists) {
      return NextResponse.json({ ok: false, error: 'Avís no trobat' }, { status: 404 })
    }

    const data = alertSnap.data() as Record<string, unknown>
    const status = data.status

    if (status === 'read') {
      return NextResponse.json({ ok: true, status: 'read' })
    }

    if (status === 'expired' || isAlertExpired(data.expiresAt)) {
      await alertRef.update({ status: 'expired' })
      return NextResponse.json({ ok: true, status: 'expired' })
    }

    await alertRef.update({
      status: 'read',
      readAt: FieldValue.serverTimestamp(),
      readByUid: authResult.uid,
    })

    return NextResponse.json({ ok: true, status: 'read' })
  } catch (error: unknown) {
    console.error('[admin-alerts/mark-read] error:', error)
    return NextResponse.json(
      { ok: false, error: (error as Error)?.message?.slice(0, 200) ?? 'Error intern' },
      { status: 500 }
    )
  }
}
