/**
 * GET /api/integrations/backup/google-drive/callback
 *
 * Callback de Google OAuth.
 * - Valida el state (requestId) one-shot
 * - Intercanvia code per tokens
 * - Desa refreshToken a Firestore
 * - Redirigeix a configuració
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type { BackupOAuthRequest, BackupIntegration } from '@/lib/backups/types';

/**
 * Feature flag per activar/desactivar backups al núvol.
 * Posar a `true` només si es vol reactivar la funcionalitat.
 */
const CLOUD_BACKUPS_ENABLED = false;

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
// GET handler (Google redirigeix amb GET)
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  // Feature desactivada: retornar 404
  if (!CLOUD_BACKUPS_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

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
    // 1. Google pot retornar error directe
    if (error) {
      console.error(
        `[google-drive/callback] Google error: ${error} - ${errorDescription}`
      );
      return redirectToLogin('google_denied');
    }

    // 2. Validar paràmetres
    if (!code || !state) {
      console.error('[google-drive/callback] Missing code or state');
      return redirectToLogin('invalid_request');
    }

    // 3. Carregar i validar BackupOAuthRequest
    const db = getAdminDb();

    // El state és el requestId, però necessitem saber quin org
    // Busquem a totes les orgs (one-shot, no ideal però funciona)
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
      console.error(`[google-drive/callback] OAuth request not found: ${state}`);
      return redirectToLogin('invalid_state');
    }

    const orgSlug = oauthRequest.orgSlug;

    // 4. Validar request
    const now = new Date();

    // Ja usat?
    if (oauthRequest.usedAt) {
      console.error(`[google-drive/callback] OAuth request already used: ${state}`);
      return redirectWithError(orgSlug, 'request_already_used');
    }

    // Expirat?
    if (new Date(oauthRequest.expiresAt) < now) {
      console.error(`[google-drive/callback] OAuth request expired: ${state}`);
      return redirectWithError(orgSlug, 'request_expired');
    }

    // Provider correcte?
    if (oauthRequest.provider !== 'googleDrive') {
      console.error(
        `[google-drive/callback] Wrong provider: ${oauthRequest.provider}`
      );
      return redirectWithError(orgSlug, 'wrong_provider');
    }

    // 5. Marcar com a usat PRIMER (evitar replays)
    const requestRef = db.doc(
      `organizations/${foundOrgId}/integrations/backupOAuthRequests/${state}`
    );
    await requestRef.update({ usedAt: now.toISOString() });

    // 6. Intercanviar code per tokens
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error('[google-drive/callback] Google credentials not configured');
      await updateBackupError(db, foundOrgId, 'Google credentials not configured');
      return redirectWithError(orgSlug, 'config_error');
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const redirectUri = `${protocol}://${host}/api/integrations/backup/google-drive/callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[google-drive/callback] Token exchange failed: ${errorText}`);
      await updateBackupError(db, foundOrgId, 'Token exchange failed');
      return redirectWithError(orgSlug, 'token_error');
    }

    const tokenData = await tokenResponse.json();
    const refreshToken = tokenData.refresh_token;

    if (!refreshToken) {
      console.error('[google-drive/callback] No refresh_token in response');
      await updateBackupError(db, foundOrgId, 'No refresh token received');
      return redirectWithError(orgSlug, 'no_refresh_token');
    }

    // 7. Actualitzar BackupIntegration
    const backupRef = db.doc(`organizations/${foundOrgId}/integrations/backup`);
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD

    const updateData: Partial<BackupIntegration> = {
      provider: 'googleDrive',
      status: 'connected',
      connectedAt: today,
      lastError: null,
      googleDrive: {
        refreshToken,
        folderId: null, // Es descobrirà al primer backup
      },
    };

    await backupRef.set(updateData, { merge: true });

    console.log(
      `[google-drive/callback] Successfully connected Google Drive for org ${orgSlug}`
    );

    // 8. Redirect a configuració amb èxit
    const successUrl = new URL(`/${orgSlug}/dashboard/configuracion`, request.url);
    successUrl.searchParams.set('backup_connected', 'googleDrive');
    return NextResponse.redirect(successUrl);
  } catch (err) {
    console.error('[google-drive/callback] Unexpected error:', err);
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
