import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken, getAdminDb, isSuperAdmin } from '@/lib/api/admin-sdk'
import { buildAdminControlTowerSummary, type AdminControlTowerSummary } from '@/lib/admin/control-tower-summary'

type ApiResponse =
  | { ok: true; summary: AdminControlTowerSummary }
  | { ok: false; error: string }

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const superOk = await isSuperAdmin(authResult.uid)
    if (!superOk) {
      return NextResponse.json({ ok: false, error: 'Només SuperAdmin pot veure el resum' }, { status: 403 })
    }

    const db = getAdminDb()
    const summary = await buildAdminControlTowerSummary(db)

    return NextResponse.json({ ok: true, summary })
  } catch (error: unknown) {
    console.error('[control-tower/summary] error:', error)
    const errorMsg = (error as Error)?.message || String(error)
    return NextResponse.json({ ok: false, error: errorMsg.substring(0, 200) }, { status: 500 })
  }
}
