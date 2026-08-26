import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import {
  handleCertificateSummaryPost,
  type CertificateSummaryDeps,
} from '@/app/api/fiscal/certificates/summary/handler';
import type { MembershipValidation } from '@/lib/api/admin-sdk';
import type { Transaction } from '@/lib/data';

const adminMembership: MembershipValidation = {
  valid: true,
  role: 'admin',
  userOverrides: null,
  userGrants: null,
};

function request() {
  return new NextRequest('http://localhost/api/fiscal/certificates/summary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify({ organizationId: 'org-1', year: '2026' }),
  });
}

function fakeDb() {
  return {
    collection() {
      return {
        where() {
          return { async get() { return { docs: [] }; } };
        },
      };
    },
    doc() {
      return { async get() { return { exists: false, data: () => undefined }; } };
    },
  };
}

const unresolvedReturn: Transaction = {
  id: 'return-1', date: '2026-08-01', description: 'Devolució', amount: -100,
  category: null, document: null, transactionType: 'return', contactId: null,
};

function deps(readinessTransactions: Transaction[]): CertificateSummaryDeps {
  return {
    verifyIdTokenFn: async () => ({ uid: 'admin-1' }),
    getAdminDbFn: () => fakeDb() as never,
    validateUserMembershipFn: async () => adminMembership,
    getUnifiedFiscalDonationsWithAdminFn: async () => [],
    getTransactionsForReadinessFn: async () => readinessTransactions,
  };
}

test('certificates/summary: bloqueja abans de construir summaries', async () => {
  const response = await handleCertificateSummaryPost(request(), deps([unresolvedReturn]));

  assert.equal(response.status, 409);
  const body = await response.json();
  assert.equal(body.code, 'UNRESOLVED_FISCAL_RETURNS');
  assert.equal(body.donorSummaries, undefined);
});

test('certificates/summary: preserva la forma de resposta quan readiness és correcte', async () => {
  const response = await handleCertificateSummaryPost(request(), deps([]));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    year: '2026',
    donorSummaries: [],
    totalReturns: 0,
  });
});
