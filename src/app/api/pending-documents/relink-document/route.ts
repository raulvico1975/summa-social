/**
 * POST /api/pending-documents/relink-document
 *
 * Re-vincula el document d'un pending document a la transacció bancària conciliada.
 * Només copia el document, no modifica conciliació ni estats.
 *
 * Input: { orgId, pendingId }
 *
 * Característiques:
 * - Idempotent: si el document ja existeix a la transacció, retorna OK
 * - NO modifica pending.status ni pending.matchedTransactionId
 * - Només membres de l'organització poden executar
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth, type Auth } from 'firebase-admin/auth';
import type { Bucket } from '@google-cloud/storage';

// =============================================================================
// FIREBASE ADMIN INITIALIZATION
// =============================================================================

let cachedDb: Firestore | null = null;
let cachedBucket: Bucket | null = null;
let cachedAuth: Auth | null = null;

function getAdminDb(): Firestore {
  if (cachedDb) return cachedDb;

  if (getApps().length === 0) {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

    if (!projectId || !storageBucket) {
      throw new Error('Firebase config incompleta per Admin SDK');
    }

    initializeApp({
      credential: applicationDefault(),
      projectId,
      storageBucket,
    });
  }

  cachedDb = getFirestore();
  return cachedDb;
}

function getAdminStorage(): Bucket {
  if (cachedBucket) return cachedBucket;
  getAdminDb();
  cachedBucket = getStorage().bucket();
  return cachedBucket;
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
    console.error('[relink-document] Error verificant token:', error);
    return null;
  }
}

// =============================================================================
// TIPUS
// =============================================================================

interface RelinkDocumentRequest {
  orgId: string;
  pendingId: string;
}

interface RelinkDocumentResponse {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  code?: string;
}

// =============================================================================
// HELPER: Validar membership
// =============================================================================

async function validateUserMembership(
  db: Firestore,
  uid: string,
  orgId: string
): Promise<boolean> {
  const memberRef = db.doc(`organizations/${orgId}/members/${uid}`);
  const memberSnap = await memberRef.get();
  return memberSnap.exists;
}

// =============================================================================
// HANDLER PRINCIPAL
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<RelinkDocumentResponse>> {
  const logPrefix = '[relink-document]';

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
  const bucket = getAdminStorage();

  // 2. Parse body
  let body: RelinkDocumentRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, pendingId } = body;

  // 3. Validar camps obligatoris
  if (!orgId || !pendingId) {
    return NextResponse.json(
      { success: false, error: 'orgId i pendingId són obligatoris', code: 'MISSING_PARAMS' },
      { status: 400 }
    );
  }

  // 4. Validar membership
  const isMember = await validateUserMembership(db, uid, orgId);
  if (!isMember) {
    return NextResponse.json(
      { success: false, error: 'No ets membre d\'aquesta organització', code: 'NOT_MEMBER' },
      { status: 403 }
    );
  }

  // 5. Carregar pending document
  const pendingRef = db.doc(`organizations/${orgId}/pendingDocuments/${pendingId}`);
  const pendingSnap = await pendingRef.get();

  if (!pendingSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Document pendent no existeix', code: 'PENDING_NOT_FOUND' },
      { status: 404 }
    );
  }

  const pendingData = pendingSnap.data();

  // 6. Validar que té matchedTransactionId (està conciliat)
  const bankTxId = pendingData?.matchedTransactionId;
  if (!bankTxId) {
    return NextResponse.json(
      { success: false, error: 'El document no està conciliat amb cap moviment', code: 'NOT_MATCHED' },
      { status: 400 }
    );
  }

  // 7. Validar que té document (storagePath)
  const storagePath = pendingData?.file?.storagePath;
  const filename = pendingData?.file?.filename;

  if (!storagePath || !filename) {
    // Incidència: document pendent sense fitxer
    console.error(`${logPrefix} INCIDENT_MISSING_DOCUMENT: pendingId=${pendingId}, orgId=${orgId}`);
    return NextResponse.json(
      { success: false, error: 'Incidència: document del pendent no trobat', code: 'MISSING_DOCUMENT' },
      { status: 400 }
    );
  }

  // 8. Validar que la transacció existeix
  const txRef = db.doc(`organizations/${orgId}/transactions/${bankTxId}`);
  const txSnap = await txRef.get();

  if (!txSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'La transacció bancària no existeix', code: 'TX_NOT_FOUND' },
      { status: 404 }
    );
  }

  const txData = txSnap.data();

  // 9. Idempotència: si ja té document, comprovar si és el mateix
  if (txData?.document) {
    // Ja té document vinculat - considerem idempotent
    console.log(`${logPrefix} Transacció ${bankTxId} ja té document (idempotent)`);
    return NextResponse.json({
      success: true,
      idempotent: true,
    });
  }

  // 10. Copiar fitxer a la ubicació de la transacció
  const destPath = `organizations/${orgId}/documents/${bankTxId}/${filename}`;

  console.log(`${logPrefix} Copiant: ${storagePath} -> ${destPath}`);

  try {
    const sourceFile = bucket.file(storagePath);
    const destFile = bucket.file(destPath);

    // Comprovar que el fitxer origen existeix
    const [sourceExists] = await sourceFile.exists();
    if (!sourceExists) {
      console.error(`${logPrefix} INCIDENT_MISSING_DOCUMENT: fitxer no existeix a Storage: ${storagePath}`);
      return NextResponse.json(
        { success: false, error: 'Incidència: document del pendent no trobat a Storage', code: 'MISSING_DOCUMENT' },
        { status: 400 }
      );
    }

    // Copiar
    await sourceFile.copy(destFile);

    // Obtenir URL pública (signada)
    const [signedUrl] = await destFile.getSignedUrl({
      action: 'read',
      expires: '03-01-2500', // URL de llarga durada
    });

    // 11. Actualitzar la transacció amb el document
    await txRef.update({
      document: signedUrl,
      updatedAt: FieldValue.serverTimestamp(),
    });

    console.log(`${logPrefix} Document re-vinculat: pendingId=${pendingId}, bankTxId=${bankTxId}, filename=${filename}`);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(`${logPrefix} Error copiant fitxer:`, error);
    return NextResponse.json(
      { success: false, error: 'Error copiant el document', code: 'COPY_ERROR' },
      { status: 500 }
    );
  }
}
