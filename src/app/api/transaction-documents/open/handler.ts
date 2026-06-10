import { NextResponse, type NextRequest } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { getAdminApp, getAdminDb, validateUserMembership, verifyIdToken } from '@/lib/api/admin-sdk';
import { requirePermission } from '@/lib/api/require-permission';
import { LEGACY_TRANSACTION_DOCUMENT_ID } from '@/lib/transactions/transaction-documents';

const SIGNED_URL_TTL_MS = 15 * 60 * 1000;

type RequestLike = Pick<NextRequest, 'headers' | 'nextUrl'>;

interface OpenTransactionDocumentDeps {
  verifyIdTokenFn?: typeof verifyIdToken;
  db?: FirebaseFirestore.Firestore;
  storageBucket?: {
    file(path: string): {
      exists(): Promise<[boolean]>;
      getSignedUrl(options: { action: 'read'; expires: number }): Promise<[string]>;
    };
  };
  nowMs?: () => number;
}

type DocumentCandidate = {
  url: string | null;
  storagePath: string | null;
};

function cleanParam(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed || null;
}

function storagePathBelongsToOrg(path: string | null, orgId: string): path is string {
  return typeof path === 'string'
    && path.startsWith(`organizations/${orgId}/`)
    && !path.includes('..')
    && !path.includes('\0');
}

export function extractStoragePathFromDocumentUrl(urlValue: string | null, orgId: string): string | null {
  if (!urlValue) return null;

  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') return null;

  let candidate: string | null = null;
  if (url.hostname === 'storage.googleapis.com') {
    const parts = url.pathname.split('/').filter(Boolean);
    candidate = parts.length >= 2 ? decodeURIComponent(parts.slice(1).join('/')) : null;
  } else if (url.hostname === 'firebasestorage.googleapis.com') {
    const match = url.pathname.match(/^\/v0\/b\/[^/]+\/o\/([^/]+)$/);
    candidate = match ? decodeURIComponent(match[1]) : null;
  } else if (url.hostname.endsWith('.firebasestorage.app')) {
    const match = url.pathname.match(/^\/o\/([^/]+)$/);
    candidate = match ? decodeURIComponent(match[1]) : null;
  }

  return storagePathBelongsToOrg(candidate, orgId) ? candidate : null;
}

async function loadDocumentCandidate(
  db: FirebaseFirestore.Firestore,
  orgId: string,
  transactionId: string,
  documentId: string
): Promise<DocumentCandidate | null> {
  const transactionRef = db.doc(`organizations/${orgId}/transactions/${transactionId}`);

  if (documentId === LEGACY_TRANSACTION_DOCUMENT_ID) {
    const transactionSnap = await transactionRef.get();
    if (!transactionSnap.exists) return null;
    const data = transactionSnap.data() ?? {};
    return {
      url: typeof data.document === 'string' ? data.document : null,
      storagePath: null,
    };
  }

  const documentSnap = await transactionRef.collection('documents').doc(documentId).get();
  if (!documentSnap.exists) return null;
  const data = documentSnap.data() ?? {};
  return {
    url: typeof data.url === 'string' ? data.url : null,
    storagePath: typeof data.storagePath === 'string' ? data.storagePath : null,
  };
}

export async function handleOpenTransactionDocument(
  request: RequestLike,
  deps: OpenTransactionDocumentDeps = {}
) {
  const verifyIdTokenFn = deps.verifyIdTokenFn ?? verifyIdToken;
  const auth = await verifyIdTokenFn(request as NextRequest);
  if (!auth) {
    return NextResponse.json({ success: false, code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const orgId = cleanParam(request.nextUrl.searchParams.get('orgId'));
  const transactionId = cleanParam(request.nextUrl.searchParams.get('transactionId'));
  const documentId = cleanParam(request.nextUrl.searchParams.get('documentId'));

  if (!orgId) return NextResponse.json({ success: false, code: 'MISSING_ORG_ID' }, { status: 400 });
  if (!transactionId) return NextResponse.json({ success: false, code: 'MISSING_TRANSACTION_ID' }, { status: 400 });
  if (!documentId) return NextResponse.json({ success: false, code: 'MISSING_DOCUMENT_ID' }, { status: 400 });

  const db = deps.db ?? getAdminDb();
  const membership = await validateUserMembership(db, auth.uid, orgId);
  const denied = requirePermission(membership, {
    code: 'MOVIMENTS_ROUTE_REQUIRED',
    check: (permissions) => permissions['sections.moviments'] && permissions['moviments.read'],
  });
  if (denied) return denied;

  const candidate = await loadDocumentCandidate(db, orgId, transactionId, documentId);
  if (!candidate) {
    return NextResponse.json({ success: false, code: 'DOCUMENT_NOT_FOUND' }, { status: 404 });
  }

  const storagePath = storagePathBelongsToOrg(candidate.storagePath, orgId)
    ? candidate.storagePath
    : extractStoragePathFromDocumentUrl(candidate.url, orgId);

  if (!storagePath) {
    if (candidate.url) {
      return NextResponse.json({
        success: true,
        url: candidate.url,
        durable: false,
        code: 'LEGACY_URL_WITHOUT_STORAGE_PATH',
      });
    }
    return NextResponse.json({ success: false, code: 'DOCUMENT_WITHOUT_STORAGE_PATH' }, { status: 409 });
  }

  const bucket = deps.storageBucket ?? getStorage(getAdminApp()).bucket();
  const file = bucket.file(storagePath);
  const [exists] = await file.exists();
  if (!exists) {
    return NextResponse.json({ success: false, code: 'STORAGE_OBJECT_NOT_FOUND' }, { status: 404 });
  }

  const [url] = await file.getSignedUrl({
    action: 'read',
    expires: (deps.nowMs ?? Date.now)() + SIGNED_URL_TTL_MS,
  });

  return NextResponse.json({
    success: true,
    url,
    durable: true,
  });
}
