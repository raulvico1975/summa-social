import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';

import { handleArchiveProjectPost } from '@/app/api/projects/archive/handler';

type DocData = Record<string, unknown> | null;

function makeRequest(body: Record<string, unknown>, withAuth = true) {
  return new NextRequest('http://localhost/api/projects/archive', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(withAuth ? { Authorization: 'Bearer fake-token' } : {}),
    },
    body: JSON.stringify(body),
  });
}

class FakeDocSnapshot {
  constructor(private readonly dataValue: DocData) {}

  get exists() {
    return this.dataValue !== null;
  }

  data() {
    return this.dataValue;
  }
}

class FakeDocRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    readonly path: string
  ) {}

  async get() {
    return new FakeDocSnapshot(this.store.get(this.path) ?? null);
  }

  async update(payload: Record<string, unknown>) {
    const current = this.store.get(this.path);
    if (!current) throw new Error(`missing-doc:${this.path}`);
    this.store.set(this.path, { ...current, ...payload });
  }
}

class FakeBatch {
  private readonly updates: Array<{ ref: FakeDocRef; payload: Record<string, unknown> }> = [];

  update(ref: FakeDocRef, payload: Record<string, unknown>) {
    this.updates.push({ ref, payload });
  }

  async commit() {
    for (const update of this.updates) {
      await update.ref.update(update.payload);
    }
  }
}

class FakeCollectionRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    private readonly path: string,
    private readonly filters: Array<{ field: string; op: string; value: unknown }> = []
  ) {}

  where(field: string, op: string, value: unknown) {
    return new FakeCollectionRef(this.store, this.path, [...this.filters, { field, op, value }]);
  }

  async get() {
    const prefix = `${this.path}/`;
    let docs = Array.from(this.store.entries())
      .filter(([docPath]) => docPath.startsWith(prefix))
      .filter(([docPath]) => !docPath.slice(prefix.length).includes('/'))
      .map(([docPath, data]) => ({
        id: docPath.slice(prefix.length),
        ref: new FakeDocRef(this.store, docPath),
        data: () => data,
      }));

    for (const filter of this.filters) {
      docs = docs.filter((doc) => doc.data()[filter.field] === filter.value);
    }

    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
    };
  }
}

class FakeDb {
  constructor(private readonly store: Map<string, Record<string, unknown>>) {}

  doc(path: string) {
    return new FakeDocRef(this.store, path);
  }

  collection(path: string) {
    return new FakeCollectionRef(this.store, path);
  }

  batch() {
    return new FakeBatch();
  }
}

function makeDeps(
  store: Map<string, Record<string, unknown>>,
  membership: {
    valid: boolean;
    role: 'admin' | 'user' | 'viewer' | null;
    userOverrides: { deny?: string[] } | null;
    userGrants: string[] | null;
  } = {
    valid: true,
    role: 'admin',
    userOverrides: null,
    userGrants: null,
  },
  authenticated = true
) {
  return {
    verifyIdTokenFn: async () => authenticated ? { uid: 'uid-1', email: 'user@test.com' } : null,
    getAdminDbFn: () => new FakeDb(store) as any,
    validateUserMembershipFn: async () => membership as any,
  };
}

test('projects archive API rejects missing token', async () => {
  const response = await handleArchiveProjectPost(
    makeRequest({ orgId: 'org-1', fromProjectId: 'project-1' }, false),
    makeDeps(new Map(), { valid: false, role: null, userOverrides: null, userGrants: null }, false)
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'No autenticat',
    code: 'UNAUTHORIZED',
  });
});

test('projects archive API rejects viewer without projectes.manage', async () => {
  const store = new Map<string, Record<string, unknown>>();
  store.set('organizations/org-1/projects/project-1', { name: 'Eix 1' });

  const response = await handleArchiveProjectPost(
    makeRequest({ orgId: 'org-1', fromProjectId: 'project-1' }),
    makeDeps(store, { valid: true, role: 'viewer', userOverrides: null, userGrants: null })
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'PERMISSION_DENIED',
    code: 'PROJECTES_MANAGE_REQUIRED',
  });
});

test('projects archive API rejects user with projectes.manage denied', async () => {
  const store = new Map<string, Record<string, unknown>>();
  store.set('organizations/org-1/projects/project-1', { name: 'Eix 1' });

  const response = await handleArchiveProjectPost(
    makeRequest({ orgId: 'org-1', fromProjectId: 'project-1' }),
    makeDeps(store, {
      valid: true,
      role: 'user',
      userOverrides: { deny: ['projectes.manage'] },
      userGrants: null,
    })
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'PERMISSION_DENIED',
    code: 'PROJECTES_MANAGE_REQUIRED',
  });
});

test('projects archive API allows admin with projectes.manage', async () => {
  const store = new Map<string, Record<string, unknown>>();
  store.set('organizations/org-1/projects/project-1', { name: 'Eix 1' });

  const response = await handleArchiveProjectPost(
    makeRequest({ orgId: 'org-1', fromProjectId: 'project-1' }),
    makeDeps(store)
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    reassignedCount: 0,
  });
  assert.equal(store.get('organizations/org-1/projects/project-1')?.archivedByUid, 'uid-1');
  assert.equal(store.get('organizations/org-1/projects/project-1')?.archivedFromAction, 'archive-project-api');
});

test('projects archive API allows user with effective projectes.manage and reassigns transactions', async () => {
  const store = new Map<string, Record<string, unknown>>();
  store.set('organizations/org-1/projects/from-project', { name: 'Origen' });
  store.set('organizations/org-1/projects/to-project', { name: 'Desti' });
  store.set('organizations/org-1/transactions/tx-1', { projectId: 'from-project', amount: 10 });
  store.set('organizations/org-1/transactions/tx-2', { projectId: 'from-project', amount: 20, archivedAt: null });
  store.set('organizations/org-1/transactions/tx-archived', {
    projectId: 'from-project',
    amount: 30,
    archivedAt: '2026-01-01T00:00:00.000Z',
  });

  const response = await handleArchiveProjectPost(
    makeRequest({ orgId: 'org-1', fromProjectId: 'from-project', toProjectId: 'to-project' }),
    makeDeps(store, { valid: true, role: 'user', userOverrides: null, userGrants: ['projectes.manage'] })
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    reassignedCount: 2,
  });
  assert.equal(store.get('organizations/org-1/transactions/tx-1')?.projectId, 'to-project');
  assert.equal(store.get('organizations/org-1/transactions/tx-2')?.projectId, 'to-project');
  assert.equal(store.get('organizations/org-1/transactions/tx-archived')?.projectId, 'from-project');
});
