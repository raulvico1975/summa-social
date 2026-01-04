/**
 * POST /api/integrations/backup/run-now
 *
 * Executa un backup manualment per l'organització.
 * - Valida usuari autenticat (admin)
 * - Executa el backup complet
 * - Retorna el resultat
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { runBackupForOrg } from '@/lib/backups/run-backup';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Admin initialization (lazy, cached, idempotent)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Autenticació via Firebase ID Token
// ─────────────────────────────────────────────────────────────────────────────

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
    console.error('[backup/run-now] Error verificant token:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request body
// ─────────────────────────────────────────────────────────────────────────────

interface RunNowRequest {
  orgId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticació
    const authResult = await verifyIdToken(request);
    if (!authResult) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Llegir body
    const body: RunNowRequest = await request.json();
    const { orgId } = body;

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 });
    }

    // 3. Verificar que l'usuari és admin de l'org
    const db = getAdminDb();
    const memberRef = db.doc(`organizations/${orgId}/members/${authResult.uid}`);
    const memberSnap = await memberRef.get();

    if (!memberSnap.exists) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    const memberData = memberSnap.data();
    if (memberData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can run backups' },
        { status: 403 }
      );
    }

    // 4. Executar backup
    console.log(`[backup/run-now] Starting backup for org ${orgId} by user ${authResult.uid}`);

    const result = await runBackupForOrg(db, orgId);

    if (result.success) {
      return NextResponse.json({
        status: 'success',
        backupId: result.backupId,
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          error: result.error,
          backupId: result.backupId,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[backup/run-now] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
