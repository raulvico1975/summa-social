import assert from 'node:assert/strict';
import test from 'node:test';

import { NextRequest } from 'next/server';
import type { MembershipValidation } from '@/lib/api/admin-sdk';
import { handleFiscalReturnExceptionPost } from '@/app/api/fiscal/returns/exception/route';

const adminMembership: MembershipValidation = {
  valid: true,
  role: 'admin',
  userOverrides: null,
  userGrants: null,
};
const viewerMembership: MembershipValidation = {
  valid: true,
  role: 'viewer',
  userOverrides: null,
  userGrants: null,
};

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost/api/fiscal/returns/exception', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token' },
    body: JSON.stringify(body),
  });
}

function fakeDb(transaction: Record<string, unknown> | null) {
  const writes: Array<Record<string, unknown>> = [];
  return {
    writes,
    doc(path: string) {
      assert.equal(path, 'organizations/org-1/transactions/return-1');
      return {
        async get() {
          return {
            exists: transaction !== null,
            data: () => transaction ?? undefined,
          };
        },
        async update(payload: Record<string, unknown>) {
          writes.push(payload);
        },
      };
    },
  };
}

const activeReturn = {
  id: 'return-1',
  amount: -100,
  transactionType: 'return',
  archivedAt: null,
  isRemittance: false,
};

test('exception route: Admin crea una excepció amb UID i timestamp del servidor', async () => {
  const db = fakeDb(activeReturn);
  const response = await handleFiscalReturnExceptionPost(request({
    organizationId: 'org-1',
    transactionId: 'return-1',
    operation: 'approve',
    reason: 'Incidència històrica documentada',
    approvedByUid: 'client-forged',
    approvedAt: 'client-forged',
  }), {
    verifyIdTokenFn: async () => ({ uid: 'admin-1' }),
    getAdminDbFn: () => db as never,
    validateUserMembershipFn: async () => adminMembership,
    isSuperAdminFn: async () => false,
    nowFn: () => '2026-08-24T17:00:00.000Z',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(db.writes, [{
    returnFiscalException: {
      reason: 'Incidència històrica documentada',
      approvedAt: '2026-08-24T17:00:00.000Z',
      approvedByUid: 'admin-1',
    },
  }]);
});

test('exception route: viewer no pot crear ni revocar', async () => {
  const db = fakeDb(activeReturn);
  const response = await handleFiscalReturnExceptionPost(request({
    organizationId: 'org-1',
    transactionId: 'return-1',
    operation: 'create',
    reason: 'Motiu suficient',
  }), {
    verifyIdTokenFn: async () => ({ uid: 'viewer-1' }),
    getAdminDbFn: () => db as never,
    validateUserMembershipFn: async () => viewerMembership,
    isSuperAdminFn: async () => false,
    nowFn: () => '2026-08-24T17:00:00.000Z',
  });

  assert.equal(response.status, 403);
  assert.equal(db.writes.length, 0);
});

test('exception route: SuperAdmin pot aprovar i l’operació revoke escriu null', async () => {
  const db = fakeDb(activeReturn);
  const response = await handleFiscalReturnExceptionPost(request({
    orgId: 'org-1',
    transactionId: 'return-1',
    operation: 'revoke',
  }), {
    verifyIdTokenFn: async () => ({ uid: 'super-1' }),
    getAdminDbFn: () => db as never,
    validateUserMembershipFn: async () => ({ ...viewerMembership, valid: false, role: null }),
    isSuperAdminFn: async () => true,
    nowFn: () => '2026-08-24T17:00:00.000Z',
  });

  assert.equal(response.status, 200);
  assert.deepEqual(db.writes, [{ returnFiscalException: null }]);
});

test('exception route: rebutja motiu buit, transacció arxivada, pare de remesa o d’una altra organització', async () => {
  const cases = [
    { transaction: activeReturn, body: { reason: '  ' }, code: 'RETURN_EXCEPTION_REASON_REQUIRED' },
    { transaction: { ...activeReturn, archivedAt: '2026-08-01T00:00:00.000Z' }, body: { reason: 'Motiu' }, code: 'INVALID_RETURN_TRANSACTION' },
    { transaction: { ...activeReturn, isRemittance: true, remittanceType: 'returns' }, body: { reason: 'Motiu' }, code: 'INVALID_RETURN_TRANSACTION' },
    { transaction: { ...activeReturn, organizationId: 'org-other' }, body: { reason: 'Motiu' }, code: 'TRANSACTION_ORG_MISMATCH' },
  ];

  for (const scenario of cases) {
    const db = fakeDb(scenario.transaction);
    const response = await handleFiscalReturnExceptionPost(request({
      organizationId: 'org-1', transactionId: 'return-1', operation: 'create', ...scenario.body,
    }), {
      verifyIdTokenFn: async () => ({ uid: 'admin-1' }),
      getAdminDbFn: () => db as never,
      validateUserMembershipFn: async () => adminMembership,
      isSuperAdminFn: async () => false,
      nowFn: () => '2026-08-24T17:00:00.000Z',
    });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, scenario.code);
    assert.equal(db.writes.length, 0);
  }
});
