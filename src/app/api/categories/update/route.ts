/**
 * POST /api/categories/update
 *
 * Update a single category using Admin SDK (bypass Firestore Rules).
 *
 * Scope:
 * - Only updates existing, non-archived categories
 * - Validates membership and role (admin only)
 * - Preserves archive fields from existing docs
 * - Accepts only editable fields: name, type
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// =============================================================================
// FIREBASE ADMIN INITIALIZATION
// =============================================================================

let cachedDb: Firestore | null = null;
let cachedAuth: Auth | null = null;

function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;

  if (getApps().length === 0) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('Firebase config incompleta per Admin SDK');
    }

    initializeApp({
      credential: applicationDefault(),
      projectId,
    });
  }

  cachedDb = getFirestore();
  return cachedDb;
}

function getAdminAuth(): Auth {
  if (cachedAuth) return cachedAuth;
  getAdminDb();
  cachedAuth = getAuth();
  return cachedAuth;
}

// =============================================================================
// AUTH
// =============================================================================

interface AuthResult {
  uid: string;
  email?: string;
}

async function verifyIdToken(request: NextRequest): Promise<AuthResult | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const idToken = authHeader.substring(7);
  if (!idToken) {
    return null;
  }

  try {
    const auth = getAdminAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('[categories/update] Error verifying token:', error);
    return null;
  }
}

// =============================================================================
// TYPES
// =============================================================================

interface UpdateCategoryRequest {
  orgId: string;
  categoryId: string;
  data: Record<string, any>;
}

interface UpdateCategoryResponse {
  success: boolean;
  error?: string;
  code?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

async function validateUserMembership(
  db: Firestore,
  uid: string,
  orgId: string
): Promise<{ valid: boolean; role: string | null }> {
  const memberRef = db.doc(`organizations/${orgId}/members/${uid}`);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists) {
    return { valid: false, role: null };
  }

  const data = memberSnap.data();
  return { valid: true, role: data?.role as string };
}

/** Only allow known editable fields through */
function pickEditableFields(data: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  if (data.name !== undefined) result.name = data.name;
  if (data.type !== undefined) result.type = data.type;
  return result;
}

// =============================================================================
// HANDLER
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<UpdateCategoryResponse>> {
  // 1. Auth
  const authResult = await verifyIdToken(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: 'No autenticat', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { uid } = authResult;
  const db = getAdminDb();

  // 2. Parse body
  let body: UpdateCategoryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invalid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, categoryId, data } = body;

  // 3. Validate input
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId required', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }
  if (!categoryId) {
    return NextResponse.json(
      { success: false, error: 'categoryId required', code: 'MISSING_CATEGORY_ID' },
      { status: 400 }
    );
  }
  if (!data || typeof data !== 'object') {
    return NextResponse.json(
      { success: false, error: 'data required', code: 'MISSING_DATA' },
      { status: 400 }
    );
  }

  // 4. Membership check — admin only (same as create rule)
  const membership = await validateUserMembership(db, uid, orgId);
  if (!membership.valid) {
    return NextResponse.json(
      { success: false, error: 'No ets membre d\'aquesta organitzacio', code: 'NOT_MEMBER' },
      { status: 403 }
    );
  }
  if (membership.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Només administradors poden editar categories', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 5. Read existing doc
  const docRef = db.doc(`organizations/${orgId}/categories/${categoryId}`);
  const snap = await docRef.get();
  if (!snap.exists) {
    return NextResponse.json(
      { success: false, error: 'Categoria no existeix', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const existing = snap.data() || {};

  // 6. Reject edits on archived categories
  if (existing.archivedAt) {
    return NextResponse.json(
      { success: false, error: 'No es pot editar una categoria arxivada', code: 'ARCHIVED' },
      { status: 400 }
    );
  }

  // 7. Build safe update: only editable fields + preserve archive fields
  const safeUpdate = pickEditableFields(data);

  if (Object.keys(safeUpdate).length === 0) {
    return NextResponse.json(
      { success: false, error: 'Cap camp editable proporcionat', code: 'NO_EDITABLE_FIELDS' },
      { status: 400 }
    );
  }

  // Preserve archive fields if they exist on the doc
  if (Object.prototype.hasOwnProperty.call(existing, 'archivedAt')) {
    safeUpdate.archivedAt = existing.archivedAt;
  }
  if (Object.prototype.hasOwnProperty.call(existing, 'archivedByUid')) {
    safeUpdate.archivedByUid = existing.archivedByUid;
  }
  if (Object.prototype.hasOwnProperty.call(existing, 'archivedFromAction')) {
    safeUpdate.archivedFromAction = existing.archivedFromAction;
  }

  // 8. Write with Admin SDK
  await docRef.set(safeUpdate, { merge: true });

  return NextResponse.json({ success: true });
}
