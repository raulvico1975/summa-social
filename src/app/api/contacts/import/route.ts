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
import {
  getAdminDb,
  verifyIdToken,
  validateUserMembership,
  BATCH_SIZE,
} from '@/lib/api/admin-sdk';
import { requireOperationalAccess } from '@/lib/api/require-operational-access';

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
  data: Record<string, any>;
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
  dataToWrite: Record<string, any>;
}

// =============================================================================
// HELPERS
// =============================================================================

function stripArchiveFields(data: Record<string, any>): Record<string, any> {
  const { archivedAt, archivedByUid, archivedFromAction, ...rest } = data;
  return rest;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<ImportContactsResponse>> {
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
  if (accessError) return accessError;

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

    const data = stripArchiveFields(item.data);

    // Preservar camps d'arxivat existents
    const existing = snap.data() || {};
    if (Object.prototype.hasOwnProperty.call(existing, 'archivedAt')) {
      (data as any).archivedAt = (existing as any).archivedAt;
    }
    if (Object.prototype.hasOwnProperty.call(existing, 'archivedByUid')) {
      (data as any).archivedByUid = (existing as any).archivedByUid;
    }
    if (Object.prototype.hasOwnProperty.call(existing, 'archivedFromAction')) {
      (data as any).archivedFromAction = (existing as any).archivedFromAction;
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

    await batch.commit();
    updatedCount += chunk.length;
  }

  return NextResponse.json({ success: true, updatedCount });
}
