export const FISCAL_PENDING_REVIEW_ALERT_TYPE = 'fiscal_pending_review' as const;

export type AdminAlertType = typeof FISCAL_PENDING_REVIEW_ALERT_TYPE;
export type AdminAlertStatus = 'open' | 'read' | 'expired';

export interface FiscalPendingReviewPayload {
  pendingCount: number;
  pendingAmountCents: number;
  year: number;
}

export interface FiscalPendingReviewAlertDoc {
  id: string;
  type: AdminAlertType;
  status: AdminAlertStatus;
  createdAt: unknown;
  expiresAt: unknown;
  createdByUid: string;
  readAt?: unknown | null;
  readByUid?: string | null;
  payload: FiscalPendingReviewPayload;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getCurrentFiscalYear(now: Date = new Date()): number {
  return now.getFullYear();
}

export function addThirtyDays(date: Date): Date {
  return new Date(date.getTime() + THIRTY_DAYS_MS);
}

export function toDateFromFirestoreValue(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const maybeTimestamp = value as { toDate?: () => Date };
    if (typeof maybeTimestamp.toDate === 'function') {
      const parsed = maybeTimestamp.toDate();
      return Number.isFinite(parsed.getTime()) ? parsed : null;
    }
  }

  return null;
}

export function isAlertExpired(expiresAt: unknown, now: Date = new Date()): boolean {
  const expiresDate = toDateFromFirestoreValue(expiresAt);
  if (!expiresDate) return true;
  return expiresDate.getTime() <= now.getTime();
}
