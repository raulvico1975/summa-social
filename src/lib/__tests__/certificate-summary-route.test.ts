import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { handleCertificateSummaryPost } from '@/app/api/fiscal/certificates/summary/handler';
import type { Transaction } from '@/lib/data';

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/fiscal/certificates/summary', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer fake-token',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

class FakeDocSnapshot {
  constructor(
    readonly id: string,
    private readonly dataValue: Record<string, unknown> | null
  ) {}

  get exists() {
    return this.dataValue !== null;
  }

  data() {
    return this.dataValue ?? undefined;
  }
}

class FakeDocRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    private readonly path: string
  ) {}

  async get() {
    const id = this.path.split('/').at(-1) ?? this.path;
    return new FakeDocSnapshot(id, this.store.get(this.path) ?? null);
  }
}

class FakeCollectionRef {
  constructor(
    private readonly store: Map<string, Record<string, unknown>>,
    private readonly path: string,
    private readonly filters: Array<{ field: string; value: unknown }> = []
  ) {}

  where(field: string, _op: string, value: unknown) {
    return new FakeCollectionRef(this.store, this.path, [...this.filters, { field, value }]);
  }

  async get() {
    const prefix = `${this.path}/`;
    let docs = Array.from(this.store.entries())
      .filter(([docPath]) => docPath.startsWith(prefix))
      .filter(([docPath]) => !docPath.slice(prefix.length).includes('/'))
      .map(([docPath, data]) => ({
        id: docPath.slice(prefix.length),
        data: () => data,
      }));

    for (const filter of this.filters) {
      docs = docs.filter((doc) => doc.data()[filter.field] === filter.value);
    }

    return { docs };
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
}

function makeStore() {
  return new Map<string, Record<string, unknown>>([
    ['organizations/org-1/contacts/donor-1', {
      type: 'donor',
      name: 'Donant Test',
      taxId: '12345678Z',
      zipCode: '08001',
      donorType: 'individual',
      membershipType: 'recurring',
      email: 'donant@example.org',
      iban: 'ES9121000418450200051332',
      notes: 'no exposar',
      createdAt: '2026-01-01',
    }],
  ]);
}

const fiscalTransactions: Transaction[] = [
  {
    id: 'real-tx-id',
    date: '2025-01-15',
    description: 'Concepte bancari sensible',
    note: 'nota sensible',
    amount: 120,
    category: 'secret',
    document: 'factura.pdf',
    contactId: 'donor-1',
    transactionType: 'donation',
  },
];

function makeDeps(input: {
  deny?: string[];
  transactions?: Transaction[];
}) {
  const store = makeStore();
  return {
    verifyIdTokenFn: async () => ({ uid: 'uid-1', email: 'user@example.org' }),
    getAdminDbFn: () => new FakeDb(store) as never,
    validateUserMembershipFn: async () => ({
      valid: true,
      role: 'user',
      userOverrides: input.deny ? { deny: input.deny } : null,
      userGrants: null,
    }) as never,
    getUnifiedFiscalDonationsWithAdminFn: async () => input.transactions ?? fiscalTransactions,
  };
}

test('certificate summary route allows fiscal certificate permission without moviments.read', async () => {
  const response = await handleCertificateSummaryPost(
    makeRequest({ organizationId: 'org-1', year: '2025' }),
    makeDeps({ deny: ['moviments.read'] })
  );

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.donorSummaries.length, 1);
  assert.equal(body.donorSummaries[0].totalAmount, 120);
  assert.equal(body.donorSummaries[0].donations[0].id.startsWith('cert-donation-'), true);
  assert.equal('description' in body.donorSummaries[0].donations[0], false);
  assert.equal('document' in body.donorSummaries[0].donations[0], false);
  assert.equal('iban' in body.donorSummaries[0].donor, false);
  assert.equal('notes' in body.donorSummaries[0].donor, false);
});

test('certificate summary route denies users without fiscal.certificats.generar', async () => {
  const response = await handleCertificateSummaryPost(
    makeRequest({ organizationId: 'org-1', year: '2025' }),
    makeDeps({ deny: ['fiscal.certificats.generar'] })
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), {
    success: false,
    error: 'PERMISSION_DENIED',
    code: 'FISCAL_CERTIFICATS_GENERAR_REQUIRED',
  });
});

test('certificate summary route does not accept moviments.read as substitute permission', async () => {
  const response = await handleCertificateSummaryPost(
    makeRequest({ organizationId: 'org-1', year: '2025' }),
    makeDeps({ deny: ['fiscal.certificats.generar'] })
  );

  assert.equal(response.status, 403);
});
