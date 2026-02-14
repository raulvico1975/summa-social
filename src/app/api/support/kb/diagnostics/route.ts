/**
 * API Route: KB Diagnostics
 *
 * Returns KB runtime diagnostics (Storage existence, version, etc.)
 * Auth: SuperAdmin only (NO depèn d'org per evitar problemes multi-org)
 *
 * @see CLAUDE.md — src/app/api/** = RISC ALT
 */

import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from 'firebase-admin/storage'
import { verifyIdToken, getAdminDb } from '@/lib/api/admin-sdk'

type ApiResponse =
  | {
      ok: true
      storageExists: boolean
      version: number
      storageVersion: number | null
      aiReformatEnabled: boolean
      reformatTimeoutMs: number | null
    }
  | { ok: false; error: string }

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  try {
    // --- Auth: SuperAdmin only ---
    const authResult = await verifyIdToken(request)
    if (!authResult) {
      return NextResponse.json({ ok: false, error: 'Token invàlid o absent' }, { status: 401 })
    }

    const db = getAdminDb()

    // Criteri SuperAdmin oficial: existeix el document systemSuperAdmins/{uid}
    const superSnap = await db.doc(`systemSuperAdmins/${authResult.uid}`).get()
    if (!superSnap.exists) {
      return NextResponse.json(
        { ok: false, error: 'Només SuperAdmin pot veure diagnòstics' },
        { status: 403 }
      )
    }

    // --- Check Storage ---
    const bucketName =
      process.env.FIREBASE_STORAGE_BUCKET ||
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET

    let storageExists = false

    if (bucketName) {
      try {
        const bucket = getStorage().bucket(bucketName)
        const file = bucket.file('support-kb/kb.json')
        const [exists] = await file.exists()
        storageExists = exists
      } catch (storageError) {
        console.warn('[diagnostics] Storage check error:', storageError)
      }
    }

    // --- Get version ---
    const snap = await db.doc('system/supportKb').get()
    const version = snap.exists ? (snap.data()?.version ?? 0) : 0
    const storageVersion = snap.exists ? (snap.data()?.storageVersion ?? null) : null
    const aiReformatEnabled = snap.exists ? (snap.data()?.aiReformatEnabled !== false) : true
    const rawTimeout = snap.data()?.reformatTimeoutMs
    const reformatTimeoutMs = Number.isFinite(Number(rawTimeout)) ? Number(rawTimeout) : null

    return NextResponse.json({
      ok: true,
      storageExists,
      version,
      storageVersion,
      aiReformatEnabled,
      reformatTimeoutMs,
    })
  } catch (error: unknown) {
    console.error('[diagnostics] Unhandled error:', error)
    const errorMsg = (error as Error)?.message || String(error)
    return NextResponse.json({ ok: false, error: errorMsg.substring(0, 200) }, { status: 500 })
  }
}
