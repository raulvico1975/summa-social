import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  getAdminDb,
  verifyIdToken,
  validateUserMembership,
  BATCH_SIZE,
} from '@/lib/api/admin-sdk';
import { requirePermission } from '@/lib/api/require-permission';

interface ArchiveProjectRequest {
  orgId: string;
  fromProjectId: string;
  toProjectId?: string | null;
}

interface ArchiveProjectResponse {
  success: boolean;
  idempotent?: boolean;
  reassignedCount?: number;
  error?: string;
  code?: string;
}

type ArchiveProjectsRouteDeps = {
  verifyIdTokenFn: typeof verifyIdToken;
  getAdminDbFn: typeof getAdminDb;
  validateUserMembershipFn: typeof validateUserMembership;
};

const defaultDeps: ArchiveProjectsRouteDeps = {
  verifyIdTokenFn: verifyIdToken,
  getAdminDbFn: getAdminDb,
  validateUserMembershipFn: validateUserMembership,
};

export async function handleArchiveProjectPost(
  request: NextRequest,
  deps: ArchiveProjectsRouteDeps = defaultDeps
): Promise<NextResponse<ArchiveProjectResponse>> {
  const startTime = Date.now();

  const authResult = await deps.verifyIdTokenFn(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: 'No autenticat', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  const { uid } = authResult;
  const db = deps.getAdminDbFn();

  let body: ArchiveProjectRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const { orgId, fromProjectId, toProjectId } = body;

  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  if (!fromProjectId) {
    return NextResponse.json(
      { success: false, error: 'fromProjectId és obligatori', code: 'MISSING_FROM_ID' },
      { status: 400 }
    );
  }

  const membership = await deps.validateUserMembershipFn(db, uid, orgId);
  const accessError = requirePermission(membership, {
    code: 'PROJECTES_MANAGE_REQUIRED',
    check: (permissions) => permissions['projectes.manage'],
  });
  if (accessError) return accessError;

  const fromProjectRef = db.doc(`organizations/${orgId}/projects/${fromProjectId}`);
  const fromProjectSnap = await fromProjectRef.get();

  if (!fromProjectSnap.exists) {
    return NextResponse.json(
      { success: false, error: 'Eix origen no existeix', code: 'FROM_NOT_FOUND' },
      { status: 404 }
    );
  }

  const fromProjectData = fromProjectSnap.data();

  if (fromProjectData?.archivedAt != null) {
    console.log(`[projects/archive] Eix ${fromProjectId} ja arxivat (idempotent)`);
    return NextResponse.json({
      success: true,
      idempotent: true,
      reassignedCount: 0,
    });
  }

  if (toProjectId) {
    if (toProjectId === fromProjectId) {
      return NextResponse.json(
        { success: false, error: 'Eix destí no pot ser el mateix que origen', code: 'SAME_PROJECT' },
        { status: 400 }
      );
    }

    const toProjectRef = db.doc(`organizations/${orgId}/projects/${toProjectId}`);
    const toProjectSnap = await toProjectRef.get();

    if (!toProjectSnap.exists) {
      return NextResponse.json(
        { success: false, error: 'Eix destí no existeix', code: 'TO_NOT_FOUND' },
        { status: 400 }
      );
    }

    const toProjectData = toProjectSnap.data();
    if (toProjectData?.archivedAt != null) {
      return NextResponse.json(
        { success: false, error: 'Eix destí està arxivat', code: 'TO_ARCHIVED' },
        { status: 400 }
      );
    }
  }

  const transactionsRef = db.collection(`organizations/${orgId}/transactions`);
  const projectTransactionsQuery = transactionsRef
    .where('projectId', '==', fromProjectId);

  const projectTransactionsSnap = await projectTransactionsQuery.get();

  const activeDocs = projectTransactionsSnap.docs.filter(doc => {
    const data = doc.data();
    return data.archivedAt == null;
  });
  const activeCount = activeDocs.length;

  console.log(`[projects/archive] Eix ${fromProjectId} té ${activeCount} transaccions actives`);

  if (activeCount > 0 && !toProjectId) {
    return NextResponse.json(
      {
        success: false,
        error: `Eix té ${activeCount} moviments actius. Cal reassignar-los primer.`,
        code: 'HAS_ACTIVE_TRANSACTIONS',
        activeCount,
      },
      { status: 400 }
    );
  }

  let reassignedCount = 0;
  if (activeCount > 0 && toProjectId) {
    for (let i = 0; i < activeDocs.length; i += BATCH_SIZE) {
      const batch = db.batch();
      const chunk = activeDocs.slice(i, i + BATCH_SIZE);

      for (const doc of chunk) {
        batch.update(doc.ref, { projectId: toProjectId });
      }

      await batch.commit();
      reassignedCount += chunk.length;
      console.log(`[projects/archive] Reassignades ${reassignedCount}/${activeDocs.length} transaccions`);
    }
  }

  await fromProjectRef.update({
    archivedAt: FieldValue.serverTimestamp(),
    archivedByUid: uid,
    archivedFromAction: 'archive-project-api',
  });

  const elapsed = Date.now() - startTime;
  console.log(`[projects/archive] Eix ${fromProjectId} arxivat. Reassignades: ${reassignedCount}. Temps: ${elapsed}ms`);

  return NextResponse.json({
    success: true,
    reassignedCount,
  });
}
