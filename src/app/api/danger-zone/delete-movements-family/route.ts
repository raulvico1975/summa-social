import { NextRequest, NextResponse } from 'next/server';
import {
  BATCH_SIZE,
  getAdminDb,
  validateUserMembership,
  verifyIdToken,
} from '@/lib/api/admin-sdk';
import { requireOperationalAccess } from '@/lib/api/require-operational-access';
import {
  buildDeleteMovementsFamilyPlan,
  executeDeleteMovementsFamilyPlan,
  isBankImportJobDoc,
  isBankImportRunDoc,
  type RemittanceDeleteScope,
} from '@/lib/danger-zone/delete-movements-family';

interface DeleteMovementsFamilyRequest {
  orgId: string;
}

interface DeleteMovementsFamilyResponse {
  success: boolean;
  idempotent?: boolean;
  error?: string;
  code?: string;
  deleted?: {
    transactions: number;
    remittancesPending: number;
    remittances: number;
    prebankRemittances: number;
    pendingDocuments: number;
    importRuns: number;
    importJobs: number;
    total: number;
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<DeleteMovementsFamilyResponse>> {
  const authResult = await verifyIdToken(request);
  if (!authResult) {
    return NextResponse.json(
      { success: false, error: 'No autenticat', code: 'UNAUTHORIZED' },
      { status: 401 }
    );
  }

  let body: DeleteMovementsFamilyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Body invàlid', code: 'INVALID_BODY' },
      { status: 400 }
    );
  }

  const orgId = typeof body.orgId === 'string' ? body.orgId.trim() : '';
  if (!orgId) {
    return NextResponse.json(
      { success: false, error: 'orgId és obligatori', code: 'MISSING_ORG_ID' },
      { status: 400 }
    );
  }

  const db = getAdminDb();
  const membership = await validateUserMembership(db, authResult.uid, orgId);
  const accessError = requireOperationalAccess(membership);
  if (accessError) return accessError;

  const transactionsRef = db.collection(`organizations/${orgId}/transactions`);
  const transactionsSnap = await transactionsRef.get();
  const transactionIds = transactionsSnap.docs.map((doc) => doc.id);

  // Guardrail consistent amb la UI: no esborrem moviments amb assignacions a projectes.
  if (transactionIds.length > 0) {
    const expenseLinksRef = db.collection(`organizations/${orgId}/projectModule/_/expenseLinks`);
    const linkedTx = await expenseLinksRef.limit(1).get();
    if (!linkedTx.empty) {
      return NextResponse.json(
        {
          success: false,
          error: 'Hi ha moviments assignats a projectes. Cal desassignar-los abans.',
          code: 'HAS_PROJECT_LINKS',
        },
        { status: 409 }
      );
    }
  }

  const remittancesRef = db.collection(`organizations/${orgId}/remittances`);
  const remittancesSnap = await remittancesRef.get();
  const remittances: RemittanceDeleteScope[] = [];

  for (const remittanceDoc of remittancesSnap.docs) {
    const pendingSnap = await remittancesRef.doc(remittanceDoc.id).collection('pending').get();
    remittances.push({
      id: remittanceDoc.id,
      pendingIds: pendingSnap.docs.map((doc) => doc.id),
    });
  }

  const prebankRemittancesRef = db.collection(`organizations/${orgId}/prebankRemittances`);
  const prebankRemittancesSnap = await prebankRemittancesRef.get();
  const prebankRemittanceIds = prebankRemittancesSnap.docs.map((doc) => doc.id);

  const pendingDocumentsRef = db.collection(`organizations/${orgId}/pendingDocuments`);
  const pendingDocumentsSnap = await pendingDocumentsRef.get();
  const pendingDocumentIds = pendingDocumentsSnap.docs.map((doc) => doc.id);

  const importRunsRef = db.collection(`organizations/${orgId}/importRuns`);
  const importRunsSnap = await importRunsRef.get();
  const importRunIds = importRunsSnap.docs
    .filter((doc) => isBankImportRunDoc(doc.data() as Record<string, unknown>))
    .map((doc) => doc.id);

  const importJobsRef = db.collection(`organizations/${orgId}/importJobs`);
  const importJobsSnap = await importJobsRef.get();
  const importJobIds = importJobsSnap.docs
    .filter((doc) => isBankImportJobDoc(doc.data() as Record<string, unknown>))
    .map((doc) => doc.id);

  const plan = buildDeleteMovementsFamilyPlan({
    orgId,
    transactionIds,
    remittances,
    prebankRemittanceIds,
    pendingDocumentIds,
    importRunIds,
    importJobIds,
  });

  if (plan.totalDeletes === 0) {
    return NextResponse.json({
      success: true,
      idempotent: true,
      deleted: {
        transactions: 0,
        remittancesPending: 0,
        remittances: 0,
        prebankRemittances: 0,
        pendingDocuments: 0,
        importRuns: 0,
        importJobs: 0,
        total: 0,
      },
    });
  }

  await executeDeleteMovementsFamilyPlan(
    plan,
    {
      deleteBatch: async (paths) => {
        const batch = db.batch();
        for (const path of paths) {
          batch.delete(db.doc(path));
        }
        await batch.commit();
      },
    },
    BATCH_SIZE
  );

  return NextResponse.json({
    success: true,
    deleted: {
      transactions: plan.transactionPaths.length,
      remittancesPending: plan.remittancePendingPaths.length,
      remittances: plan.remittancePaths.length,
      prebankRemittances: plan.prebankRemittancePaths.length,
      pendingDocuments: plan.pendingDocumentPaths.length,
      importRuns: plan.importRunPaths.length,
      importJobs: plan.importJobPaths.length,
      total: plan.totalDeletes,
    },
  });
}
