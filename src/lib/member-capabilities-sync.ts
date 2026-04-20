import type { OrganizationRole } from '@/lib/data';
import {
  ROLE_DEFAULT_CAPABILITIES,
  sanitizePermissionList,
  sanitizeUserGrants,
  type UserPermissionOverrides,
} from '@/lib/permissions';

interface StoredMemberCapabilitiesInput {
  role: OrganizationRole;
  userOverrides?: UserPermissionOverrides | null;
  userGrants?: string[] | null;
}

export function computeStoredMemberCapabilities(
  input: StoredMemberCapabilitiesInput
): Record<string, boolean> {
  if (input.role === 'admin') {
    return {};
  }

  const capabilities: Record<string, boolean> = {
    ...(ROLE_DEFAULT_CAPABILITIES[input.role] ?? {}),
  };

  if (input.role !== 'user') {
    return capabilities;
  }

  for (const permission of sanitizeUserGrants(input.userGrants)) {
    capabilities[permission] = true;
  }

  for (const permission of sanitizePermissionList(input.userOverrides?.deny ?? undefined)) {
    delete capabilities[permission];
  }

  return capabilities;
}

export function buildStoredMemberRoleFields(role: OrganizationRole): {
  role: OrganizationRole;
  capabilities: Record<string, boolean>;
  userOverrides: null;
  userGrants: null;
} {
  return {
    role,
    capabilities: computeStoredMemberCapabilities({ role }),
    userOverrides: null,
    userGrants: null,
  };
}
