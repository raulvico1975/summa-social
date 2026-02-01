/**
 * POST /api/projects/archive
 *
 * Arxiva un projecte (eix d'actuació) amb reassignació opcional de transaccions.
 *
 * Característiques:
 * - Només escriptura via Admin SDK (bypassant Firestore Rules)
 * - orgId derivat de la membership de l'usuari (no del body)
 * - Validació de rol admin/user
 * - Reassignació atòmica amb batch (450 docs/batch)
 * - Idempotent: si ja està arxivat, retorna success
 *
 * NOTA: Aquesta API NO afecta projectModule/* (mòdul de projectes modern)
 * Només afecta organizations/{orgId}/projects/* (eixos d'actuació legacy)
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
    console.error('[projects/archive] Error verificant token:', error);
    return null;
  }
}

// =============================================================================
// TIPUS
// =============================================================================

interface ArchiveProjectRequest {
  orgId: string;
  fromProjectId: string;
  toProjectId?: string | null;
}

interface ArchiveProjectResponse {
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
): Promise<NextResponse<ArchiveProjectResponse>> {
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
  let body: ArchiveProjectRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, fromProjectId, toProjectId } = body;

  // 3. Validar orgId obligatori
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  if (!fromProjectId) {
    return NextResponse.json(
      { success: false, error: 'fromProjectId és obligatori', code: 'MISSING_FROM_ID' },
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

  // 5. Validar rol admin (només admin pot arxivar eixos)
  if (membership.role !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Cal ser admin per arxivar eixos', code: 'FORBIDDEN' },
      { status: 403 }
    );
  }

  // 6. Validar que fromProject existeix i no està arxivat
  const fromProjectRef = db.doc(`organizations/${orgId}/projects/${fromProjectId}`);
  const fromProjectSnap = await fromProjectRef.get();

  if (!fromProjectSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Eix origen no existeix', code: 'FROM_NOT_FOUND' },
      { status: 404 }
    );
  }

  const fromProjectData = fromProjectSnap.data();

  // Idempotència: si ja està arxivat, retornem success
  if (fromProjectData?.archivedAt != null) {
    console.log(`[projects/archive] Eix ${fromProjectId} ja arxivat (idempotent)`);
    return NextResponse.json({
      success: true,
      idempotent: true,
      reassignedCount: 0,
    });
  }

  // 6. Si hi ha toProjectId, validar que existeix, no està arxivat, i no és el mateix
  if (toProjectId) {
    if (toProjectId === fromProjectId) {
      return NextResponse.json(
        { success: false, error: 'Eix destí no pot ser el mateix que origen', code: 'SAME_PROJECT' },
        { status: 400 }
      );
    }

    const toProjectRef = db.doc(`organizations/${orgId}/projects/${toProjectId}`);
    const toProjectSnap = await toProjectRef.get();

    if (!toProjectSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Eix destí no existeix', code: 'TO_NOT_FOUND' },
        { status: 400 }
      );
    }

    const toProjectData = toProjectSnap.data();
    if (toProjectData?.archivedAt != null) {
      return NextResponse.json(
        { success: false, error: 'Eix destí està arxivat', code: 'TO_ARCHIVED' },
        { status: 400 }
      );
    }
  }

  // 7. Query transaccions amb projectId == fromProjectId
  // NOTA: No podem usar where('archivedAt', '==', null) perquè Firestore
  // no troba documents on el camp no existeix (dades legacy sense archivedAt)
  const transactionsRef = db.collection(`organizations/${orgId}/transactions`);
  const projectTransactionsQuery = transactionsRef
    .where('projectId', '==', fromProjectId);

  const projectTransactionsSnap = await projectTransactionsQuery.get();

  // Filtrar actives a codi (archivedAt == null o undefined/absent)
  const activeDocs = projectTransactionsSnap.docs.filter(doc => {
    const data = doc.data();
    return data.archivedAt == null; // Cobreix null i undefined
  });
  const activeCount = activeDocs.length;

  console.log(`[projects/archive] Eix ${fromProjectId} té ${activeCount} transaccions actives`);

  // 8. Si count > 0 i no hi ha toProjectId, error
  if (activeCount > 0 && !toProjectId) {
    return NextResponse.json(
      {
        success: false,
        error: `Eix té ${activeCount} moviments actius. Cal reassignar-los primer.`,
        code: 'HAS_ACTIVE_TRANSACTIONS',
      },
      { status: 400 }
    );
  }

  // 9. Si count > 0 i toProjectId, fer batch reassign
  let reassignedCount = 0;
  if (activeCount > 0 && toProjectId) {
    for (let i = 0; i < activeDocs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = activeDocs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        batch.update(doc.ref, { projectId: toProjectId });
      }

      await batch.commit();
      reassignedCount += chunk.length;
      console.log(`[projects/archive] Reassignades ${reassignedCount}/${activeDocs.length} transaccions`);
    }
  }

  // 10. Arxivar el projecte origen
  await fromProjectRef.update({
    archivedAt: FieldValue.serverTimestamp(),
    archivedByUid: uid,
    archivedFromAction: 'archive-project-api',
  });

  const elapsed = Date.now() - startTime;
  console.log(`[projects/archive] Eix ${fromProjectId} arxivat. Reassignades: ${reassignedCount}. Temps: ${elapsed}ms`);

  return NextResponse.json({
    success: true,
    reassignedCount,
  });
}
