import assert from 'node:assert/strict';
import test from 'node:test';
import { handleOpenOrgDocument } from '@/app/api/org-documents/open/handler';

const MEMBER_PATH = 'organizations/org-a/members/user-1';
const OFFBANK_STORAGE_PATH = 'organizations/org-a/offBankExpenses/off-1/receipt.pdf';

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
    };
  }
}

class FakeBucket {
  readonly signedUrlCalls: Array<{ path: string; expires: number }> = [];

  file(path: string) {
    const bucket = this;
    return {
      async exists() {
        return [path === OFFBANK_STORAGE_PATH] as [boolean];
      },
      async getSignedUrl(options: { action: 'read'; expires: number }) {
        bucket.signedUrlCalls.push({ path, expires: options.expires });
        return [`https://signed.local/${encodeURIComponent(path)}`] as [string];
      },
    };
  }
}

function requestFor(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return {
    headers: new Headers({ Authorization: 'Bearer token' }),
    nextUrl: new URL(`http://localhost/api/org-documents/open?${search.toString()}`),
  } as never;
}

test('open org document regenerates a fresh URL for off-bank attachments', async () => {
  const db = new FakeDb({ [MEMBER_PATH]: { role: 'viewer' } });
  const bucket = new FakeBucket();

  const response = await handleOpenOrgDocument(requestFor({
    orgId: 'org-a',
    storagePath: OFFBANK_STORAGE_PATH,
  }), {
    db: db as never,
    storageBucket: bucket,
    nowMs: () => 1_000,
    verifyIdTokenFn: async () => ({ uid: 'user-1', email: 'user@example.org' }),
  });

  assert.equal(response.status, 200);
  const body = await response.json() as { success: boolean; url: string; durable: boolean };
  assert.equal(body.success, true);
  assert.equal(body.durable, true);
  assert.equal(body.url, `https://signed.local/${encodeURIComponent(OFFBANK_STORAGE_PATH)}`);
  assert.deepEqual(bucket.signedUrlCalls, [{ path: OFFBANK_STORAGE_PATH, expires: 901_000 }]);
});

test('open org document rejects non-document organization paths', async () => {
  const db = new FakeDb({ [MEMBER_PATH]: { role: 'admin' } });
  const response = await handleOpenOrgDocument(requestFor({
    orgId: 'org-a',
    storagePath: 'organizations/org-a/logo',
  }), {
    db: db as never,
    storageBucket: new FakeBucket(),
    verifyIdTokenFn: async () => ({ uid: 'user-1', email: 'user@example.org' }),
  });

  assert.equal(response.status, 400);
  const body = await response.json() as { code: string };
  assert.equal(body.code, 'INVALID_STORAGE_PATH');
});
