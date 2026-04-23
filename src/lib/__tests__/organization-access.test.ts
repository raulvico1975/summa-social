import test from 'node:test';
import assert from 'node:assert/strict';
import { OrganizationAccessDeniedError, resolveOrganizationAccessRole } from '@/lib/organization-access';

test('organization access requires canonical membership when user is not superadmin', () => {
  assert.throws(
    () =>
      resolveOrganizationAccessRole({
        memberRole: null,
        isSuperAdmin: false,
        isDemoMode: false,
      }),
    OrganizationAccessDeniedError,
  );
});

test('organization access allows superadmin without membership', () => {
  const role = resolveOrganizationAccessRole({
    memberRole: null,
    isSuperAdmin: true,
    isDemoMode: false,
  });

  assert.equal(role, 'admin');
});

test('organization access preserves real member role', () => {
  const role = resolveOrganizationAccessRole({
    memberRole: 'user',
    isSuperAdmin: false,
    isDemoMode: false,
  });

  assert.equal(role, 'user');
});
