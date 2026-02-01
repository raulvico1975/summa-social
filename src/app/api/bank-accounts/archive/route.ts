/**
 * POST /api/bank-accounts/archive
 *
 * Arxiva un compte bancari si NO té cap transacció associada.
 *
 * Característiques:
 * - Només escriptura via Admin SDK (bypassant Firestore Rules)
 * - Validació de rol admin
 * - NO permet reassignació (diferent de categories/projects)
 * - Idempotent: si ja està arxivat, retorna success
 *
 * IMPORTANT: No es poden arxivar comptes amb transaccions perquè
 * el bankAccountId és referència d'integritat per conciliació.
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
    console.error('[bank-accounts/archive] Error verificant token:', error);
    return null;
  }
}

// =============================================================================
// TIPUS
// =============================================================================

interface ArchiveBankAccountRequest {
  orgId: string;
  bankAccountId: string;
}

interface ArchiveBankAccountResponse {
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
// HELPER: Comptar comptes bancaris actius
// =============================================================================

async function countActiveBankAccounts(
  db: Firestore,
  orgId: string
): Promise<number> {
  const bankAccountsRef = db.collection(`organizations/${orgId}/bankAccounts`);
  const snapshot = await bankAccountsRef.get();

  // Comptar comptes que NO estan arxivats i que estan actius
  const activeCount = snapshot.docs.filter(doc => {
    const data = doc.data();
    return data.archivedAt == null && data.isActive !== false;
  }).length;

  return activeCount;
}

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<ArchiveBankAccountResponse>> {
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
  let body: ArchiveBankAccountRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, bankAccountId } = body;

  // 3. Validar camps obligatoris
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  if (!bankAccountId) {
    return NextResponse.json(
      { success: false, error: 'bankAccountId és obligatori', code: 'MISSING_BANK_ACCOUNT_ID' },
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
      { success: false, error: 'Cal ser admin per arxivar comptes bancaris', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 6. Validar que el compte existeix
  const bankAccountRef = db.doc(`organizations/${orgId}/bankAccounts/${bankAccountId}`);
  const bankAccountSnap = await bankAccountRef.get();

  if (!bankAccountSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Compte bancari no existeix', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const bankAccountData = bankAccountSnap.data();

  // Idempotència: si ja està arxivat, retornem success
  if (bankAccountData?.archivedAt != null) {
    console.log(`[bank-accounts/archive] Compte ${bankAccountId} ja arxivat (idempotent)`);
    return NextResponse.json({
      success: true,
      idempotent: true,
    });
  }

  // 7. Guardrail: no permetre arxivar l'últim compte actiu
  const activeCount = await countActiveBankAccounts(db, orgId);
  if (activeCount <= 1) {
    return NextResponse.json(
      {
        success: false,
        error: 'No es pot arxivar l\'últim compte bancari actiu',
        code: 'LAST_ACTIVE_ACCOUNT',
      },
      { status: 400 }
    );
  }

  // 8. Query transaccions amb bankAccountId == <bankAccountId>
  // IMPORTANT: Comptem TOTES les transaccions (actives i arxivades)
  // perquè volem evitar orfes a qualsevol nivell (integritat de conciliació)
  const transactionsRef = db.collection(`organizations/${orgId}/transactions`);
  const bankAccountTransactionsQuery = transactionsRef
    .where('bankAccountId', '==', bankAccountId);

  const transactionsSnap = await bankAccountTransactionsQuery.get();
  const txCount = transactionsSnap.size;

  console.log(`[bank-accounts/archive] Compte ${bankAccountId} té ${txCount} transaccions (total)`);

  // 9. Si count > 0, error
  // NOTA: NO oferim reassignació per comptes bancaris (diferent de categories)
  if (txCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Aquest compte té ${txCount} moviments associats. No es pot arxivar.`,
        code: 'HAS_TRANSACTIONS',
        transactionCount: txCount,
      },
      { status: 400 }
    );
  }

  // 10. Arxivar el compte bancari
  await bankAccountRef.update({
    archivedAt: FieldValue.serverTimestamp(),
    archivedByUid: uid,
    archivedFromAction: 'archive-bankaccount-api',
    isActive: false, // Mantenim coherència amb el camp legacy
    updatedAt: new Date().toISOString(),
  });

  const elapsed = Date.now() - startTime;
  console.log(`[bank-accounts/archive] Compte ${bankAccountId} arxivat. Temps: ${elapsed}ms`);

  return NextResponse.json({
    success: true,
  });
}
