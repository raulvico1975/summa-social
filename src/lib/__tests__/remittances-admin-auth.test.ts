import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyAdminMembership } from '../fiscal/remittances/admin-auth';

const fakeRequest = {} as any;
const fakeDb = {} as any;

test('verifyAdminMembership: SuperAdmin sense membership -> success', async () => {
  const result = await verifyAdminMembership(fakeRequest, 'org-test', {
    verifyIdTokenFn: async () => ({ uid: 'super-uid', email: 'super@test.com' }),
    getAdminDbFn: () => fakeDb,
    loadMemberDataFn: async () => null,
    isGlobalSuperAdminFn: async () => true,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.uid, 'super-uid');
  }
});

test('verifyAdminMembership: usuari sense membership -> NOT_MEMBER', async () => {
  const result = await verifyAdminMembership(fakeRequest, 'org-test', {
    verifyIdTokenFn: async () => ({ uid: 'user-uid', email: 'user@test.com' }),
    getAdminDbFn: () => fakeDb,
    loadMemberDataFn: async () => null,
    isGlobalSuperAdminFn: async () => false,
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.code, 'NOT_MEMBER');
    assert.equal(result.status, 403);
  }
});

test('verifyAdminMembership: admin membre -> success', async () => {
  const result = await verifyAdminMembership(fakeRequest, 'org-test', {
    verifyIdTokenFn: async () => ({ uid: 'admin-uid', email: 'admin@test.com' }),
    getAdminDbFn: () => fakeDb,
    loadMemberDataFn: async () => ({ role: 'admin' }),
    isGlobalSuperAdminFn: async () => false,
  });

  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.uid, 'admin-uid');
  }
});
