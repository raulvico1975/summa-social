import { getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

export interface UploadContextParams {
  contextLabel: string;
  orgId: string | null;
  path: string;
}

export interface UploadContext {
  contextLabel: string;
  uid: string | null;
  orgId: string | null;
  projectId: string | undefined;
  storageBucket: string | undefined;
  path: string;
}

/**
 * Diagnòstic i guard per uploads a Firebase Storage.
 *
 * - Log complet del context d'upload
 * - Throw si uid o orgId no estan disponibles
 *
 * Utilitza la mateixa instància d'app/auth/storage que el projecte (singleton).
 */
export function assertUploadContext({ contextLabel, orgId, path }: UploadContextParams): UploadContext {
  const app = getApp();
  const auth = getAuth(app);
  const storage = getStorage(app);

  const uid = auth.currentUser?.uid ?? null;
  const projectId = app.options.projectId;
  const storageBucket = storage.app.options.storageBucket;

  const ctx: UploadContext = {
    contextLabel,
    uid,
    orgId,
    projectId,
    storageBucket,
    path,
  };

  // Log per diagnòstic diferencial
  console.log('[UPLOAD_CTX]', JSON.stringify(ctx, null, 2));

  // Guards
  if (!uid) {
    console.error('[UPLOAD_CTX] BLOCKED: No auth.currentUser.uid');
    throw new Error('UPLOAD_BLOCKED_NO_AUTH');
  }

  if (!orgId) {
    console.error('[UPLOAD_CTX] BLOCKED: No orgId');
    throw new Error('UPLOAD_BLOCKED_NO_ORG');
  }

  return ctx;
}
