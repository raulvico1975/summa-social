import type { ReturnFiscalException, Transaction } from '@/lib/data';

export const UNRESOLVED_FISCAL_RETURNS = 'UNRESOLVED_FISCAL_RETURNS' as const;
export const MAX_FISCAL_RETURN_IDS_IN_ERROR = 50;


export type FiscalReturnReadinessScope =
  | 'all'
  | {
      donor?: string;
      donorId?: string;
      donorIds?: readonly string[];
      transactionIds?: readonly string[];
    };

export type FiscalReturnBlockerReason =
  | 'UNVERIFIED_RETURN'
  | 'INCOMPLETE_FISCAL_EXCEPTION';

export interface FiscalReturnBlocker {
  id: string;
  date: string;
  amount: number;
  contactId: string | null;
  reason: FiscalReturnBlockerReason;
  recommendedAction: 'VERIFY_RECIPROCAL_LINK_OR_APPROVE_EXCEPTION';
}

export interface FiscalReturnReadinessResult {
  ready: boolean;
  organizationId: string;
  year: number;
  code?: typeof UNRESOLVED_FISCAL_RETURNS;
  unresolvedReturns: FiscalReturnBlocker[];
  unresolvedCount: number;
  transactionIds: string[];
}

type OrganizationScopedTransaction = Transaction & {
  organizationId?: string | null;
  orgId?: string | null;
};

function normalizeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized || null;
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isCompleteReturnFiscalException(
  value: unknown
): value is ReturnFiscalException {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if ('active' in candidate && candidate.active !== true) return false;
  return hasText(candidate.reason)
    && hasText(candidate.approvedAt)
    && hasText(candidate.approvedByUid);
}

function transactionBelongsToOrganization(
  transaction: OrganizationScopedTransaction,
  organizationId: string
): boolean {
  const explicitOrgId = normalizeId(transaction.organizationId ?? transaction.orgId);
  return !explicitOrgId || explicitOrgId === organizationId;
}

function isFiscalDonation(transaction: Transaction): boolean {
  if (!Number.isFinite(transaction.amount) || transaction.amount <= 0) return false;
  if (transaction.fiscalKind === 'non_fiscal' || transaction.fiscalKind === 'pending_review') {
    return false;
  }
  return transaction.fiscalKind === 'donation' || transaction.transactionType === 'donation';
}

function isInYear(date: string, year: number): boolean {
  return typeof date === 'string' && date.slice(0, 4) === String(year);
}

function isRemittanceParent(transaction: Transaction): boolean {
  if (transaction.isRemittanceItem === true) return false;
  return (transaction.isRemittance === true
    || (transaction.isSplit === true && !transaction.parentTransactionId))
    || (transaction.remittanceType === 'returns' && !transaction.parentTransactionId);
}

function isScoped(
  transaction: Transaction,
  scope: FiscalReturnReadinessScope
): boolean {
  if (scope === 'all') return true;

  const transactionIds = new Set(
    (scope.transactionIds ?? []).map(normalizeId).filter((id): id is string => Boolean(id))
  );
  if (transactionIds.size > 0) return transactionIds.has(transaction.id);

  const donorIds = new Set(
    [scope.donor, scope.donorId, ...(scope.donorIds ?? [])]
      .map(normalizeId)
      .filter((id): id is string => Boolean(id))
  );
  if (donorIds.size > 0) {
    const contactId = normalizeId(transaction.contactId);
    return contactId !== null && donorIds.has(contactId);
  }

  return true;
}

function hasVerifiedReciprocalLink(
  returned: Transaction,
  byId: Map<string, OrganizationScopedTransaction>,
  organizationId: string
): boolean {
  const linkedId = normalizeId(returned.linkedTransactionId);
  if (!linkedId || linkedId === returned.id) return false;

  const original = byId.get(linkedId);
  if (!original || !transactionBelongsToOrganization(original, organizationId)) return false;
  if (original.archivedAt || !isFiscalDonation(original)) return false;

  const returnedContactId = normalizeId(returned.contactId);
  const originalContactId = normalizeId(original.contactId);
  if (!returnedContactId || !originalContactId || returnedContactId !== originalContactId) {
    return false;
  }

  const reverseLinkedId = normalizeId(original.linkedTransactionId);
  const reverseLinkedIds = Array.isArray(original.linkedTransactionIds)
    ? original.linkedTransactionIds.map(normalizeId).filter((id): id is string => Boolean(id))
    : [];
  return reverseLinkedId === returned.id || reverseLinkedIds.includes(returned.id);
}

function unresolvedReason(returned: Transaction): FiscalReturnBlockerReason {
  const exception = returned.returnFiscalException;
  if (exception !== null && exception !== undefined && !isCompleteReturnFiscalException(exception)) {
    return 'INCOMPLETE_FISCAL_EXCEPTION';
  }
  return 'UNVERIFIED_RETURN';
}

export function checkFiscalReturnReadiness(input: {
  organizationId: string;
  year: number;
  transactions: readonly Transaction[];
  scope?: FiscalReturnReadinessScope;
  now?: string | Date;
}): FiscalReturnReadinessResult {
  const { organizationId, year, transactions } = input;
  const scope = input.scope ?? 'all';
  const scopedTransactions = transactions
    .map((transaction) => transaction as OrganizationScopedTransaction)
    .filter((transaction) => transactionBelongsToOrganization(transaction, organizationId));
  const byId = new Map(scopedTransactions.map((transaction) => [transaction.id, transaction]));

  const unresolvedReturns = scopedTransactions
    .filter((transaction) => isInYear(transaction.date, year))
    .filter((transaction) => !transaction.archivedAt)
    .filter((transaction) => Number.isFinite(transaction.amount) && transaction.amount < 0)
    .filter((transaction) => transaction.transactionType === 'return')
    .filter((transaction) => !isRemittanceParent(transaction))
    .filter((transaction) => isScoped(transaction, scope))
    .filter((transaction) => (
      !isCompleteReturnFiscalException(transaction.returnFiscalException)
      && !hasVerifiedReciprocalLink(transaction, byId, organizationId)
    ))
    .map((transaction): FiscalReturnBlocker => ({
      id: transaction.id,
      date: transaction.date,
      amount: transaction.amount,
      contactId: normalizeId(transaction.contactId),
      reason: unresolvedReason(transaction),
      recommendedAction: 'VERIFY_RECIPROCAL_LINK_OR_APPROVE_EXCEPTION',
    }))
    .sort((left, right) => left.id.localeCompare(right.id));

  return {
    ready: unresolvedReturns.length === 0,
    organizationId,
    year,
    ...(unresolvedReturns.length > 0 ? { code: UNRESOLVED_FISCAL_RETURNS } : {}),
    unresolvedReturns,
    unresolvedCount: unresolvedReturns.length,
    transactionIds: unresolvedReturns
      .map((transaction) => transaction.id)
      .slice(0, MAX_FISCAL_RETURN_IDS_IN_ERROR),
  };
}

export function fiscalReturnReadinessError(result: FiscalReturnReadinessResult) {
  return {
    success: false as const,
    error: UNRESOLVED_FISCAL_RETURNS,
    code: UNRESOLVED_FISCAL_RETURNS,
    year: result.year,
    unresolvedCount: result.unresolvedCount,
    transactionIds: result.transactionIds,
    unresolvedReturns: result.unresolvedReturns,
  };
}
