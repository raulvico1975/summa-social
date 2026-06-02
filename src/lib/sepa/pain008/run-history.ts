import type {
  SepaCollectionRunRecord,
  SepaCollectionRunRecordExcludedItem,
  SepaCollectionRunRecordIncludedItem,
  SepaScheme,
} from '@/lib/data';

export type SepaCollectionRunHistoryStatus = 'exported' | 'voided';

type LegacySepaCollectionRunRecord = Partial<SepaCollectionRunRecord> & {
  id?: string;
  requestedCollectionDate?: string | null;
};

export interface SepaCollectionRunHistorySummary {
  id?: string;
  status: SepaCollectionRunHistoryStatus;
  scheme: SepaScheme | null;
  bankAccountId: string | null;
  collectionDate: string | null;
  createdAt: string | null;
  exportedAt: string | null;
  itemCount: number;
  includedCount: number;
  excludedCount: number;
  totalCents: number;
  filename: string | null;
  storagePath: string | null;
  messageId: string | null;
  voidedAt: string | null;
  voidedByUid: string | null;
  voidReason: string | null;
  correctedFromRunId: string | null;
  correctedByRunId: string | null;
}

export interface SplitSepaCollectionRunHistorySummaries {
  active: SepaCollectionRunHistorySummary[];
  voided: SepaCollectionRunHistorySummary[];
}

export function normalizeSepaCollectionRunStatus(
  status: unknown
): SepaCollectionRunHistoryStatus {
  return status === 'voided' ? 'voided' : 'exported';
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function summarizeSepaCollectionRunRecord(
  run: LegacySepaCollectionRunRecord
): SepaCollectionRunHistorySummary {
  const included = asArray<SepaCollectionRunRecordIncludedItem>(run.included);
  const excluded = asArray<SepaCollectionRunRecordExcludedItem>(run.excluded);
  const derivedItemCount = included.length;
  const derivedTotalCents = included.reduce(
    (sum, item) => sum + (typeof item?.amountCents === 'number' ? item.amountCents : 0),
    0
  );

  return {
    id: run.id,
    status: normalizeSepaCollectionRunStatus(run.status),
    scheme: run.scheme ?? null,
    bankAccountId: asStringOrNull(run.bankAccountId),
    collectionDate: asStringOrNull(run.collectionDate) ?? asStringOrNull(run.requestedCollectionDate),
    createdAt: asStringOrNull(run.createdAt),
    exportedAt: asStringOrNull(run.exportedAt),
    itemCount: asNumberOrNull(run.itemCount) ?? derivedItemCount,
    includedCount: included.length,
    excludedCount: excluded.length,
    totalCents: asNumberOrNull(run.totalCents) ?? derivedTotalCents,
    filename: asStringOrNull(run.sepaFile?.filename),
    storagePath: asStringOrNull(run.sepaFile?.storagePath),
    messageId: asStringOrNull(run.sepaFile?.messageId) ?? asStringOrNull(run.messageId),
    voidedAt: asStringOrNull(run.voidedAt),
    voidedByUid: asStringOrNull(run.voidedByUid),
    voidReason: asStringOrNull(run.voidReason),
    correctedFromRunId: asStringOrNull(run.correctedFromRunId),
    correctedByRunId: asStringOrNull(run.correctedByRunId),
  };
}

export function splitSepaCollectionRunHistorySummaries(
  runs: SepaCollectionRunHistorySummary[]
): SplitSepaCollectionRunHistorySummaries {
  return {
    active: runs.filter((run) => run.status !== 'voided'),
    voided: runs.filter((run) => run.status === 'voided'),
  };
}
