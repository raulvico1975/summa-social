import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyOverrides,
  canAccessMovimentsRoute,
  canReadBankInProjectes,
  getRoleDefaults,
  resolveEffectivePermissions,
} from '@/lib/permissions';

test('criterion 1: user without moviments.read sees no bank anywhere', () => {
  const permissions = resolveEffectivePermissions({
    role: 'user',
    userOverrides: { deny: ['moviments.read'] },
  });

  assert.equal(canAccessMovimentsRoute(permissions), false);
  assert.equal(canReadBankInProjectes(permissions), false);
});

test('criterion 2: expenseInput never sees bank even if moviments.read is true', () => {
  const permissions = resolveEffectivePermissions({
    role: 'user',
    userOverrides: { deny: ['projectes.manage'] },
    userGrants: ['projectes.expenseInput'],
  });

  assert.equal(permissions['moviments.read'], true);
  assert.equal(permissions['projectes.expenseInput'], true);
  assert.equal(canReadBankInProjectes(permissions), false);
});

test('criterion 3: projectes.manage + moviments.read false can manage projects but no bank', () => {
  const permissions = resolveEffectivePermissions({
    role: 'user',
    userOverrides: { deny: ['moviments.read'] },
  });

  assert.equal(permissions['projectes.manage'], true);
  assert.equal(canReadBankInProjectes(permissions), false);
});

test('criterion 4: moviments route depends on section, projects bank does not', () => {
  const permissions = resolveEffectivePermissions({
    role: 'user',
    userOverrides: { deny: ['sections.moviments'] },
  });

  assert.equal(permissions['moviments.read'], true);
  assert.equal(permissions['projectes.manage'], true);
  assert.equal(canAccessMovimentsRoute(permissions), false);
  assert.equal(canReadBankInProjectes(permissions), true);
});

test('never grantable families are filtered from user grants', () => {
  const roleDefaults = getRoleDefaults('user');
  const effective = applyOverrides(roleDefaults, { deny: [] }, ['configuracio.manage', 'membres.manage', 'categories.manage']);

  assert.equal(effective['configuracio.manage'], false);
  assert.equal(effective['membres.manage'], false);
  assert.equal(effective['categories.manage'], false);
});

test('project capability remains mutually exclusive', () => {
  const roleDefaults = getRoleDefaults('admin');
  const effective = applyOverrides(roleDefaults, { deny: [] }, ['projectes.expenseInput']);

  assert.equal(effective['projectes.manage'], true);
  assert.equal(effective['projectes.expenseInput'], false);
});
