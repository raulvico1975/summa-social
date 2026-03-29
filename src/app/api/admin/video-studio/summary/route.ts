import { NextRequest, NextResponse } from 'next/server'
import { isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import { buildVideoStudioSummary, type VideoStudioSummary } from '@/lib/video-studio/summary'

type ApiResponse =
  | { ok: true; summary: VideoStudioSummary }
  | { ok: false; error: string }

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const superOk = await isSuperAdmin(authResult.uid)
    if (!superOk) {
      return NextResponse.json({ ok: false, error: 'Només SuperAdmin pot veure Video Studio' }, { status: 403 })
    }

    const summary = buildVideoStudioSummary()
    return NextResponse.json({ ok: true, summary })
  } catch (error: unknown) {
    console.error('[admin/video-studio/summary] error:', error)
    const errorMsg = (error as Error)?.message || String(error)
    return NextResponse.json({ ok: false, error: errorMsg.substring(0, 200) }, { status: 500 })
  }
}
