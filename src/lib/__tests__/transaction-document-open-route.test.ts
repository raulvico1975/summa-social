import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractStoragePathFromDocumentUrl,
  handleOpenTransactionDocument,
} from '@/app/api/transaction-documents/open/handler';
import { LEGACY_TRANSACTION_DOCUMENT_ID } from '@/lib/transactions/transaction-documents';

const MEMBER_PATH = 'organizations/org-a/members/user-1';
const TX_PATH = 'organizations/org-a/transactions/tx-1';
const DOC_PATH = 'organizations/org-a/transactions/tx-1/documents/doc-1';
const STORAGE_PATH = 'organizations/org-a/documents/tx-1/invoice.pdf';

class FakeDb {
  constructor(private readonly docs: Record<string, Record<string, unknown>>) {}

  doc(path: string) {
    const docs = this.docs;
    return {
      async get() {
        const data = docs[path];
        return {
          exists: Boolean(data),
          data: () => data,
        };
      },
      collection(name: string) {
        return {
          doc(id: string) {
            const childPath = `${path}/${name}/${id}`;
            return {
              async get() {
                const data = docs[childPath];
                return {
                  exists: Boolean(data),
                  data: () => data,
                };
              },
            };
          },
        };
      },
    };
  }
}

class FakeBucket {
  readonly signedUrlCalls: Array<{ path: string; expires: number }> = [];

  file(path: string) {
    const bucket = this;
    return {
      async exists() {
        return [path === STORAGE_PATH] as [boolean];
      },
      async getSignedUrl(options: { action: 'read'; expires: number }) {
        bucket.signedUrlCalls.push({ path, expires: options.expires });
        return [`https://signed.local/${encodeURIComponent(path)}`] as [string];
      },
    };
  }
}

function requestFor(documentId: string) {
  return {
    headers: new Headers({ Authorization: 'Bearer token' }),
    nextUrl: new URL(`http://localhost/api/transaction-documents/open?orgId=org-a&transactionId=tx-1&documentId=${documentId}`),
  } as never;
}

test('open transaction document regenerates a fresh URL from storagePath', async () => {
  const db = new FakeDb({
    [MEMBER_PATH]: { role: 'admin' },
    [DOC_PATH]: {
      url: 'https://expired.local/invoice.pdf',
      storagePath: STORAGE_PATH,
    },
  });
  const bucket = new FakeBucket();

  const response = await handleOpenTransactionDocument(requestFor('doc-1'), {
    db: db as never,
    storageBucket: bucket,
    nowMs: () => 1_000,
    verifyIdTokenFn: async () => ({ uid: 'user-1', email: 'user@example.org' }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as { success: boolean; url: string; durable: boolean };
  assert.equal(body.success, true);
  assert.equal(body.durable, true);
  assert.equal(body.url, `https://signed.local/${encodeURIComponent(STORAGE_PATH)}`);
  assert.deepEqual(bucket.signedUrlCalls, [{ path: STORAGE_PATH, expires: 901_000 }]);
});

test('open transaction document recovers storagePath from an expired Google Storage legacy URL', async () => {
  const legacyUrl = `https://storage.googleapis.com/summa-social.firebasestorage.app/${STORAGE_PATH}?GoogleAccessId=service&Expires=1779269119&Signature=expired`;
  const db = new FakeDb({
    [MEMBER_PATH]: { role: 'admin' },
    [TX_PATH]: { document: legacyUrl },
  });
  const bucket = new FakeBucket();

  const response = await handleOpenTransactionDocument(requestFor(LEGACY_TRANSACTION_DOCUMENT_ID), {
    db: db as never,
    storageBucket: bucket,
    nowMs: () => 2_000,
    verifyIdTokenFn: async () => ({ uid: 'user-1', email: 'user@example.org' }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as { success: boolean; url: string; durable: boolean };
  assert.equal(body.success, true);
  assert.equal(body.durable, true);
  assert.equal(body.url, `https://signed.local/${encodeURIComponent(STORAGE_PATH)}`);
});

test('extractStoragePathFromDocumentUrl rejects paths outside the organization', () => {
  const url = 'https://storage.googleapis.com/summa-social.firebasestorage.app/organizations/other/documents/tx-1/invoice.pdf';
  assert.equal(extractStoragePathFromDocumentUrl(url, 'org-a'), null);
});
