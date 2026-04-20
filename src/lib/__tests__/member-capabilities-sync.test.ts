import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildStoredMemberRoleFields,
  computeStoredMemberCapabilities,
} from '@/lib/member-capabilities-sync';

test('persisted capabilities: user default keeps moviments.read only', () => {
  const capabilities = computeStoredMemberCapabilities({ role: 'user' });

  assert.deepEqual(capabilities, { 'moviments.read': true });
});

test('persisted capabilities: deny moviments.read removes client access', () => {
  const capabilities = computeStoredMemberCapabilities({
    role: 'user',
    userOverrides: { deny: ['moviments.read'] },
  });

  assert.deepEqual(capabilities, {});
});

test('persisted capabilities: explicit grants extend the conservative default', () => {
  const capabilities = computeStoredMemberCapabilities({
    role: 'user',
    userGrants: ['informes.exportar'],
  });

  assert.deepEqual(capabilities, {
    'moviments.read': true,
    'informes.exportar': true,
  });
});

test('role change fields reset granular user permissions and resync capabilities', () => {
  const fields = buildStoredMemberRoleFields('viewer');

  assert.deepEqual(fields, {
    role: 'viewer',
    capabilities: { 'moviments.read': true },
    userOverrides: null,
    userGrants: null,
  });
});
