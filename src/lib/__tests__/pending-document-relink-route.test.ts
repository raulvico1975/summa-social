import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

import { handleRelinkDocumentPost } from '@/app/api/pending-documents/relink-document/handler';
import { requireOperationalAccess } from '@/lib/api/require-operational-access';

type FakeDocData = Record<string, unknown> | null;

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/pending-documents/relink-document', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer fake-token',
    },
    body: JSON.stringify(body),
  });
}

class FakeDocSnapshot {
  constructor(private readonly dataValue: FakeDocData) {}

  get exists() {
    return this.dataValue !== null;
  }

  data() {
    return this.dataValue;
  }
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = path.split('.');
  let current = target;

  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const nested = current[segment];
    if (!nested || typeof nested !== 'object' || Array.isArray(nested)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

class FakeDb {
  constructor(private readonly docs: Record<string, FakeDocData>) {}

  doc(path: string) {
    return {
      get: async () => new FakeDocSnapshot(this.docs[path] ?? null),
      update: async (payload: Record<string, unknown>) => {
        const current = this.docs[path];
        if (!current) {
          throw new Error(`missing-doc:${path}`);
        }

        const next = { ...current };
        for (const [key, value] of Object.entries(payload)) {
          if (key.includes('.')) {
            setNestedValue(next, key, value);
          } else {
            next[key] = value;
          }
        }

        this.docs[path] = next;
      },
    };
  }
}

class FakeFile {
  private readonly fileState: {
    content: string;
    metadata: Record<string, unknown>;
  };

  constructor(
    private readonly files: Map<string, { content: string; metadata: Record<string, unknown> }>,
    readonly path: string
  ) {
    const existing = this.files.get(this.path);
    if (existing) {
      this.fileState = existing;
    } else {
      this.fileState = { content: '', metadata: {} };
      this.files.set(this.path, this.fileState);
    }
  }

  async exists() {
    return [this.files.get(this.path)?.content !== undefined && this.files.get(this.path)?.content !== ''] as const;
  }

  async copy(destination: FakeFile) {
    const current = this.files.get(this.path);
    if (!current || current.content === '') {
      throw new Error(`missing-file:${this.path}`);
    }

    this.files.set(destination.path, {
      content: current.content,
      metadata: { ...current.metadata },
    });
  }

  async getMetadata() {
    return [{ metadata: { ...this.fileState.metadata } }] as const;
  }

  async setMetadata(payload: { metadata: Record<string, unknown> }) {
    this.fileState.metadata = { ...this.fileState.metadata, ...payload.metadata };
    this.files.set(this.path, this.fileState);
    return [{ metadata: { ...this.fileState.metadata } }] as const;
  }
}

class FakeBucket {
  readonly name = 'fake-bucket';
  readonly files: Map<string, { content: string; metadata: Record<string, unknown> }>;

  constructor(files: Record<string, string | { content: string; metadata?: Record<string, unknown> }>) {
    this.files = new Map(
      Object.entries(files).map(([path, value]) => [
        path,
        typeof value === 'string'
          ? { content: value, metadata: {} }
          : { content: value.content, metadata: { ...(value.metadata ?? {}) } },
      ])
    );
  }

  file(path: string) {
    return new FakeFile(this.files, path);
  }
}

function makeDeps(args: {
  docs: Record<string, FakeDocData>;
  files?: Record<string, string | { content: string; metadata?: Record<string, unknown> }>;
}) {
  return {
    verifyIdTokenFn: async () => ({
      uid: 'user-1',
      email: 'user@test.com',
    }),
    getAdminDbFn: () => new FakeDb(args.docs) as any,
    getAdminStorageFn: () => new FakeBucket(args.files ?? {}) as any,
    validateUserMembershipFn: async () => ({
      valid: true,
      role: 'admin',
      userOverrides: null,
      userGrants: null,
    }) as any,
    requireOperationalAccessFn: requireOperationalAccess,
  };
}

test('POST /api/pending-documents/relink-document retorna 403 per role viewer', async () => {
  const response = await handleRelinkDocumentPost(
    makeRequest({
      orgId: 'org-1',
      pendingId: 'pending-1',
    }),
    {
      ...makeDeps({ docs: {} }),
      validateUserMembershipFn: async () => ({
        valid: true,
        role: 'viewer',
        userOverrides: null,
        userGrants: null,
      }) as any,
    }
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'READ_ONLY_ROLE',
    code: 'READ_ONLY_ROLE',
  });
});

test('POST /api/pending-documents/relink-document deixa continuar a role user', async () => {
  const docs: Record<string, FakeDocData> = {
    'organizations/org-1/pendingDocuments/pending-1': {
      matchedTransactionId: 'tx-1',
      file: {
        filename: 'ticket.pdf',
        storagePath: 'organizations/org-1/pendingDocuments/pending-1/ticket.pdf',
      },
    },
    'organizations/org-1/transactions/tx-1': {
      document: null,
    },
  };

  const bucket = new FakeBucket({
    'organizations/org-1/pendingDocuments/pending-1/ticket.pdf': 'ticket-data',
  });

  const response = await handleRelinkDocumentPost(
    makeRequest({
      orgId: 'org-1',
      pendingId: 'pending-1',
    }),
    {
      ...makeDeps({ docs }),
      getAdminStorageFn: () => bucket as any,
      validateUserMembershipFn: async () => ({
        valid: true,
        role: 'user',
        userOverrides: null,
        userGrants: null,
      }) as any,
    }
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
  });
  const updatedTx = docs['organizations/org-1/transactions/tx-1'] as Record<string, unknown>;
  assert.match(
    updatedTx.document as string,
    /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/fake-bucket\/o\/organizations%2Forg-1%2Fdocuments%2Ftx-1%2Fticket\.pdf\?alt=media&token=/
  );
  const updatedPending = docs['organizations/org-1/pendingDocuments/pending-1'] as Record<string, unknown>;
  const updatedPendingFile = updatedPending.file as Record<string, unknown>;
  assert.equal(
    updatedPendingFile.finalStoragePath,
    'organizations/org-1/documents/tx-1/ticket.pdf'
  );
});

