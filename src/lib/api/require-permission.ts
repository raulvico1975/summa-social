import { NextResponse } from 'next/server';
import type { MembershipValidation } from '@/lib/api/admin-sdk';
import { resolveEffectivePermissions, type PermissionMap } from '@/lib/permissions';

interface PermissionCheck {
  code: string;
  check: (permissions: PermissionMap) => boolean;
}

export function getMembershipPermissions(membership: MembershipValidation): PermissionMap {
  return resolveEffectivePermissions({
    role: membership.role,
    userOverrides: membership.userOverrides,
    userGrants: membership.userGrants,
  });
}

export function requirePermission(
  membership: MembershipValidation,
  permissionCheck: PermissionCheck
) {
  if (!membership.valid) {
    return NextResponse.json(
      { success: false as const, error: 'NOT_MEMBER', code: 'NOT_MEMBER' },
      { status: 403 }
    );
  }

  const permissions = getMembershipPermissions(membership);
  if (!permissionCheck.check(permissions)) {
    return NextResponse.json(
      { success: false as const, error: 'PERMISSION_DENIED', code: permissionCheck.code },
      { status: 403 }
    );
  }

  return null;
}
