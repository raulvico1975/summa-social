/**
 * API Route: Import KB Cards
 *
 * Upload CSV/XLSX with new KB cards → validate → save to Storage.
 * NO publish (version increment is in separate route).
 *
 * Auth: SuperAdmin only.
 * @see CLAUDE.md — src/app/api/** = RISC ALT
 */

import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { getStorage } from 'firebase-admin/storage'
import { verifyIdToken, getAdminDb, validateUserMembership } from '@/lib/api/admin-sdk'
import { isAllowlistedSuperAdmin } from '@/lib/admin/superadmin-allowlist'
import { isOfficialKbTemplate, KB_IMPORT_HEADERS } from '@/lib/support/kb-import-template'
import { validateKbCards } from '@/lib/support/validate-kb-cards'
import type { KBCard } from '@/lib/support/load-kb'

type ApiResponse =
  | { ok: true; imported: number; overwritten: number }
  | { ok: false; error: string; details?: string[] }

const KB_STORAGE_PATH = 'support-kb/kb.json'

export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // --- Auth: SuperAdmin only ---
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const db = getAdminDb()
    const userDoc = await db.doc(`users/${authResult.uid}`).get()
    const orgId = userDoc.data()?.organizationId as string | undefined

    if (!orgId) {
      return NextResponse.json(
        { ok: false, error: 'Usuari sense organització assignada' },
        { status: 400 }
      )
    }

    const membership = await validateUserMembership(db, authResult.uid, orgId)
    const isSuperAdmin = await isAllowlistedSuperAdmin(authResult.uid)

    if (!isSuperAdmin) {
      return NextResponse.json(
        { ok: false, error: 'Només SuperAdmin pot importar cards' },
        { status: 403 }
      )
    }

    // --- Parse FormData ---
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ ok: false, error: 'Fitxer no trobat' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    if (!workbook.SheetNames.length) {
      return NextResponse.json({ ok: false, error: 'Fitxer sense fulls' }, { status: 400 })
    }

    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

    if (!rows.length) {
      return NextResponse.json({ ok: false, error: 'Fitxer buit' }, { status: 400 })
    }

    // --- Validate headers ---
    const headers = Object.keys(rows[0])
    if (!isOfficialKbTemplate(headers)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Headers no coincideixen amb la plantilla oficial',
          details: [`Esperats: ${KB_IMPORT_HEADERS.join(', ')}`, `Rebuts: ${headers.join(', ')}`],
        },
        { status: 400 }
      )
    }

    // --- Map rows to KBCard[] ---
    const newCards: KBCard[] = rows.map(row => ({
      id: row.id,
      type: row.type as KBCard['type'],
      domain: row.domain,
      risk: row.risk as KBCard['risk'],
      guardrail: row.guardrail as KBCard['guardrail'],
      answerMode: row.answerMode as KBCard['answerMode'],
      title: {
        ca: row.title_ca || undefined,
        es: row.title_es || undefined,
      },
      answer: {
        ca: row.answer_ca || undefined,
        es: row.answer_es || undefined,
      },
      keywords: row.keywords ? row.keywords.split(';').map(k => k.trim()).filter(Boolean) : [],
      intents: {
        ca: row.intents_ca ? row.intents_ca.split(';').map(i => i.trim()).filter(Boolean) : [],
        es: row.intents_es ? row.intents_es.split(';').map(i => i.trim()).filter(Boolean) : [],
      },
      guideId: row.guideId || null,
      uiPaths: row.uiPaths ? row.uiPaths.split(';').map(p => p.trim()).filter(Boolean) : [],
      // Fields not in import template (defaults)
      needsSnapshot: false,
      related: [],
      error_key: null,
      symptom: { ca: null, es: null },
    }))

    // --- Validate ---
    const validation = validateKbCards(newCards)
    if (!validation.valid) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validació fallada',
          details: validation.errors,
        },
        { status: 400 }
      )
    }

    // --- Merge with existing Storage KB ---
    const bucket = getStorage().bucket()
    const storageFile = bucket.file(KB_STORAGE_PATH)

    let existingCards: KBCard[] = []
    try {
      const [exists] = await storageFile.exists()
      if (exists) {
        const [data] = await storageFile.download()
        existingCards = JSON.parse(data.toString('utf-8')) as KBCard[]
      }
    } catch (e) {
      console.warn('[import] Could not load existing kb.json, starting fresh:', e)
    }

    // Merge: new cards override existing by ID
    const mergedMap = new Map<string, KBCard>()
    for (const card of existingCards) {
      mergedMap.set(card.id, card)
    }

    let overwritten = 0
    for (const card of newCards) {
      if (mergedMap.has(card.id)) {
        overwritten++
      }
      mergedMap.set(card.id, card)
    }

    const merged = Array.from(mergedMap.values())

    // --- Save to Storage ---
    await storageFile.save(JSON.stringify(merged, null, 2), {
      contentType: 'application/json',
      metadata: {
        customMetadata: {
          lastImportBy: authResult.uid,
          lastImportAt: new Date().toISOString(),
        },
      },
    })

    return NextResponse.json({
      ok: true,
      imported: newCards.length,
      overwritten,
    })
  } catch (error: unknown) {
    console.error('[API] support/bot-questions/import error:', error)
    const errorMsg = (error as Error)?.message || String(error)
    return NextResponse.json({ ok: false, error: errorMsg.substring(0, 200) }, { status: 500 })
  }
}
