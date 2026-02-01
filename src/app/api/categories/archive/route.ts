/**
 * POST /api/categories/archive
 *
 * Arxiva una categoria amb reassignació opcional de transaccions.
 *
 * Característiques:
 * - Només escriptura via Admin SDK (bypassant Firestore Rules)
 * - orgId derivat de la membership de l'usuari (no del body)
 * - Validació de rol admin
 * - Reassignació atòmica amb batch (450 docs/batch)
 * - Idempotent: si ja està arxivada, retorna success
 *
 * @see CLAUDE.md secció 7 per context d'integritat
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import {
  getFirestore,
  FieldValue,
  type Firestore,
} from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Grandària dels batches per evitar límits de Firestore (500 max, usem 450 per seguretat) */
const BATCH_SIZE = 450;

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
// AUTENTICACIÓ
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
    console.error('[categories/archive] Error verificant token:', error);
    return null;
  }
}

// =============================================================================
// TIPUS
// =============================================================================

interface ArchiveCategoryRequest {
  orgId: string;
  fromCategoryId: string;
  toCategoryId?: string | null;
}

interface ArchiveCategoryResponse {
  success: boolean;
  idempotent?: boolean;
  reassignedCount?: number;
  error?: string;
  code?: string;
}

// =============================================================================
// HELPER: Validar membership de l'usuari a una org específica
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
  // Lookup directe per doc (no collectionGroup)
  const memberRef = db.doc(`organizations/${orgId}/members/${uid}`);
  const memberSnap = await memberRef.get();

  if (!memberSnap.exists) {
    return { valid: false, role: null };
  }

  const data = memberSnap.data();
  return { valid: true, role: data?.role as string };
}

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<ArchiveCategoryResponse>> {
  const startTime = Date.now();

  // 1. Autenticació
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
  let body: ArchiveCategoryRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, fromCategoryId, toCategoryId } = body;

  // 3. Validar orgId obligatori
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  if (!fromCategoryId) {
    return NextResponse.json(
      { success: false, error: 'fromCategoryId és obligatori', code: 'MISSING_FROM_ID' },
      { status: 400 }
    );
  }

  // 4. Validar membership de l'usuari a l'org especificada
  const membership = await validateUserMembership(db, uid, orgId);
  if (!membership.valid) {
    return NextResponse.json(
      { success: false, error: 'No ets membre d\'aquesta organització', code: 'NOT_MEMBER' },
      { status: 403 }
    );
  }

  // 5. Validar rol admin
  if (membership.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Cal ser admin per arxivar categories', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 6. Validar que fromCategory existeix i no està arxivada
  const fromCategoryRef = db.doc(`organizations/${orgId}/categories/${fromCategoryId}`);
  const fromCategorySnap = await fromCategoryRef.get();

  if (!fromCategorySnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Categoria origen no existeix', code: 'FROM_NOT_FOUND' },
      { status: 404 }
    );
  }

  const fromCategoryData = fromCategorySnap.data();

  // Idempotència: si ja està arxivada, retornem success
  if (fromCategoryData?.archivedAt != null) {
    console.log(`[categories/archive] Categoria ${fromCategoryId} ja arxivada (idempotent)`);
    return NextResponse.json({
      success: true,
      idempotent: true,
      reassignedCount: 0,
    });
  }

  // 6. Si hi ha toCategoryId, validar que existeix, no està arxivada, i no és la mateixa
  if (toCategoryId) {
    if (toCategoryId === fromCategoryId) {
      return NextResponse.json(
        { success: false, error: 'Categoria destí no pot ser la mateixa que origen', code: 'SAME_CATEGORY' },
        { status: 400 }
      );
    }

    const toCategoryRef = db.doc(`organizations/${orgId}/categories/${toCategoryId}`);
    const toCategorySnap = await toCategoryRef.get();

    if (!toCategorySnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Categoria destí no existeix', code: 'TO_NOT_FOUND' },
        { status: 400 }
      );
    }

    const toCategoryData = toCategorySnap.data();
    if (toCategoryData?.archivedAt != null) {
      return NextResponse.json(
        { success: false, error: 'Categoria destí està arxivada', code: 'TO_ARCHIVED' },
        { status: 400 }
      );
    }
  }

  // 7. Query real: comptar transaccions amb category == fromCategoryId i archivedAt == null
  const transactionsRef = db.collection(`organizations/${orgId}/transactions`);
  const activeTransactionsQuery = transactionsRef
    .where('category', '==', fromCategoryId)
    .where('archivedAt', '==', null);

  const activeTransactionsSnap = await activeTransactionsQuery.get();
  const activeCount = activeTransactionsSnap.size;

  console.log(`[categories/archive] Categoria ${fromCategoryId} té ${activeCount} transaccions actives`);

  // 8. Si count > 0 i no hi ha toCategoryId, error
  if (activeCount > 0 && !toCategoryId) {
    return NextResponse.json(
      {
        success: false,
        error: `Categoria té ${activeCount} moviments actius. Cal reassignar-los primer.`,
        code: 'HAS_ACTIVE_TRANSACTIONS',
      },
      { status: 400 }
    );
  }

  // 9. Si count > 0 i toCategoryId, fer batch reassign
  let reassignedCount = 0;
  if (activeCount > 0 && toCategoryId) {
    const docs = activeTransactionsSnap.docs;

    for (let i = 0; i < docs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = docs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        batch.update(doc.ref, { category: toCategoryId });
      }

      await batch.commit();
      reassignedCount += chunk.length;
      console.log(`[categories/archive] Reassignades ${reassignedCount}/${docs.length} transaccions`);
    }
  }

  // 10. Arxivar la categoria origen
  await fromCategoryRef.update({
    archivedAt: FieldValue.serverTimestamp(),
    archivedByUid: uid,
    archivedFromAction: 'archive-category-api',
  });

  const elapsed = Date.now() - startTime;
  console.log(`[categories/archive] Categoria ${fromCategoryId} arxivada. Reassignades: ${reassignedCount}. Temps: ${elapsed}ms`);

  return NextResponse.json({
    success: true,
    reassignedCount,
  });
}
