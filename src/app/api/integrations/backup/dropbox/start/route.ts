/**
 * POST /api/integrations/backup/dropbox/start
 *
 * Inicia el flux OAuth de Dropbox.
 * - Valida usuari autenticat (admin)
 * - Crea un BackupOAuthRequest one-shot
 * - Retorna la URL d'autorització de Dropbox
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';
import type { BackupOAuthRequest } from '@/lib/backups/types';
import {
  verifyAdminMembership,
  type AdminAuthResult,
} from '@/lib/fiscal/remittances/admin-auth';

/**
 * Feature flag per activar/desactivar backups al núvol.
 * Posar a `true` només si es vol reactivar la funcionalitat.
 */
const CLOUD_BACKUPS_ENABLED = false;

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
    console.error('[dropbox/start] Error verificant token:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Request body
// ─────────────────────────────────────────────────────────────────────────────

interface StartRequest {
  orgId: string;
  orgSlug: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Feature desactivada: retornar 404
  if (!CLOUD_BACKUPS_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    // 1. Verificar autenticació
    const authResult = await verifyIdToken(request);
    if (!authResult) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Llegir body
    const body: StartRequest = await request.json();
    const { orgId, orgSlug } = body;

    if (!orgId || !orgSlug) {
      return NextResponse.json(
        { error: 'Missing orgId or orgSlug' },
        { status: 400 }
      );
    }

    // 3. Verificar que l'usuari és admin de l'org
    const db = getAdminDb();

    // Primer verificar que l'organització existeix
    const orgRef = db.doc(`organizations/${orgId}`);
    const orgSnap = await orgRef.get();

    if (!orgSnap.exists) {
      console.error(`[dropbox/start] Organization not found: ${orgId}`);
      return NextResponse.json(
        { error: 'Organization not found', code: 'ORG_NOT_FOUND' },
        { status: 404 }
      );
    }

    const authCheck = await verifyAdminMembership(request, orgId);
    if (!authCheck.success) {
      if (authCheck.code === 'NOT_MEMBER') {
        return NextResponse.json(
          { error: 'Not a member of this organization', code: 'NOT_MEMBER' },
          { status: 403 }
        );
      }

      if (authCheck.code === 'NOT_ADMIN') {
        return NextResponse.json(
          { error: 'Only admins can connect backup providers', code: 'NOT_ADMIN' },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: authCheck.error, code: authCheck.code },
        { status: authCheck.status }
      );
    }
    const { uid } = authCheck as AdminAuthResult;
    console.log(`[dropbox/start] Auth OK for ${uid} in org ${orgId}`);

    // 4. Verificar secrets
    const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
    if (!DROPBOX_APP_KEY) {
      console.error('[dropbox/start] DROPBOX_APP_KEY not configured');
      return NextResponse.json(
        { error: 'Dropbox integration not configured' },
        { status: 500 }
      );
    }

    // 5. Crear BackupOAuthRequest one-shot
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // +10 min

    const oauthRequestsRef = db.collection(`organizations/${orgId}/integrations/backupOAuthRequests`);
    const newRequestRef = oauthRequestsRef.doc();
    const requestId = newRequestRef.id;

    const oauthRequest: BackupOAuthRequest = {
      id: requestId,
      provider: 'dropbox',
      orgId,
      orgSlug,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      usedAt: null,
      createdByUid: uid,
    };

    await newRequestRef.set(oauthRequest);

    // 6. Construir URL de Dropbox authorize
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/integrations/backup/dropbox/callback`;

    const dropboxAuthUrl = new URL('https://www.dropbox.com/oauth2/authorize');
    dropboxAuthUrl.searchParams.set('client_id', DROPBOX_APP_KEY);
    dropboxAuthUrl.searchParams.set('response_type', 'code');
    dropboxAuthUrl.searchParams.set('token_access_type', 'offline');
    dropboxAuthUrl.searchParams.set('state', requestId);
    dropboxAuthUrl.searchParams.set('redirect_uri', redirectUri);

    console.log(`[dropbox/start] OAuth request created: ${requestId} for org ${orgSlug}`);

    return NextResponse.json({
      url: dropboxAuthUrl.toString(),
    });
  } catch (error) {
    console.error('[dropbox/start] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
