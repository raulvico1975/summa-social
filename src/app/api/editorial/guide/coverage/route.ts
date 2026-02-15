import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import { readI18nJsonWithGeneration } from '@/lib/editorial/i18n-storage-patch'
import { buildGuideCoverage } from '@/lib/editorial/guide-coverage'

type CoverageResponse =
  | {
      ok: true
      i18nVersion: number
      summary: ReturnType<typeof buildGuideCoverage>['summary']
      rows: ReturnType<typeof buildGuideCoverage>['rows']
      workflow: {
        translationReviewPendingCount: number
        draftStatusCount: number
        publishedStatusCount: number
      }
    }
  | { ok: false; error: string }

async function requireSuperAdmin(
  request: NextRequest
): Promise<{ uid: string } | NextResponse<CoverageResponse>> {
  const authResult = await verifyIdToken(request)
  if (!authResult) {
    return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
  }

  const allowed = await isSuperAdmin(authResult.uid)
  if (!allowed) {
    return NextResponse.json({ ok: false, error: 'Només SuperAdmin' }, { status: 403 })
  }

  return { uid: authResult.uid }
}

function parseVersion(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

export async function GET(request: NextRequest): Promise<NextResponse<CoverageResponse>> {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth instanceof NextResponse) return auth

    const [ca, es, fr, pt] = await Promise.all([
      readI18nJsonWithGeneration('ca'),
      readI18nJsonWithGeneration('es'),
      readI18nJsonWithGeneration('fr'),
      readI18nJsonWithGeneration('pt'),
    ])

    const { summary, rows } = buildGuideCoverage({
      i18nByLang: {
        ca: ca.data,
        es: es.data,
        fr: fr.data,
        pt: pt.data,
      },
    })

    const db = getAdminDb()
    const [i18nDoc, workflowSnap] = await Promise.all([
      db.doc('system/i18n').get(),
      db.collection('system').doc('editorialWorkflow').collection('guides').get(),
    ])

    let translationReviewPendingCount = 0
    let draftStatusCount = 0
    let publishedStatusCount = 0

    for (const workflowDoc of workflowSnap.docs) {
      const data = workflowDoc.data() as Record<string, unknown>
      if (data.translationReviewPending === true) translationReviewPendingCount += 1
      if (data.status === 'draft') draftStatusCount += 1
      if (data.status === 'published') publishedStatusCount += 1
    }

    return NextResponse.json({
      ok: true,
      i18nVersion: parseVersion(i18nDoc.data()?.version),
      summary,
      rows,
      workflow: {
        translationReviewPendingCount,
        draftStatusCount,
        publishedStatusCount,
      },
    })
  } catch (error) {
    console.error('[API] editorial/guide/coverage error:', error)
    return NextResponse.json(
      {
        ok: false,
        error: (error as Error)?.message || 'Error intern',
      },
      { status: 500 }
    )
  }
}
