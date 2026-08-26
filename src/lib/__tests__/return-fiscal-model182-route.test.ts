import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import { handleModel182Post } from '@/app/api/fiscal/model182/generate/route';
import type { Transaction } from '@/lib/data';

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/fiscal/model182/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });
}

function fakeDb() {
  return {
    doc(path: string) {
      if (path.endsWith('/members/admin-1')) {
        return { async get() { return { exists: true, data: () => ({ role: 'admin' }) }; } };
      }
      return { async get() { return { exists: true, data: () => ({ name: 'Org' }) }; } };
    },
    collection(path: string) {
      assert.match(path, /contacts|transactions/);
      return { async get() { return { docs: [] }; } };
    },
  };
}

const unresolvedReturn: Transaction = {
  id: 'return-1',
  date: '2026-08-01',
  description: 'Devolució',
  amount: -100,
  category: null,
  document: null,
  contactId: null,
  transactionType: 'return',
};

test('Model 182: bloqueja abans de construir candidats i sense sortida parcial', async () => {
  let candidatesBuilt = false;
  const response = await handleModel182Post(request({ orgId: 'org-1', year: 2026 }), {
    verifyIdTokenFn: async () => ({ uid: 'admin-1' }),
    getAdminDbFn: () => fakeDb() as never,
    getTransactionsForReadinessFn: async () => [unresolvedReturn],
    getUnifiedFiscalDonationsWithAdminFn: async () => [],
    buildModel182CandidatesFn: (...args) => {
      candidatesBuilt = true;
      return [] as never;
    },
    generateModel182AEATFileFn: () => ({}) as never,
  });

  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'UNRESOLVED_FISCAL_RETURNS');
  assert.equal(candidatesBuilt, false);
});

test('Model 182: una devolució amb excepció completa permet continuar', async () => {
  let candidatesBuilt = false;
  const resolved = {
    ...unresolvedReturn,
    returnFiscalException: {
      reason: 'Cas històric documentat',
      approvedAt: '2026-08-02T10:00:00.000Z',
      approvedByUid: 'admin-1',
    },
  };
  const response = await handleModel182Post(request({ orgId: 'org-1', year: 2026 }), {
    verifyIdTokenFn: async () => ({ uid: 'admin-1' }),
    getAdminDbFn: () => fakeDb() as never,
    getTransactionsForReadinessFn: async () => [resolved],
    getUnifiedFiscalDonationsWithAdminFn: async () => [],
    buildModel182CandidatesFn: () => {
      candidatesBuilt = true;
      return [] as never;
    },
    generateModel182AEATFileFn: () => ({ ok: true }) as never,
  });

  assert.equal(response.status, 200);
  assert.equal(candidatesBuilt, true);
});
