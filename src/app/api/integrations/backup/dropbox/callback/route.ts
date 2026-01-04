/**
 * GET /api/integrations/backup/dropbox/callback
 *
 * Callback de Dropbox OAuth.
 * - Valida el state (requestId) one-shot
 * - Intercanvia code per tokens
 * - Desa refreshToken a Firestore
 * - Redirigeix a configuració
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { BackupOAuthRequest, BackupIntegration } from '@/lib/backups/types';

// ─────────────────────────────────────────────────────────────────────────────
// Firebase Admin initialization (lazy, cached, idempotent)
// ─────────────────────────────────────────────────────────────────────────────

let cachedDb: Firestore | null = null;

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

// ─────────────────────────────────────────────────────────────────────────────
// GET handler (Dropbox redirigeix amb GET)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  // Helper per redirect amb error
  const redirectWithError = (orgSlug: string, errorMsg: string) => {
    const url = new URL(`/${orgSlug}/dashboard/configuracion`, request.url);
    url.searchParams.set('backup_error', errorMsg);
    return NextResponse.redirect(url);
  };

  // Helper per redirect amb error genèric (sense orgSlug)
  const redirectToLogin = (errorMsg: string) => {
    const url = new URL('/login', request.url);
    url.searchParams.set('error', errorMsg);
    return NextResponse.redirect(url);
  };

  try {
    // 1. Dropbox pot retornar error directe
    if (error) {
      console.error(`[dropbox/callback] Dropbox error: ${error} - ${errorDescription}`);
      // No tenim orgSlug encara, redirigim a login
      return redirectToLogin('dropbox_denied');
    }

    // 2. Validar paràmetres
    if (!code || !state) {
      console.error('[dropbox/callback] Missing code or state');
      return redirectToLogin('invalid_request');
    }

    // 3. Carregar i validar BackupOAuthRequest
    const db = getAdminDb();

    // Primer hem de trobar l'org que té aquest request
    // El state és el requestId, però necessitem saber quin org
    // Busquem a totes les orgs (no ideal però és one-shot)
    const orgsSnap = await db.collection('organizations').get();

    let oauthRequest: BackupOAuthRequest | null = null;
    let foundOrgId: string | null = null;

    for (const orgDoc of orgsSnap.docs) {
      const requestRef = db.doc(
        `organizations/${orgDoc.id}/integrations/backupOAuthRequests/${state}`
      );
      const requestSnap = await requestRef.get();

      if (requestSnap.exists) {
        oauthRequest = requestSnap.data() as BackupOAuthRequest;
        foundOrgId = orgDoc.id;
        break;
      }
    }

    if (!oauthRequest || !foundOrgId) {
      console.error(`[dropbox/callback] OAuth request not found: ${state}`);
      return redirectToLogin('invalid_state');
    }

    const orgSlug = oauthRequest.orgSlug;

    // 4. Validar request
    const now = new Date();

    // Ja usat?
    if (oauthRequest.usedAt) {
      console.error(`[dropbox/callback] OAuth request already used: ${state}`);
      return redirectWithError(orgSlug, 'request_already_used');
    }

    // Expirat?
    if (new Date(oauthRequest.expiresAt) < now) {
      console.error(`[dropbox/callback] OAuth request expired: ${state}`);
      return redirectWithError(orgSlug, 'request_expired');
    }

    // Provider correcte?
    if (oauthRequest.provider !== 'dropbox') {
      console.error(`[dropbox/callback] Wrong provider: ${oauthRequest.provider}`);
      return redirectWithError(orgSlug, 'wrong_provider');
    }

    // 5. Marcar com a usat PRIMER (evitar replays)
    const requestRef = db.doc(
      `organizations/${foundOrgId}/integrations/backupOAuthRequests/${state}`
    );
    await requestRef.update({ usedAt: now.toISOString() });

    // 6. Intercanviar code per tokens
    const DROPBOX_APP_KEY = process.env.DROPBOX_APP_KEY;
    const DROPBOX_APP_SECRET = process.env.DROPBOX_APP_SECRET;

    if (!DROPBOX_APP_KEY || !DROPBOX_APP_SECRET) {
      console.error('[dropbox/callback] Dropbox credentials not configured');
      await updateBackupError(db, foundOrgId, 'Dropbox credentials not configured');
      return redirectWithError(orgSlug, 'config_error');
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/integrations/backup/dropbox/callback`;

    const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: DROPBOX_APP_KEY,
        client_secret: DROPBOX_APP_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[dropbox/callback] Token exchange failed: ${errorText}`);
      await updateBackupError(db, foundOrgId, 'Token exchange failed');
      return redirectWithError(orgSlug, 'token_error');
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      console.error('[dropbox/callback] No refresh_token in response');
      await updateBackupError(db, foundOrgId, 'No refresh token received');
      return redirectWithError(orgSlug, 'no_refresh_token');
    }

    // 7. Actualitzar BackupIntegration
    const backupRef = db.doc(`organizations/${foundOrgId}/integrations/backup`);
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const updateData: Partial<BackupIntegration> = {
      provider: 'dropbox',
      status: 'connected',
      connectedAt: today,
      lastError: null,
      dropbox: {
        refreshToken,
        rootPath: `/Summa Social/${orgSlug}`,
      },
    };

    await backupRef.set(updateData, { merge: true });

    console.log(`[dropbox/callback] Successfully connected Dropbox for org ${orgSlug}`);

    // 8. Redirect a configuració amb èxit
    const successUrl = new URL(`/${orgSlug}/dashboard/configuracion`, request.url);
    successUrl.searchParams.set('backup_connected', 'dropbox');
    return NextResponse.redirect(successUrl);

  } catch (err) {
    console.error('[dropbox/callback] Unexpected error:', err);
    return redirectToLogin('unexpected_error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper per actualitzar error
// ─────────────────────────────────────────────────────────────────────────────

async function updateBackupError(db: Firestore, orgId: string, errorMsg: string) {
  const backupRef = db.doc(`organizations/${orgId}/integrations/backup`);
  await backupRef.set(
    {
      status: 'error',
      lastError: errorMsg,
    },
    { merge: true }
  );
}
