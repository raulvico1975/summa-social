import type { OrganizationRole } from '@/lib/data';

export class OrganizationAccessDeniedError extends Error {
  constructor(message: string = 'No tens accés a aquesta organització') {
    super(message);
    this.name = 'OrganizationAccessDeniedError';
  }
}

type ResolveOrganizationAccessRoleInput = {
  memberRole: OrganizationRole | null;
  isSuperAdmin: boolean;
  isDemoMode: boolean;
};

export function resolveOrganizationAccessRole({
  memberRole,
  isSuperAdmin,
  isDemoMode,
}: ResolveOrganizationAccessRoleInput): OrganizationRole {
  if (memberRole) {
    return memberRole;
  }

  if (isDemoMode || isSuperAdmin) {
    return 'admin';
  }

  throw new OrganizationAccessDeniedError();
}
