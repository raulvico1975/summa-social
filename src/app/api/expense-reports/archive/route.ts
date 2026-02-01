/**
 * POST /api/expense-reports/archive
 *
 * Arxiva una liquidació (ExpenseReport) si NO té tiquets pendents assignats.
 *
 * Característiques:
 * - Només escriptura via Admin SDK (bypassant Firestore Rules)
 * - Validació de rol admin o user
 * - NO permet arxivar si té tiquets pendents (status !== 'matched')
 * - NO permet arxivar si ja està conciliada (status === 'matched')
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
    console.error('[expense-reports/archive] Error verificant token:', error);
    return null;
  }
}

// =============================================================================
// TIPUS
// =============================================================================

interface ArchiveExpenseReportRequest {
  orgId: string;
  reportId: string;
  dryRun?: boolean;  // Si true, només compta tiquets sense arxivar
}

interface ArchiveExpenseReportResponse {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  code?: string;
  pendingCount?: number;
  matchedCount?: number;
  canArchive?: boolean;
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
): Promise<NextResponse<ArchiveExpenseReportResponse>> {
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
  let body: ArchiveExpenseReportRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, reportId } = body;

  // 3. Validar camps obligatoris
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  if (!reportId) {
    return NextResponse.json(
      { success: false, error: 'reportId és obligatori', code: 'MISSING_REPORT_ID' },
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

  // 5. Validar rol admin o user
  if (membership.role !== 'admin' && membership.role !== 'user') {
    return NextResponse.json(
      { success: false, error: 'Cal ser admin o user per arxivar liquidacions', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 6. Validar que la liquidació existeix
  const reportRef = db.doc(`organizations/${orgId}/expenseReports/${reportId}`);
  const reportSnap = await reportRef.get();

  if (!reportSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Liquidació no existeix', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const reportData = reportSnap.data();

  // Idempotència: si ja està arxivada, retornem success
  if (reportData?.status === 'archived') {
    console.log(`[expense-reports/archive] Liquidació ${reportId} ja arxivada (idempotent)`);
    return NextResponse.json({
      success: true,
      idempotent: true,
    });
  }

  // 7. Bloquejar si la liquidació està conciliada (matched)
  if (reportData?.status === 'matched') {
    return NextResponse.json(
      {
        success: false,
        error: 'Una liquidació conciliada no es pot arxivar.',
        code: 'IS_MATCHED',
      },
      { status: 400 }
    );
  }

  // 8. Query tiquets assignats a aquesta liquidació
  const pendingDocsRef = db.collection(`organizations/${orgId}/pendingDocuments`);
  const assignedTicketsQuery = pendingDocsRef
    .where('reportId', '==', reportId);

  const assignedTicketsSnap = await assignedTicketsQuery.get();

  // Separar tiquets pendents vs conciliats
  let pendingCount = 0;
  let matchedCount = 0;
  for (const doc of assignedTicketsSnap.docs) {
    const data = doc.data();
    if (data.status === 'matched') {
      matchedCount++;
    } else {
      pendingCount++;
    }
  }

  console.log(`[expense-reports/archive] Liquidació ${reportId} té ${pendingCount} tiquets pendents + ${matchedCount} conciliats${body.dryRun ? ' [dryRun]' : ''}`);

  // 9. Mode dryRun: només retornem el comptatge sense arxivar
  if (body.dryRun) {
    if (pendingCount > 0) {
      return NextResponse.json({
        success: false,
        code: 'HAS_PENDING_TICKETS',
        pendingCount,
        matchedCount,
        canArchive: false,
      });
    }
    return NextResponse.json({
      success: true,
      code: 'OK_TO_ARCHIVE',
      pendingCount: 0,
      matchedCount,
      canArchive: true,
    });
  }

  // 10. ENFORCE: bloquejar si hi ha tiquets pendents
  if (pendingCount > 0) {
    return NextResponse.json(
      {
        success: false,
        error: `Aquesta liquidació té ${pendingCount} tiquets pendents assignats. No es pot arxivar.`,
        code: 'HAS_PENDING_TICKETS',
        pendingCount,
        matchedCount,
      },
      { status: 400 }
    );
  }

  // 11. Arxivar la liquidació
  await reportRef.update({
    status: 'archived',
    archivedAt: FieldValue.serverTimestamp(),
    archivedByUid: uid,
    archivedFromAction: 'archive-expense-report-api',
    updatedAt: new Date().toISOString(),
  });

  const elapsed = Date.now() - startTime;
  console.log(`[expense-reports/archive] Liquidació ${reportId} arxivada. Temps: ${elapsed}ms`);

  return NextResponse.json({
    success: true,
  });
}
