import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb, validateUserMembership, verifyIdToken } from '@/lib/api/admin-sdk';
import {
  memberPermissionsDocPath,
  validateAndCanonicalizeUserPermissionWrite,
} from '@/lib/permissions-write';

interface UpdateUserPermissionsBody {
  orgId: string;
  userId: string;
  userOverrides?: {
    deny?: string[] | null;
  } | null;
  userGrants?: string[] | null;
}

interface UpdateUserPermissionsResponse {
  success: boolean;
  code?: string;
  error?: string;
  path?: string;
  userOverrides?: { deny: string[] } | null;
  userGrants?: string[] | null;
}

export async function POST(request: NextRequest) {
  const auth = await verifyIdToken(request);
  if (!auth) {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'UNAUTHORIZED', error: 'No autenticat' },
      { status: 401 }
    );
  }

  let body: UpdateUserPermissionsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'INVALID_BODY', error: 'Body invàlid' },
      { status: 400 }
    );
  }

  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  if (!orgId) {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'MISSING_ORG_ID', error: 'orgId obligatori' },
      { status: 400 }
    );
  }
  if (!userId) {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'MISSING_USER_ID', error: 'userId obligatori' },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const actorMembership = await validateUserMembership(db, auth.uid, orgId);
  if (!actorMembership.valid) {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'NOT_MEMBER', error: 'No ets membre de l organització' },
      { status: 403 }
    );
  }
  if (actorMembership.role !== 'admin') {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'FORBIDDEN', error: 'Només admins poden editar permisos d usuari' },
      { status: 403 }
    );
  }

  const memberPath = memberPermissionsDocPath(orgId, userId);
  const memberRef = db.doc(memberPath);
  const memberSnap = await memberRef.get();
  if (!memberSnap.exists) {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'MEMBER_NOT_FOUND', error: 'Membre no trobat' },
      { status: 404 }
    );
  }

  const memberData = memberSnap.data() as Record<string, unknown> | undefined;
  const memberRole = typeof memberData?.role === 'string' ? memberData.role : null;
  if (memberRole !== 'user') {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      { success: false, code: 'TARGET_ROLE_NOT_USER', error: 'Només es poden editar permisos granulars de rol user' },
      { status: 400 }
    );
  }

  const validation = validateAndCanonicalizeUserPermissionWrite({
    deny: body.userOverrides?.deny ?? [],
    grants: body.userGrants ?? [],
  });
  if (!validation.ok) {
    return NextResponse.json<UpdateUserPermissionsResponse>(
      {
        success: false,
        code: validation.error.code,
        error: validation.error.details?.length
          ? `${validation.error.message} (${validation.error.details.join(', ')})`
          : validation.error.message,
      },
      { status: 400 }
    );
  }

  const { deny, grants } = validation.value;
  const updatePayload: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp(),
    userOverrides: deny.length > 0 ? { deny } : FieldValue.delete(),
    userGrants: grants.length > 0 ? grants : FieldValue.delete(),
  };

  await memberRef.update(updatePayload);

  return NextResponse.json<UpdateUserPermissionsResponse>({
    success: true,
    path: memberPath,
    userOverrides: deny.length > 0 ? { deny } : null,
    userGrants: grants.length > 0 ? grants : null,
  });
}
