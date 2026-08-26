import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import {
  handleCertificateEmailPost,
  type CertificateEmailDeps,
} from '@/app/api/certificates/send-email/route';
import type { MembershipValidation } from '@/lib/api/admin-sdk';
import type { Transaction } from '@/lib/data';

const adminMembership: MembershipValidation = {
  valid: true,
  role: 'admin',
  userOverrides: null,
  userGrants: null,
};

function request(overrides: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost/api/certificates/send-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify({
      organizationId: 'org-1',
      year: '2026',
      organizationLanguage: 'ca',
      donors: [{ id: 'donor-1', name: 'Donant', email: '', pdfBase64: 'client-pdf' }],
      ...overrides,
    }),
  });
}

function fakeDb() {
  return {
    doc(path: string) {
      assert.equal(path, 'organizations/org-1');
      return { async get() { return { exists: true, data: () => ({ name: 'Org', email: '' }) }; } };
    },
    collection() {
      return { async get() { return { docs: [] }; } };
    },
  };
}

const unresolvedReturn: Transaction = {
  id: 'return-1', date: '2026-08-01', description: 'Devolució', amount: -100,
  category: null, document: null, transactionType: 'return', contactId: null,
};

function deps(readinessTransactions: Transaction[]): CertificateEmailDeps {
  return {
    verifyIdTokenFn: async () => ({ uid: 'admin-1' }),
    getAdminDbFn: () => fakeDb() as never,
    validateUserMembershipFn: async () => adminMembership,
    getTransactionsForReadinessFn: async () => readinessTransactions,
  };
}

test('certificates/send-email: bloqueja abans d’enviar i no confia en el PDF client', async () => {
  const response = await handleCertificateEmailPost(request(), deps([unresolvedReturn]));

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.code, 'UNRESOLVED_FISCAL_RETURNS');
});

test('certificates/send-email: si no pot rellegir readiness, bloqueja amb error explícit', async () => {
  const response = await handleCertificateEmailPost(request(), {
    ...deps([]),
    getTransactionsForReadinessFn: async () => {
      throw new Error('read unavailable');
    },
  });

  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, 'FISCAL_READINESS_UNAVAILABLE');
});

test('certificates/send-email: amb readiness correcte conserva el flux sense email si no hi ha destinatari', async () => {
  const response = await handleCertificateEmailPost(request(), deps([]));

  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.success, true);
  assert.equal(body.sent, 0);
  assert.equal(body.skippedNoEmail, 1);
});
