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

export type UploadBlockedReason = 'NO_AUTH' | 'NO_ORG';

export interface UploadContextResult {
  ok: true;
  ctx: UploadContext;
}

export interface UploadContextError {
  ok: false;
  reason: UploadBlockedReason;
  ctx: UploadContext;
}

/**
 * Diagnòstic i guard per uploads a Firebase Storage.
 *
 * - Log complet del context d'upload (només en development)
 * - Retorna { ok: false, reason } si uid o orgId no estan disponibles
 *
 * Utilitza la mateixa instància d'app/auth/storage que el projecte (singleton).
 */
export function assertUploadContext({
  contextLabel,
  orgId,
  path,
}: UploadContextParams): UploadContextResult | UploadContextError {
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

  // Log només en development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[UPLOAD_CTX]', JSON.stringify(ctx, null, 2));
  }

  // Guards - retornem error en lloc de throw
  if (!uid) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[UPLOAD_CTX] BLOCKED: No auth.currentUser.uid');
    }
    return { ok: false, reason: 'NO_AUTH', ctx };
  }

  if (!orgId) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[UPLOAD_CTX] BLOCKED: No orgId');
    }
    return { ok: false, reason: 'NO_ORG', ctx };
  }

  return { ok: true, ctx };
}
