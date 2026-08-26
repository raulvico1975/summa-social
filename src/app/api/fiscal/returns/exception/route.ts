import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminDb,
  validateUserMembership,
  verifyIdToken,
  type MembershipValidation,
} from '@/lib/api/admin-sdk';
import { isSuperAdminInRegistry } from '@/lib/api/super-admin-registry';
import type { ReturnFiscalException } from '@/lib/data';

const RETURN_EXCEPTION_REASON_MIN_LENGTH = 3;

type DbLike = ReturnType<typeof getAdminDb>;
type ReturnTransactionSnapshot = {
  exists: boolean;
  data: () => Record<string, unknown> | undefined;
};
type ReturnTransactionRef = {
  get: () => Promise<ReturnTransactionSnapshot>;
  update: (data: Record<string, unknown>) => Promise<void>;
};

export interface FiscalReturnExceptionDeps {
  verifyIdTokenFn?: typeof verifyIdToken;
  getAdminDbFn?: typeof getAdminDb;
  validateUserMembershipFn?: typeof validateUserMembership;
  isSuperAdminFn?: (db: DbLike, uid: string) => Promise<boolean>;
  nowFn?: () => string;
}

const defaultDeps: Required<FiscalReturnExceptionDeps> = {
  verifyIdTokenFn: verifyIdToken,
  getAdminDbFn: getAdminDb,
  validateUserMembershipFn: validateUserMembership,
  isSuperAdminFn: (db, uid) => isSuperAdminInRegistry(db, uid),
  nowFn: () => new Date().toISOString(),
};

function parseString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function isActiveFiscalReturn(data: Record<string, unknown>): boolean {
  if (data.archivedAt) return false;
  if (data.transactionType !== 'return') return false;
  if (typeof data.amount !== 'number' || !Number.isFinite(data.amount) || data.amount >= 0) {
    return false;
  }
  if (data.isRemittanceItem === true) return true;
  if (data.isRemittance === true) return false;
  if (data.isSplit === true && !data.parentTransactionId) return false;
  return !(data.remittanceType === 'returns' && !data.parentTransactionId);
}

function responseError(code: string, status: number) {
  return NextResponse.json({ success: false, error: code, code }, { status });
}

export async function handleFiscalReturnExceptionPost(
  request: NextRequest,
  deps: FiscalReturnExceptionDeps = {}
) {
  const resolvedDeps = { ...defaultDeps, ...deps };
  const auth = await resolvedDeps.verifyIdTokenFn(request);
  if (!auth) return responseError('UNAUTHORIZED', 401);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return responseError('INVALID_BODY', 400);
  }

  const body = asRecord(rawBody);
  const organizationId = parseString(body.organizationId ?? body.orgId);
  const transactionId = parseString(body.transactionId);
  const requestedOperation = parseString(body.operation ?? body.action);
  const operation = requestedOperation === 'approve' ? 'create' : requestedOperation;
  if (!organizationId || !transactionId || !['create', 'revoke'].includes(operation)) {
    return responseError('INVALID_REQUEST', 400);
  }

  const db = resolvedDeps.getAdminDbFn();
  const [membership, isSuperAdmin] = await Promise.all([
    resolvedDeps.validateUserMembershipFn(db, auth.uid, organizationId),
    resolvedDeps.isSuperAdminFn(db, auth.uid),
  ]);
  const canManage = isSuperAdmin || (membership.valid && membership.role === 'admin');
  if (!canManage) return responseError('FORBIDDEN', 403);

  const transactionRef = db.doc(
    `organizations/${organizationId}/transactions/${transactionId}`
  ) as unknown as ReturnTransactionRef;
  const transactionSnap = await transactionRef.get();
  if (!transactionSnap.exists) return responseError('TRANSACTION_NOT_FOUND', 404);

  const transaction = asRecord(transactionSnap.data());
  const transactionOrganizationId = parseString(transaction.organizationId ?? transaction.orgId);
  if (transactionOrganizationId && transactionOrganizationId !== organizationId) {
    return responseError('TRANSACTION_ORG_MISMATCH', 400);
  }
  if (!isActiveFiscalReturn(transaction)) {
    return responseError('INVALID_RETURN_TRANSACTION', 400);
  }

  if (operation === 'revoke') {
    await transactionRef.update({ returnFiscalException: null });
    return NextResponse.json({
      success: true,
      operation: requestedOperation,
      transactionId,
      returnFiscalException: null,
    });
  }

  const reason = parseString(body.reason);
  if (reason.length < RETURN_EXCEPTION_REASON_MIN_LENGTH) {
    return responseError('RETURN_EXCEPTION_REASON_REQUIRED', 400);
  }

  const exception: ReturnFiscalException = {
    reason,
    approvedAt: resolvedDeps.nowFn(),
    approvedByUid: auth.uid,
  };
  await transactionRef.update({ returnFiscalException: exception });

  return NextResponse.json({
    success: true,
    operation: requestedOperation,
    transactionId,
    returnFiscalException: exception,
  });
}

export async function POST(request: NextRequest) {
  return handleFiscalReturnExceptionPost(request);
}
