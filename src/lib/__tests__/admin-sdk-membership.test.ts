import assert from 'node:assert/strict';
import test from 'node:test';
import type { Firestore } from 'firebase-admin/firestore';
import { validateUserMembership } from '@/lib/api/admin-sdk';

function fakeDb(entries: Record<string, Record<string, unknown>>): Firestore {
  return {
    doc(path: string) {
      return {
        async get() {
          const value = entries[path];
          return {
            exists: value !== undefined,
            data: () => value,
          };
        },
      };
    },
  } as unknown as Firestore;
}

test('SuperAdmin prevails over a local viewer membership', async () => {
  const db = fakeDb({
    'organizations/org-1/members/super-1': { role: 'viewer' },
    'systemSuperAdmins/super-1': { createdAt: '2026-07-10T00:00:00.000Z' },
  });

  const membership = await validateUserMembership(db, 'super-1', 'org-1');

  assert.deepEqual(membership, {
    valid: true,
    role: 'admin',
    userOverrides: null,
    userGrants: null,
  });
});

test('SuperAdmin prevails over a restricted local user membership', async () => {
  const db = fakeDb({
    'organizations/org-1/members/super-1': {
      role: 'user',
      userOverrides: { deny: ['actions.editar'] },
      userGrants: ['moviments.read'],
    },
    'systemSuperAdmins/super-1': { createdAt: '2026-07-10T00:00:00.000Z' },
  });

  const membership = await validateUserMembership(db, 'super-1', 'org-1');

  assert.equal(membership.role, 'admin');
  assert.equal(membership.userOverrides, null);
  assert.equal(membership.userGrants, null);
});

test('ordinary members keep their local role and permissions', async () => {
  const db = fakeDb({
    'organizations/org-1/members/user-1': {
      role: 'user',
      userOverrides: { deny: ['actions.editar'] },
      userGrants: ['moviments.read'],
    },
  });

  const membership = await validateUserMembership(db, 'user-1', 'org-1');

  assert.deepEqual(membership, {
    valid: true,
    role: 'user',
    userOverrides: { deny: ['actions.editar'] },
    userGrants: ['moviments.read'],
  });
});

test('unknown stored roles fail closed as viewer', async () => {
  const db = fakeDb({
    'organizations/org-1/members/user-1': { role: 'editor' },
  });

  const membership = await validateUserMembership(db, 'user-1', 'org-1');

  assert.equal(membership.valid, true);
  assert.equal(membership.role, 'viewer');
});

test('unknown users remain invalid', async () => {
  const membership = await validateUserMembership(fakeDb({}), 'missing', 'org-1');

  assert.deepEqual(membership, {
    valid: false,
    role: null,
    userOverrides: null,
    userGrants: null,
  });
});
