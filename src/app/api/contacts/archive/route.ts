/**
 * POST /api/contacts/archive
 *
 * Arxiva un contacte (donor/supplier/employee) si NO té cap transacció associada.
 *
 * Característiques:
 * - Només escriptura via Admin SDK (bypassant Firestore Rules)
 * - Validació de rol admin
 * - NO permet reassignació (diferent de categories/projects)
 * - Idempotent: si ja està arxivat, retorna success
 *
 * IMPORTANT: No es poden arxivar contactes amb transaccions perquè
 * el contactId és referència d'integritat per fiscalitat (Model 182, 347).
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
    console.error('[contacts/archive] Error verificant token:', error);
    return null;
  }
}

// =============================================================================
// TIPUS
// =============================================================================

interface ArchiveContactRequest {
  orgId: string;
  contactId: string;
}

interface ArchiveContactResponse {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  code?: string;
  transactionCount?: number;
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
): Promise<NextResponse<ArchiveContactResponse>> {
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
  let body: ArchiveContactRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, contactId } = body;

  // 3. Validar camps obligatoris
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  if (!contactId) {
    return NextResponse.json(
      { success: false, error: 'contactId és obligatori', code: 'MISSING_CONTACT_ID' },
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
      { success: false, error: 'Cal ser admin per arxivar contactes', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 6. Validar que el contacte existeix
  const contactRef = db.doc(`organizations/${orgId}/contacts/${contactId}`);
  const contactSnap = await contactRef.get();

  if (!contactSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Contacte no existeix', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const contactData = contactSnap.data();

  // Idempotència: si ja està arxivat, retornem success
  if (contactData?.archivedAt != null) {
    console.log(`[contacts/archive] Contacte ${contactId} ja arxivat (idempotent)`);
    return NextResponse.json({
      success: true,
      idempotent: true,
    });
  }

  // 7. Query transaccions amb contactId == <contactId>
  // IMPORTANT: Comptem TOTES les transaccions (actives i arxivades)
  // perquè volem evitar orfes a qualsevol nivell (integritat fiscal: Model 182, 347)
  const transactionsRef = db.collection(`organizations/${orgId}/transactions`);
  const contactTransactionsQuery = transactionsRef
    .where('contactId', '==', contactId);

  const transactionsSnap = await contactTransactionsQuery.get();
  const txCount = transactionsSnap.size;

  console.log(`[contacts/archive] Contacte ${contactId} (${contactData?.name || 'sense nom'}) té ${txCount} transaccions (total)`);

  // 8. Si count > 0, error
  // NOTA: NO oferim reassignació per contactes (diferent de categories)
  if (txCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Aquest contacte té ${txCount} moviments associats. No es pot arxivar.`,
        code: 'HAS_TRANSACTIONS',
        transactionCount: txCount,
      },
      { status: 400 }
    );
  }

  // 9. Arxivar el contacte
  await contactRef.update({
    archivedAt: FieldValue.serverTimestamp(),
    archivedByUid: uid,
    archivedFromAction: 'archive-contact-api',
    updatedAt: new Date().toISOString(),
  });

  const elapsed = Date.now() - startTime;
  console.log(`[contacts/archive] Contacte ${contactId} arxivat. Temps: ${elapsed}ms`);

  return NextResponse.json({
    success: true,
  });
}
