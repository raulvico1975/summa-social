/**
 * POST /api/contacts/import
 *
 * Batch update contacts using Admin SDK (bypass Firestore Rules).
 *
 * Scope:
 * - Only updates existing contacts (or creates if docId missing in org)
 * - Validates membership and role (admin/user)
 * - Preserves archive fields from existing docs
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
    console.error('[contacts/import] Error verifying token:', error);
    return null;
  }
}

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

// =============================================================================
// HELPERS
// =============================================================================

interface MembershipValidation {
  valid: boolean;
  role: string | null;
}

async function validateUserMembership(
  db: Firestore,
  uid: string,
  orgId: string
): Promise<MembershipValidation> {
  const memberRef = db.doc(`organizations/${orgId}/members/${uid}`);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists) {
    return { valid: false, role: null };
  }

  const data = memberSnap.data();
  return { valid: true, role: data?.role as string };
}

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

  const { uid } = authResult;
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
  if (updates.length > 50) {
    return NextResponse.json(
      { success: false, error: 'Too many updates', code: 'TOO_MANY_UPDATES' },
      { status: 400 }
    );
  }

  // 4. Membership check
  const membership = await validateUserMembership(db, uid, orgId);
  if (!membership.valid) {
    return NextResponse.json(
      { success: false, error: 'No ets membre d\'aquesta organitzacio', code: 'NOT_MEMBER' },
      { status: 403 }
    );
  }
  if (membership.role !== 'admin' && membership.role !== 'user') {
    return NextResponse.json(
      { success: false, error: 'No tens permisos per actualitzar contactes', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 5. Apply updates
  const batch = db.batch();
  let updatedCount = 0;

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

    batch.set(docRef, data, { merge: true });
    updatedCount++;
  }

  await batch.commit();

  return NextResponse.json({ success: true, updatedCount });
}
