import type {
  SepaCollectionRunRecord,
  SepaCollectionRunRecordExcludedItem,
  SepaCollectionRunRecordIncludedItem,
  SepaScheme,
} from '@/lib/data';

type LegacySepaCollectionRunRecord = Partial<SepaCollectionRunRecord> & {
  id?: string;
  requestedCollectionDate?: string | null;
};

export interface SepaCollectionRunHistorySummary {
  id?: string;
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
  };
}
