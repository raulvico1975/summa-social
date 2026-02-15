import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import {
  applyGuidePatchByNamespace,
  readI18nJsonWithGeneration,
} from '@/lib/editorial/i18n-storage-patch'
import { mapPublishErrorToHttp, type I18nByLang, type I18nJsonByLang, writeI18nWithRollback } from '@/lib/editorial/guide-publish-flow'
import {
  buildDraftFlatPatch,
  readGuidePatchFromFlat,
  type EditorialGuidePatch,
} from '@/lib/editorial/guide-content'
import { isGuideIdInCatalog } from '@/lib/editorial/guide-catalog'

type DraftLang = 'ca' | 'es' | 'fr' | 'pt'

type DraftPatchPayload = {
  title: string
  whatHappens: string
  stepByStep: string[]
  commonErrors: string[]
  howToCheck: string[]
  whenToEscalate: string[]
  cta: string
}

type DraftResponse =
  | {
      ok: true
      guideId: string
      patchByLang: Record<DraftLang, EditorialGuidePatch>
      sourceByLang: Record<DraftLang, 'draft' | 'published' | 'empty'>
      saved?: boolean
    }
  | {
      ok: false
      error: string
      code?: 'CONCURRENT_EDIT'
    }

type ParsedAuth = { uid: string } | NextResponse<DraftResponse>

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function normalizeLoosePatch(value: unknown): EditorialGuidePatch | null {
  if (!isObjectRecord(value)) return null
  if (
    typeof value.title !== 'string' ||
    typeof value.whatHappens !== 'string' ||
    typeof value.cta !== 'string' ||
    !isStringArray(value.stepByStep) ||
    !isStringArray(value.commonErrors) ||
    !isStringArray(value.howToCheck) ||
    !isStringArray(value.whenToEscalate)
  ) {
    return null
  }

  return {
    title: value.title,
    whatHappens: value.whatHappens,
    stepByStep: value.stepByStep,
    commonErrors: value.commonErrors,
    howToCheck: value.howToCheck,
    whenToEscalate: value.whenToEscalate,
    cta: value.cta,
  }
}

function emptyPatch(): EditorialGuidePatch {
  return {
    title: '',
    whatHappens: '',
    stepByStep: [],
    commonErrors: [],
    howToCheck: [],
    whenToEscalate: [],
    cta: '',
  }
}

function hasAnyPatchContent(patch: EditorialGuidePatch): boolean {
  return (
    patch.title.trim().length > 0 ||
    patch.whatHappens.trim().length > 0 ||
    patch.cta.trim().length > 0 ||
    patch.stepByStep.some(item => item.trim().length > 0) ||
    patch.commonErrors.some(item => item.trim().length > 0) ||
    patch.howToCheck.some(item => item.trim().length > 0) ||
    patch.whenToEscalate.some(item => item.trim().length > 0)
  )
}

async function requireSuperAdmin(request: NextRequest): Promise<ParsedAuth> {
  const authResult = await verifyIdToken(request)
  if (!authResult) {
    return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
  }

  const superOk = await isSuperAdmin(authResult.uid)
  if (!superOk) {
    return NextResponse.json({ ok: false, error: 'Només SuperAdmin' }, { status: 403 })
  }

  return { uid: authResult.uid }
}

