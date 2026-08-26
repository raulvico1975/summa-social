import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applyOverrides, resolveEffectivePermissions } from '@/lib/permissions';
import { getPermissionProfile, getPermissionProfileIds, getProfiledPermissionKeys } from '@/lib/permission-profiles';

function effective(profile: Parameters<typeof getPermissionProfile>[0]) {
  const state = getPermissionProfile(profile);
  return resolveEffectivePermissions({
    role: state.role,
    userOverrides: state.userOverrides,
    userGrants: state.userGrants,
  });
}

describe('permission profiles', () => {
  it('exposa els quatre perfils funcionals previstos', () => {
    assert.deepEqual(getPermissionProfileIds(), ['admin', 'socis-remeses', 'projectes', 'custom']);
  });

  it('manté l administrador global amb accés complet', () => {
    const permissions = effective('admin');

    assert.equal(permissions['sections.configuracio'], true);
    assert.equal(permissions['informes.exportar'], true);
    assert.equal(permissions['fiscal.model182.generar'], true);
    assert.equal(permissions['remeses.generar'], true);
  });

  it('separa socis i remeses del llibre bancari i dels projectes', () => {
    const profile = getPermissionProfile('socis-remeses');
    const permissions = effective('socis-remeses');

    assert.equal(profile.permissionProfile, 'socis-remeses');
    assert.equal(permissions['sections.donants'], true);
    assert.equal(permissions['socis.read'], true);
    assert.equal(permissions['socis.editar'], true);
    assert.equal(permissions['remeses.preparar'], true);
    assert.equal(permissions['remeses.generar'], true);
    assert.equal(permissions['remeses.desfer'], false);
    assert.equal(permissions['moviments.read'], false);
    assert.equal(permissions['moviments.editar'], false);
    assert.equal(permissions['informes.exportar'], false);
    assert.equal(permissions['fiscal.model182.generar'], false);
    assert.equal(permissions['projectes.manage'], false);
  });

  it('limita el perfil de projectes al mòdul de projectes', () => {
    const profile = getPermissionProfile('projectes');
    const permissions = effective('projectes');

    assert.equal(profile.permissionProfile, 'projectes');
    assert.equal(permissions['sections.projectes'], true);
    assert.equal(permissions['projectes.manage'], true);
    assert.equal(permissions['moviments.read'], false);
    assert.equal(permissions['sections.donants'], false);
    assert.equal(permissions['socis.read'], false);
    assert.equal(permissions['remeses.generar'], false);
  });

  it('no altera cap permís existent si no s aplica cap preset', () => {
    assert.equal(getPermissionProfile('custom').permissionProfile, undefined);
    const permissions = effective('custom');
    const expected = applyOverrides(
      resolveEffectivePermissions({ role: 'user' }),
      null,
      null,
    );

    assert.deepEqual(permissions, expected);
  });

  it('manté el catàleg complet disponible per a la futura UI de perfils', () => {
    assert.ok(getProfiledPermissionKeys().includes('remeses.desfer'));
    assert.ok(getProfiledPermissionKeys().includes('socis.editar'));
  });
});