test('POST /api/pending-documents/relink-document crea un download token quan el desti no en te', async () => {
  const docs: Record<string, FakeDocData> = {
    'organizations/org-1/pendingDocuments/pending-1': {
      matchedTransactionId: 'tx-1',
      file: {
        filename: 'ticket.pdf',
        storagePath: 'organizations/org-1/pendingDocuments/pending-1/ticket.pdf',
      },
    },
    'organizations/org-1/transactions/tx-1': {
      document: null,
    },
  };

  const bucket = new FakeBucket({
    'organizations/org-1/pendingDocuments/pending-1/ticket.pdf': 'ticket-data',
  });

  const response = await handleRelinkDocumentPost(
    makeRequest({
      orgId: 'org-1',
      pendingId: 'pending-1',
    }),
    {
      ...makeDeps({ docs }),
      getAdminStorageFn: () => bucket as any,
      validateUserMembershipFn: async () => ({
        valid: true,
        role: 'user',
        userOverrides: null,
        userGrants: null,
      }) as any,
    }
  );

  assert.equal(response.status, 200);
  const updatedTx = docs['organizations/org-1/transactions/tx-1'] as Record<string, unknown>;
  const documentUrl = updatedTx.document;
  assert.equal(typeof documentUrl, 'string');
  assert.match(
    documentUrl as string,
    /^https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/fake-bucket\/o\/organizations%2Forg-1%2Fdocuments%2Ftx-1%2Fticket\.pdf\?alt=media&token=/
  );
  const destState = bucket.files.get('organizations/org-1/documents/tx-1/ticket.pdf');
  assert.equal(typeof destState?.metadata.firebaseStorageDownloadTokens, 'string');
  assert.ok((destState?.metadata.firebaseStorageDownloadTokens as string).length > 0);
});

test('POST /api/pending-documents/relink-document reutilitza el token existent si el desti ja existeix', async () => {
  const docs: Record<string, FakeDocData> = {
    'organizations/org-1/pendingDocuments/pending-1': {
      matchedTransactionId: 'tx-1',
      file: {
        filename: 'ticket.pdf',
        storagePath: 'organizations/org-1/pendingDocuments/pending-1/ticket.pdf',
        finalStoragePath: 'organizations/org-1/documents/tx-1/ticket.pdf',
      },
    },
    'organizations/org-1/transactions/tx-1': {
      document: null,
    },
  };

  const bucket = new FakeBucket({
    'organizations/org-1/documents/tx-1/ticket.pdf': {
      content: 'ready',
      metadata: {
        firebaseStorageDownloadTokens: 'existing-token',
      },
    },
  });

  const response = await handleRelinkDocumentPost(
    makeRequest({
      orgId: 'org-1',
      pendingId: 'pending-1',
    }),
    {
      ...makeDeps({ docs }),
      getAdminStorageFn: () => bucket as any,
      validateUserMembershipFn: async () => ({
        valid: true,
        role: 'user',
        userOverrides: null,
        userGrants: null,
      }) as any,
    }
  );

  assert.equal(response.status, 200);
  const updatedTx = docs['organizations/org-1/transactions/tx-1'] as Record<string, unknown>;
  assert.equal(
    updatedTx.document,
    'https://firebasestorage.googleapis.com/v0/b/fake-bucket/o/organizations%2Forg-1%2Fdocuments%2Ftx-1%2Fticket.pdf?alt=media&token=existing-token'
  );
  const destState = bucket.files.get('organizations/org-1/documents/tx-1/ticket.pdf');
  assert.equal(destState?.metadata.firebaseStorageDownloadTokens, 'existing-token');
});

test('POST /api/pending-documents/relink-document bloqueja si el pending apunta a un fitxer d una altra organitzacio', async () => {
  const response = await handleRelinkDocumentPost(
    makeRequest({
      orgId: 'org-1',
      pendingId: 'pending-1',
    }),
    makeDeps({
      docs: {
        'organizations/org-1/members/user-1': {
          role: 'admin',
        },
        'organizations/org-1/pendingDocuments/pending-1': {
          matchedTransactionId: 'tx-1',
          file: {
            filename: 'ticket.pdf',
            storagePath: 'organizations/org-2/pendingDocuments/pending-x/secret.pdf',
          },
        },
        'organizations/org-1/transactions/tx-1': {
          document: null,
        },
      },
      files: {
        'organizations/org-2/pendingDocuments/pending-x/secret.pdf': 'secret',
      },
    })
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'El document pendent referencia un fitxer fora de la seva organització.',
    code: 'PENDING_DOCUMENT_FILE_FORBIDDEN',
  });
});
