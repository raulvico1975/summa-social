/**
 * POST /api/contacts/import
 *
 * Batch update contacts using Admin SDK (bypass Firestore Rules).
 *
 * Scope:
 * - Only updates existing contacts (or creates if docId missing in org)
 * - Validates membership and role (admin/user)
 * - Preserves archive fields from existing docs
 * - Writes in chunks of BATCH_SIZE (50) for safety
 */

import { NextRequest, NextResponse } from 'next/server';
import type { DocumentReference } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import {
  getAdminDb,
  verifyIdToken,
  validateUserMembership,
  BATCH_SIZE,
} from '@/lib/api/admin-sdk';
import { requireOperationalAccess } from '@/lib/api/require-operational-access';
import { sanitizeContactImportData } from '@/lib/api/contacts-import-payload';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Límit dur per protegir contra abusos (no és batch size, és total per request) */
const MAX_UPDATES = 500;

// =============================================================================
// TYPES
// =============================================================================

interface ContactUpdate {
  docId: string;
  data: Record<string, unknown>;
}

interface ImportContactsRequest {
  orgId: string;
  updates: ContactUpdate[];
}

interface ImportContactsResponse {
  success: boolean;
  updatedCount?: number;
  error?: string;
  code?: string;
}

interface PreparedWrite {
  ref: DocumentReference;
  dataToWrite: Record<string, unknown>;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<ImportContactsResponse>> {
  const requestId = randomUUID();
  const clientBuild = request.headers.get('x-summa-client-build')?.slice(0, 80) || 'unknown';

  // 1. Auth
  const authResult = await verifyIdToken(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: 'No autenticat', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const db = getAdminDb();

  // 2. Parse body
  let body: ImportContactsRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invalid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, updates } = body;

  // 3. Validate input
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId required', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json(
      { success: false, error: 'updates required', code: 'MISSING_UPDATES' },
      { status: 400 }
    );
  }
  if (updates.length > MAX_UPDATES) {
    return NextResponse.json(
      { success: false, error: `Màxim ${MAX_UPDATES} contactes per request`, code: 'TOO_MANY_UPDATES' },
      { status: 400 }
    );
  }

  // 4. Membership + accés operatiu (admin/user)
  const membership = await validateUserMembership(db, authResult.uid, orgId);
  const accessError = requireOperationalAccess(membership);
  if (accessError) {
    accessError.headers.set('Cache-Control', 'no-store');
    accessError.headers.set('X-Summa-Request-Id', requestId);
    console.warn('[contacts/import] Access denied', {
      requestId,
      uid: authResult.uid,
      orgId,
      role: membership.role,
      validMembership: membership.valid,
      clientBuild,
    });
    return accessError;
  }

  // 5. Pre-validació: llegir tots els docs i preparar writes
  const prepared: PreparedWrite[] = [];

  for (const item of updates) {
    if (!item?.docId || !item?.data) {
      return NextResponse.json(
        { success: false, error: 'Update invalid', code: 'INVALID_UPDATE' },
        { status: 400 }
      );
    }

    const docRef = db.doc(`organizations/${orgId}/contacts/${item.docId}`);
    const snap = await docRef.get();
    if (!snap.exists) {
      return NextResponse.json(
        { success: false, error: 'Contacte no existeix', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    let data: Record<string, unknown>;
    try {
      data = sanitizeContactImportData(item.data);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Dades de contacte invàlides', code: 'INVALID_UPDATE_DATA' },
        { status: 400 }
      );
    }

    // Preservar camps d'arxivat existents
    const existing = (snap.data() || {}) as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(existing, 'archivedAt')) {
      data.archivedAt = existing.archivedAt;
    }
    if (Object.prototype.hasOwnProperty.call(existing, 'archivedByUid')) {
      data.archivedByUid = existing.archivedByUid;
    }
    if (Object.prototype.hasOwnProperty.call(existing, 'archivedFromAction')) {
      data.archivedFromAction = existing.archivedFromAction;
    }

    prepared.push({ ref: docRef, dataToWrite: data });
  }

  // 6. Writes en chunks de BATCH_SIZE (50)
  let updatedCount = 0;
  for (let i = 0; i < prepared.length; i += BATCH_SIZE) {
    const chunk = prepared.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const item of chunk) {
      batch.set(item.ref, item.dataToWrite, { merge: true });
    }

    try {
      await batch.commit();
    } catch (error) {
      console.error('[contacts/import] Error writing contacts batch', {
        requestId,
        uid: authResult.uid,
        orgId,
        role: membership.role,
        clientBuild,
        error,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'No s’han pogut guardar els canvis del contacte. Torna-ho a provar i, si es repeteix, avisa suport.',
          code: 'WRITE_FAILED',
        },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
            'X-Summa-Request-Id': requestId,
          },
        }
      );
    }
    updatedCount += chunk.length;
  }

  return NextResponse.json(
    { success: true, updatedCount },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Summa-Request-Id': requestId,
      },
    }
  );
}
