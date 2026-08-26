import {
  CRITICAL_ACTION_KEYS,
  PERMISSION_KEYS,
  PROJECT_CAPABILITY_KEYS,
  REMITTANCE_PERMISSION_KEYS,
  SECTION_PERMISSION_KEYS,
  SOCIETY_PERMISSION_KEYS,
  type PermissionKey,
  type UserPermissionOverrides,
} from '@/lib/permissions';
import type { OrganizationRole } from '@/lib/data';

export type PermissionProfileId = 'admin' | 'socis-remeses' | 'projectes' | 'custom';

export interface PermissionProfileState {
  id: PermissionProfileId;
  role: OrganizationRole;
  userOverrides: UserPermissionOverrides | null;
  userGrants: PermissionKey[] | null;
  /** Només els presets restringits activen les regles modulars. */
  permissionProfile?: Exclude<PermissionProfileId, 'admin' | 'custom'>;
}

const SOCIETY_SECTIONS = new Set<PermissionKey>(['sections.donants']);
const PROJECT_SECTIONS = new Set<PermissionKey>(['sections.projectes']);

function deniedExcept(allowed: Set<PermissionKey>, keys: readonly PermissionKey[]): PermissionKey[] {
  return keys.filter((key) => !allowed.has(key));
}

function userProfile(
  id: Exclude<PermissionProfileId, 'admin' | 'custom'>,
  allowedSections: Set<PermissionKey>,
  grants: readonly PermissionKey[] = [],
): PermissionProfileState {
  const allowed = new Set<PermissionKey>([
    ...allowedSections,
    ...grants,
  ]);
  const denied = [
    ...deniedExcept(allowed, SECTION_PERMISSION_KEYS),
    ...CRITICAL_ACTION_KEYS,
    ...deniedExcept(allowed, PROJECT_CAPABILITY_KEYS),
    ...deniedExcept(allowed, SOCIETY_PERMISSION_KEYS),
    ...deniedExcept(allowed, REMITTANCE_PERMISSION_KEYS),
  ];

  return {
    id,
    role: 'user',
    userOverrides: { deny: Array.from(new Set(denied)) },
    userGrants: Array.from(new Set(grants)),
    permissionProfile: id,
  };
}

/**
 * Presets funcionals sobre el model modular existent.
 *
 * Els presets no s'apliquen automàticament a cap membre. Són una capa de
 * configuració preparada perquè la UI pugui oferir perfils comprensibles
 * sense convertir-los en rols tancats.
 */
export function getPermissionProfile(profile: PermissionProfileId): PermissionProfileState {
  if (profile === 'admin') {
    return {
      id: profile,
      role: 'admin',
      userOverrides: null,
      userGrants: null,
    };
  }

  if (profile === 'socis-remeses') {
    return userProfile(profile, SOCIETY_SECTIONS, [
      ...SOCIETY_PERMISSION_KEYS,
      'remeses.read',
      'remeses.preparar',
      'remeses.generar',
    ]);
  }

  if (profile === 'projectes') {
    return userProfile(profile, PROJECT_SECTIONS, ['projectes.manage']);
  }

  return {
    id: 'custom',
    role: 'user',
    userOverrides: null,
    userGrants: null,
  };
}

export function getPermissionProfileIds(): PermissionProfileId[] {
  return ['admin', 'socis-remeses', 'projectes', 'custom'];
}

/** Claus que els presets han de poder descriure de manera exhaustiva. */
export function getProfiledPermissionKeys(): PermissionKey[] {
  return [...PERMISSION_KEYS];
}

export function isRestrictedPermissionProfile(
  value: unknown
): value is Exclude<PermissionProfileId, 'admin' | 'custom'> {
  return value === 'socis-remeses' || value === 'projectes';
}