function parseDraftPayload(body: unknown): { ok: true; guideId: string; patchByLang: Record<DraftLang, EditorialGuidePatch> } | { ok: false; error: string } {
  if (!isObjectRecord(body)) return { ok: false, error: 'Body invàlid' }
  const guideId = body.guideId
  const patchByLang = body.patchByLang

  if (typeof guideId !== 'string' || !guideId.trim()) {
    return { ok: false, error: 'guideId obligatori' }
  }
  if (!isGuideIdInCatalog(guideId.trim())) {
    return { ok: false, error: 'guideId fora de catàleg' }
  }
  if (!isObjectRecord(patchByLang)) {
    return { ok: false, error: 'patchByLang obligatori' }
  }

  const ca = normalizeLoosePatch(patchByLang.ca)
  const es = normalizeLoosePatch(patchByLang.es)
  const fr = normalizeLoosePatch(patchByLang.fr)
  const pt = normalizeLoosePatch(patchByLang.pt)

  if (!ca || !es || !fr || !pt) {
    return { ok: false, error: 'patchByLang invàlid' }
  }

  return {
    ok: true,
    guideId: guideId.trim(),
    patchByLang: { ca, es, fr, pt },
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<DraftResponse>> {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth instanceof NextResponse) return auth

    const guideId = request.nextUrl.searchParams.get('guideId')?.trim() ?? ''
    if (!guideId) {
      return NextResponse.json({ ok: false, error: 'guideId obligatori' }, { status: 400 })
    }
    if (!isGuideIdInCatalog(guideId)) {
      return NextResponse.json({ ok: false, error: 'guideId fora de catàleg' }, { status: 400 })
    }

    const [ca, es, fr, pt] = await Promise.all([
      readI18nJsonWithGeneration('ca'),
      readI18nJsonWithGeneration('es'),
      readI18nJsonWithGeneration('fr'),
      readI18nJsonWithGeneration('pt'),
    ])

    const byLangData = {
      ca: ca.data,
      es: es.data,
      fr: fr.data,
      pt: pt.data,
    }

    const patchByLang: Record<DraftLang, EditorialGuidePatch> = {
      ca: emptyPatch(),
      es: emptyPatch(),
      fr: emptyPatch(),
      pt: emptyPatch(),
    }
    const sourceByLang: Record<DraftLang, 'draft' | 'published' | 'empty'> = {
      ca: 'empty',
      es: 'empty',
      fr: 'empty',
      pt: 'empty',
    }

    for (const lang of ['ca', 'es', 'fr', 'pt'] as const) {
      const draftPatch = readGuidePatchFromFlat({
        source: byLangData[lang],
        guideId,
        namespace: 'guidesDraft',
      })

      if (draftPatch) {
        patchByLang[lang] = draftPatch
        sourceByLang[lang] = 'draft'
        continue
      }

      const publishedPatch = readGuidePatchFromFlat({
        source: byLangData[lang],
        guideId,
        namespace: 'guides',
      })

      if (publishedPatch) {
        patchByLang[lang] = publishedPatch
        sourceByLang[lang] = 'published'
      }
    }

    return NextResponse.json({
      ok: true,
      guideId,
      patchByLang,
      sourceByLang,
    })
  } catch (error) {
    console.error('[API] editorial/guide/draft GET error:', error)
    return NextResponse.json({ ok: false, error: 'Error intern' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<DraftResponse>> {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth instanceof NextResponse) return auth

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Body invàlid' }, { status: 400 })
    }

    const parsed = parseDraftPayload(body)
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
    }

    const { guideId, patchByLang } = parsed

    const [ca, es, fr, pt] = await Promise.all([
      readI18nJsonWithGeneration('ca'),
      readI18nJsonWithGeneration('es'),
      readI18nJsonWithGeneration('fr'),
      readI18nJsonWithGeneration('pt'),
    ])

    const snapshots: I18nByLang = {
      ca,
      es,
      fr,
      pt,
    }

    const flatByLang = {
      ca: hasAnyPatchContent(patchByLang.ca) ? buildDraftFlatPatch({ guideId, patch: patchByLang.ca }) : {},
      es: hasAnyPatchContent(patchByLang.es) ? buildDraftFlatPatch({ guideId, patch: patchByLang.es }) : {},
      fr: hasAnyPatchContent(patchByLang.fr) ? buildDraftFlatPatch({ guideId, patch: patchByLang.fr }) : {},
      pt: hasAnyPatchContent(patchByLang.pt) ? buildDraftFlatPatch({ guideId, patch: patchByLang.pt }) : {},
    }

    const nextByLang: I18nJsonByLang = {
      ca: applyGuidePatchByNamespace({
        existingJson: snapshots.ca.data,
        guideId,
        flatPatch: flatByLang.ca,
        namespace: 'guidesDraft',
      }),
      es: applyGuidePatchByNamespace({
        existingJson: snapshots.es.data,
        guideId,
        flatPatch: flatByLang.es,
        namespace: 'guidesDraft',
      }),
      fr: applyGuidePatchByNamespace({
        existingJson: snapshots.fr.data,
        guideId,
        flatPatch: flatByLang.fr,
        namespace: 'guidesDraft',
      }),
      pt: applyGuidePatchByNamespace({
        existingJson: snapshots.pt.data,
        guideId,
        flatPatch: flatByLang.pt,
        namespace: 'guidesDraft',
      }),
    }

    await writeI18nWithRollback({
      originalByLang: snapshots,
      nextJsonByLang: nextByLang,
    })

    const db = getAdminDb()
    const workflowRef = db
      .collection('system')
      .doc('editorialWorkflow')
      .collection('guides')
      .doc(`guide-${guideId}`)

    const hasDraftContent = Object.values(patchByLang).some(hasAnyPatchContent)

    await workflowRef.set(
      {
        status: hasDraftContent ? 'draft' : 'published',
        hasDraftContent,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: auth.uid,
      },
      { merge: true }
    )

    return NextResponse.json({
      ok: true,
      saved: true,
      guideId,
      patchByLang,
      sourceByLang: {
        ca: 'draft',
        es: 'draft',
        fr: 'draft',
        pt: 'draft',
      },
    })
  } catch (error: unknown) {
    console.error('[API] editorial/guide/draft POST error:', error)
    const mapped = mapPublishErrorToHttp(error)
    if (mapped.code === 'CONCURRENT_EDIT') {
      return NextResponse.json(
        { ok: false, code: 'CONCURRENT_EDIT', error: mapped.message },
        { status: 409 }
      )
    }
    return NextResponse.json({ ok: false, error: mapped.message }, { status: mapped.status })
  }
}
