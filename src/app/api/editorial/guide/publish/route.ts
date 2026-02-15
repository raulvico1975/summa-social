import { NextRequest, NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import { runGuidePublishGate } from '@/lib/editorial/guide-publish-gate'
import {
  applyGuidePatchToI18nObject,
  readI18nJsonWithGeneration,
} from '@/lib/editorial/i18n-storage-patch'
import { buildPublishedFlatPatch } from '@/lib/editorial/guide-content'
import {
  acquirePublishLock,
  mapPublishErrorToHttp,
  releasePublishLock,
  type I18nByLang,
  type I18nJsonByLang,
  writeI18nWithRollback,
} from '@/lib/editorial/guide-publish-flow'

type GuidePatch = {
  title: string
  whatHappens: string
  stepByStep: string[]
  commonErrors: string[]
  howToCheck: string[]
  whenToEscalate: string[]
  cta: string
}

type PublishPayload = {
  guideId: string
  patchByLang: {
    ca: GuidePatch
    es: GuidePatch
    fr: GuidePatch
    pt: GuidePatch
  }
  meta?: {
    source?: 'manual' | 'auto_translate'
  }
}

type ApiResponse =
  | {
      published: true
      guideId: string
      newI18nVersion: number
      translationReviewPending: boolean
    }
  | {
      published: false
      code?: 'CONCURRENT_EDIT' | 'PUBLISH_LOCKED' | 'PARTIAL_WRITE_RECOVERY_FAILED'
      message?: string
      errors?: Array<{ field: string; rule: string; message: string }>
    }

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function isGuidePatch(value: unknown): value is GuidePatch {
  if (!isObjectRecord(value)) return false
  return (
    typeof value.title === 'string' &&
    typeof value.whatHappens === 'string' &&
    isStringArray(value.stepByStep) &&
    isStringArray(value.commonErrors) &&
    isStringArray(value.howToCheck) &&
    isStringArray(value.whenToEscalate) &&
    typeof value.cta === 'string'
  )
}

function parsePayload(body: unknown): { ok: true; value: PublishPayload } | { ok: false; message: string } {
  if (!isObjectRecord(body)) {
    return { ok: false, message: 'Body invàlid' }
  }

  const guideId = body.guideId
  const patchByLang = body.patchByLang
  const meta = body.meta

  if (typeof guideId !== 'string' || !guideId.trim()) {
    return { ok: false, message: 'guideId obligatori' }
  }

  if (!isObjectRecord(patchByLang)) {
    return { ok: false, message: 'patchByLang obligatori' }
  }

  const ca = patchByLang.ca
  const es = patchByLang.es
  const fr = patchByLang.fr
  const pt = patchByLang.pt

  if (!isGuidePatch(ca) || !isGuidePatch(es) || !isGuidePatch(fr) || !isGuidePatch(pt)) {
    return { ok: false, message: 'patchByLang ha de contenir ca/es/fr/pt vàlids' }
  }

  if (meta !== undefined) {
    if (!isObjectRecord(meta)) {
      return { ok: false, message: 'meta invàlid' }
    }
    if (meta.source !== undefined && meta.source !== 'manual' && meta.source !== 'auto_translate') {
      return { ok: false, message: 'meta.source invàlid' }
    }
  }

  return {
    ok: true,
    value: {
      guideId: guideId.trim(),
      patchByLang: { ca, es, fr, pt },
      meta: meta as PublishPayload['meta'] | undefined,
    },
  }
}

async function incrementI18nVersion(uid: string): Promise<number> {
  const db = getAdminDb()
  const i18nRef = db.doc('system/i18n')

  return db.runTransaction(async tx => {
    const snap = await tx.get(i18nRef)
    let currentVersion = 0

    if (snap.exists) {
      const rawVersion = snap.data()?.version
      if (typeof rawVersion === 'number' && Number.isFinite(rawVersion)) {
        currentVersion = rawVersion
      } else if (typeof rawVersion === 'string') {
        const parsed = Number(rawVersion)
        if (Number.isFinite(parsed)) currentVersion = parsed
      }
    }

    const nextVersion = currentVersion + 1
    tx.set(
      i18nRef,
      {
        version: nextVersion,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: uid,
      },
      { merge: true }
    )
    return nextVersion
  })
}

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  let lockAcquired = false
  let lockOwnerUid = ''

  try {
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ published: false, message: 'Token invàlid o absent' }, { status: 401 })
    }

    const superOk = await isSuperAdmin(authResult.uid)
    if (!superOk) {
      return NextResponse.json(
        { published: false, message: 'Només SuperAdmin pot publicar guies' },
        { status: 403 }
      )
    }

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ published: false, message: 'Body invàlid' }, { status: 400 })
    }

    const parsedBody = parsePayload(rawBody)
    if (!parsedBody.ok) {
      return NextResponse.json({ published: false, message: parsedBody.message }, { status: 400 })
    }

    const { guideId, patchByLang, meta } = parsedBody.value
    const translationReviewPending = meta?.source === 'auto_translate'
    lockOwnerUid = authResult.uid

    await acquirePublishLock(lockOwnerUid)
    lockAcquired = true

    const [caData, esData, frData, ptData] = await Promise.all([
      readI18nJsonWithGeneration('ca'),
      readI18nJsonWithGeneration('es'),
      readI18nJsonWithGeneration('fr'),
      readI18nJsonWithGeneration('pt'),
    ])

    const storageByLang: I18nByLang = {
      ca: caData,
      es: esData,
      fr: frData,
      pt: ptData,
    }

    const flatPatchByLang = {
      ca: buildPublishedFlatPatch({ guideId, lang: 'ca', patch: patchByLang.ca }),
      es: buildPublishedFlatPatch({ guideId, lang: 'es', patch: patchByLang.es }),
      fr: buildPublishedFlatPatch({ guideId, lang: 'fr', patch: patchByLang.fr }),
      pt: buildPublishedFlatPatch({ guideId, lang: 'pt', patch: patchByLang.pt }),
    }

    const nextJsonByLang: I18nJsonByLang = {
      ca: applyGuidePatchToI18nObject({
        existingJson: storageByLang.ca.data,
        guideId,
        flatPatch: flatPatchByLang.ca,
      }),
      es: applyGuidePatchToI18nObject({
        existingJson: storageByLang.es.data,
        guideId,
        flatPatch: flatPatchByLang.es,
      }),
      fr: applyGuidePatchToI18nObject({
        existingJson: storageByLang.fr.data,
        guideId,
        flatPatch: flatPatchByLang.fr,
      }),
      pt: applyGuidePatchToI18nObject({
        existingJson: storageByLang.pt.data,
        guideId,
        flatPatch: flatPatchByLang.pt,
      }),
    }

    const gate = runGuidePublishGate({ guideId, patchByLang })
    if (!gate.ok) {
      return NextResponse.json(
        {
          published: false,
          errors: gate.errors,
        },
        { status: 400 }
      )
    }

    await writeI18nWithRollback({
      originalByLang: storageByLang,
      nextJsonByLang,
    })

    const db = getAdminDb()
    const workflowRef = db
      .collection('system')
      .doc('editorialWorkflow')
      .collection('guides')
      .doc(`guide-${guideId}`)

    await workflowRef.set(
      {
        status: 'published',
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: authResult.uid,
        translationReviewPending,
      },
      { merge: true }
    )

    const newI18nVersion = await incrementI18nVersion(authResult.uid)

    return NextResponse.json({
      published: true,
      guideId,
      newI18nVersion,
      translationReviewPending,
    })
  } catch (error: unknown) {
    console.error('[API] editorial/guide/publish error:', error)
    const mapped = mapPublishErrorToHttp(error)

    const body: ApiResponse = mapped.code
      ? { published: false, code: mapped.code, message: mapped.message }
      : { published: false, message: mapped.message }

    return NextResponse.json(body, { status: mapped.status })
  } finally {
    if (lockAcquired) {
      try {
        await releasePublishLock(lockOwnerUid)
      } catch (releaseError) {
        console.error('[API] editorial/guide/publish release lock error:', releaseError)
      }
    }
  }
}
