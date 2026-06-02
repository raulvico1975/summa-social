import type { SepaCollectionRunRecordIncludedItem } from '@/lib/data';
import { normalizeSepaCollectionRunStatus } from './run-history';

export interface VoidRunContactState {
  id: string;
  sepaPain008LastRunAt?: string | null;
  sepaPain008LastRunId?: string | null;
}

export interface VoidRunCandidate {
  id: string;
  status?: string | null;
  collectionDate?: string | null;
  exportedAt?: string | null;
  createdAt?: string | null;
  included?: SepaCollectionRunRecordIncludedItem[] | null;
}

export interface PreviousSepaRun {
  id: string;
  collectionDate: string;
}

export type DonorVoidRollbackDecision =
  | {
      action: 'restore';
      sepaPain008LastRunAt: string | null;
      sepaPain008LastRunId: string | null;
      reason: 'snapshot' | 'current-run' | 'legacy-same-month';
    }
  | {
      action: 'skip';
      reason: 'later-active-run' | 'not-current-run';
    };

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function toYearMonthValue(date: string | null | undefined): number | null {
  if (!date || !/^\d{4}-\d{2}/.test(date)) return null;
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return year * 12 + month;
}

export function isSameYearMonth(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = toYearMonthValue(a);
  const right = toYearMonthValue(b);
  return left !== null && right !== null && left === right;
}

function activeRunsForContact(
  runs: VoidRunCandidate[],
  contactId: string,
  currentRunId: string
): VoidRunCandidate[] {
  return runs.filter((run) => {
    if (!run.id || run.id === currentRunId) return false;
    if (normalizeSepaCollectionRunStatus(run.status) === 'voided') return false;
    return (run.included ?? []).some((item) => item?.contactId === contactId);
  });
}

export function findPreviousActiveSepaRunForContact(
  runs: VoidRunCandidate[],
  contactId: string,
  currentRunId: string,
  currentCollectionDate: string | null | undefined
): PreviousSepaRun | null {
  const currentYM = toYearMonthValue(currentCollectionDate);
  if (currentYM === null) return null;

  const candidates = activeRunsForContact(runs, contactId, currentRunId)
    .filter((run) => {
      const runYM = toYearMonthValue(run.collectionDate);
      return run.id && run.collectionDate && runYM !== null && runYM < currentYM;
    })
    .sort((a, b) => {
      const aYM = toYearMonthValue(a.collectionDate) ?? -1;
      const bYM = toYearMonthValue(b.collectionDate) ?? -1;
      if (aYM !== bYM) return bYM - aYM;
      const aTime = a.exportedAt ?? a.createdAt ?? '';
      const bTime = b.exportedAt ?? b.createdAt ?? '';
      return bTime.localeCompare(aTime);
    });

  const previous = candidates[0];
  if (!previous?.id || !previous.collectionDate) return null;
  return {
    id: previous.id,
    collectionDate: previous.collectionDate,
  };
}

export function hasLaterActiveSepaRunForContact(
  runs: VoidRunCandidate[],
  contact: VoidRunContactState,
  currentRunId: string,
  currentCollectionDate: string | null | undefined
): boolean {
  const currentYM = toYearMonthValue(currentCollectionDate);
  if (currentYM === null) return false;

  const contactYM = toYearMonthValue(contact.sepaPain008LastRunAt);
  if (contactYM !== null && contactYM > currentYM) return true;

  return activeRunsForContact(runs, contact.id, currentRunId).some((run) => {
    const runYM = toYearMonthValue(run.collectionDate);
    if (runYM !== null && runYM > currentYM) return true;
    return Boolean(contact.sepaPain008LastRunId && contact.sepaPain008LastRunId === run.id);
  });
}

export function decideDonorVoidRollback(input: {
  runId: string;
  runCollectionDate: string | null | undefined;
  includedItem: SepaCollectionRunRecordIncludedItem;
  contact: VoidRunContactState;
  previousRun: PreviousSepaRun | null;
  hasLaterActiveRun: boolean;
}): DonorVoidRollbackDecision {
  const { runId, runCollectionDate, includedItem, contact, previousRun } = input;

  if (input.hasLaterActiveRun) {
    return { action: 'skip', reason: 'later-active-run' };
  }

  if (hasOwn(includedItem, 'previousSepaPain008LastRunAt')) {
    return {
      action: 'restore',
      sepaPain008LastRunAt: includedItem.previousSepaPain008LastRunAt ?? null,
      sepaPain008LastRunId: includedItem.previousSepaPain008LastRunId ?? null,
      reason: 'snapshot',
    };
  }

  if (contact.sepaPain008LastRunId === runId) {
    return {
      action: 'restore',
      sepaPain008LastRunAt: previousRun?.collectionDate ?? null,
      sepaPain008LastRunId: previousRun?.id ?? null,
      reason: 'current-run',
    };
  }

  if (
    !contact.sepaPain008LastRunId &&
    isSameYearMonth(contact.sepaPain008LastRunAt, runCollectionDate)
  ) {
    return {
      action: 'restore',
      sepaPain008LastRunAt: previousRun?.collectionDate ?? null,
      sepaPain008LastRunId: previousRun?.id ?? null,
      reason: 'legacy-same-month',
    };
  }

  return { action: 'skip', reason: 'not-current-run' };
}
