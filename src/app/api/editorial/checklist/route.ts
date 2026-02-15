import { FieldValue } from 'firebase-admin/firestore'
import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb, isSuperAdmin, verifyIdToken } from '@/lib/api/admin-sdk'
import { readI18nJsonWithGeneration } from '@/lib/editorial/i18n-storage-patch'
import { buildGuideCoverage } from '@/lib/editorial/guide-coverage'
import {
  buildWeeklyTasks,
  canCloseChecklistWeek,
  getIsoWeekId,
  type EditorialChecklistDecision,
  type EditorialChecklistState,
} from '@/lib/editorial/weekly-checklist'

type ChecklistResponse =
  | {
      ok: true
      state: EditorialChecklistState
      missingTaskIds?: string[]
      closed?: boolean
      saved?: boolean
    }
  | {
      ok: false
      error: string
      missingTaskIds?: string[]
    }

type ParsedAuth = { uid: string } | NextResponse<ChecklistResponse>

type ChecklistDocDecision = {
  decision: EditorialChecklistDecision
  note: string
  decidedBy: string
  decidedAtIso: string
}

type ChecklistDocData = {
  weekId: string
  status: 'open' | 'closed'
  decisions: Record<string, ChecklistDocDecision>
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

function normalizeChecklistDoc(rawData: unknown, weekId: string): ChecklistDocData {
  if (!isObjectRecord(rawData)) {
    return { weekId, status: 'open', decisions: {} }
  }

  const status = rawData.status === 'closed' ? 'closed' : 'open'
  const decisionsRaw = isObjectRecord(rawData.decisions) ? rawData.decisions : {}
  const decisions: Record<string, ChecklistDocDecision> = {}

  for (const [taskId, value] of Object.entries(decisionsRaw)) {
    if (!isObjectRecord(value)) continue
    const decision = value.decision
    if (decision !== 'done' && decision !== 'postponed' && decision !== 'discarded') continue

    decisions[taskId] = {
      decision,
      note: typeof value.note === 'string' ? value.note : '',
      decidedBy: typeof value.decidedBy === 'string' ? value.decidedBy : '',
      decidedAtIso: typeof value.decidedAtIso === 'string' ? value.decidedAtIso : '',
    }
  }

  return { weekId, status, decisions }
}

async function loadChecklistState(weekId: string): Promise<EditorialChecklistState> {
  const db = getAdminDb()

  const [ca, es, fr, pt, workflowSnap, weekSnap] = await Promise.all([
    readI18nJsonWithGeneration('ca'),
    readI18nJsonWithGeneration('es'),
    readI18nJsonWithGeneration('fr'),
    readI18nJsonWithGeneration('pt'),
    db.collection('system').doc('editorialWorkflow').collection('guides').get(),
    db.collection('system').doc('editorialChecklist').collection('weeks').doc(weekId).get(),
  ])

  const { summary: coverageSummary } = buildGuideCoverage({
    i18nByLang: {
      ca: ca.data,
      es: es.data,
      fr: fr.data,
      pt: pt.data,
    },
  })

  let translationReviewPendingCount = 0
  let guidesWithDraftCount = 0
  for (const doc of workflowSnap.docs) {
    const data = doc.data() as Record<string, unknown>
    if (data.translationReviewPending === true) translationReviewPendingCount += 1
    if (data.hasDraftContent === true || data.status === 'draft') guidesWithDraftCount += 1
  }

  const tasks = buildWeeklyTasks({
    coverage: coverageSummary,
    translationReviewPendingCount,
    guidesWithDraftCount,
    topTopics: [],
  })

  const checklistDoc = normalizeChecklistDoc(weekSnap.data(), weekId)
  const canCloseWeek = canCloseChecklistWeek({
    tasks,
    decisions: checklistDoc.decisions,
  })

  return {
    weekId,
    status: checklistDoc.status,
    tasks,
    decisions: checklistDoc.decisions,
    canCloseWeek,
  }
}

function parsePostBody(body: unknown): {
  ok: true
  action: 'decide' | 'close'
  weekId: string
  taskId?: string
  decision?: EditorialChecklistDecision
  note: string
} | {
  ok: false
  error: string
} {
  if (!isObjectRecord(body)) return { ok: false, error: 'Body invàlid' }
  const action = body.action
  if (action !== 'decide' && action !== 'close') {
    return { ok: false, error: 'action invàlida' }
  }

  const weekIdRaw = body.weekId
  const weekId = typeof weekIdRaw === 'string' && weekIdRaw.trim().length > 0 ? weekIdRaw.trim() : getIsoWeekId()
  const note = typeof body.note === 'string' ? body.note.trim() : ''

  if (action === 'close') {
    return { ok: true, action, weekId, note }
  }

  const taskId = typeof body.taskId === 'string' ? body.taskId.trim() : ''
  const decision = body.decision
  if (!taskId) return { ok: false, error: 'taskId obligatori' }
  if (decision !== 'done' && decision !== 'postponed' && decision !== 'discarded') {
    return { ok: false, error: 'decision invàlida' }
  }

  return {
    ok: true,
    action,
    weekId,
    taskId,
    decision,
    note,
  }
}

export async function GET(request: NextRequest): Promise<NextResponse<ChecklistResponse>> {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth instanceof NextResponse) return auth

    const weekId = request.nextUrl.searchParams.get('weekId')?.trim() || getIsoWeekId()
    const state = await loadChecklistState(weekId)
    return NextResponse.json({ ok: true, state })
  } catch (error) {
    console.error('[API] editorial/checklist GET error:', error)
    return NextResponse.json({ ok: false, error: 'Error intern' }, { status: 500 })
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<ChecklistResponse>> {
  try {
    const auth = await requireSuperAdmin(request)
    if (auth instanceof NextResponse) return auth

    let rawBody: unknown
    try {
      rawBody = await request.json()
    } catch {
      return NextResponse.json({ ok: false, error: 'Body invàlid' }, { status: 400 })
    }

    const parsed = parsePostBody(rawBody)
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 })
    }

    const db = getAdminDb()
    const weekRef = db.collection('system').doc('editorialChecklist').collection('weeks').doc(parsed.weekId)
    const currentState = await loadChecklistState(parsed.weekId)
    const validTaskIds = new Set(currentState.tasks.map(task => task.id))

    if (parsed.action === 'decide') {
      if (!parsed.taskId || !parsed.decision) {
        return NextResponse.json({ ok: false, error: 'taskId i decision obligatoris' }, { status: 400 })
      }
      if (!validTaskIds.has(parsed.taskId)) {
        return NextResponse.json({ ok: false, error: 'taskId fora de checklist' }, { status: 400 })
      }
      if (
        (parsed.decision === 'postponed' || parsed.decision === 'discarded') &&
        !parsed.note.trim()
      ) {
        return NextResponse.json(
          { ok: false, error: 'Cal motiu quan la tasca es marca com ajornada o descartada' },
          { status: 400 }
        )
      }

      await weekRef.set(
        {
          weekId: parsed.weekId,
          status: 'open',
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: auth.uid,
          decisions: {
            [parsed.taskId]: {
              decision: parsed.decision,
              note: parsed.note,
              decidedBy: auth.uid,
              decidedAtIso: new Date().toISOString(),
            },
          },
        },
        { merge: true }
      )

      const state = await loadChecklistState(parsed.weekId)
      return NextResponse.json({ ok: true, saved: true, state })
    }

    const missingTaskIds = currentState.tasks
      .filter(task => task.required && !currentState.decisions[task.id])
      .map(task => task.id)

    if (missingTaskIds.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'No es pot tancar la setmana sense decisió a totes les tasques',
          missingTaskIds,
        },
        { status: 400 }
      )
    }

    await weekRef.set(
      {
        weekId: parsed.weekId,
        status: 'closed',
        closedAt: FieldValue.serverTimestamp(),
        closedBy: auth.uid,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: auth.uid,
      },
      { merge: true }
    )

    const state = await loadChecklistState(parsed.weekId)
    return NextResponse.json({ ok: true, closed: true, state })
  } catch (error) {
    console.error('[API] editorial/checklist POST error:', error)
    return NextResponse.json({ ok: false, error: 'Error intern' }, { status: 500 })
  }
}
