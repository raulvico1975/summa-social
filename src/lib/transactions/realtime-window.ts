import type { Transaction } from '@/lib/data';
import {
  matchesTransactionPageFilters,
  type TransactionPageFilters,
  type TransactionSearchContext,
} from '@/lib/read-models/transactions';
import { isVisibleInMovementsLedger } from '@/lib/transactions/remittance-visibility';

export const TRANSACTIONS_REALTIME_PAGE_SIZE = 50;
export const TRANSACTIONS_REALTIME_MAX_SCAN = 250;

export function resolveTransactionsRealtimeLimit({
  loadedCount,
  hasServerSideFilters,
}: {
  loadedCount: number;
  hasServerSideFilters: boolean;
}): number {
  const baseCount = Math.max(TRANSACTIONS_REALTIME_PAGE_SIZE, loadedCount);
  const multiplier = hasServerSideFilters ? 5 : 3;
  return Math.min(baseCount * multiplier, TRANSACTIONS_REALTIME_MAX_SCAN);
}

export function mergeTransactionsRealtimeWindow<T extends { id: string }>(
  previousTransactions: T[] | null,
  realtimeTransactions: T[],
  scannedIds: readonly string[],
  options: {
    lockedIds?: readonly string[];
    minimumCount?: number;
  } = {}
): T[] | null {
  if (!previousTransactions) return previousTransactions;

  const scannedIdSet = new Set(scannedIds);
  const lockedIdSet = new Set(options.lockedIds ?? []);
  const previousById = new Map(previousTransactions.map((tx) => [tx.id, tx]));
  const seen = new Set<string>();
  const nextTransactions: T[] = [];

  for (const realtimeTx of realtimeTransactions) {
    const previousTx = previousById.get(realtimeTx.id);
    nextTransactions.push(
      previousTx && lockedIdSet.has(realtimeTx.id) ? previousTx : realtimeTx
    );
    seen.add(realtimeTx.id);
  }

  for (const previousTx of previousTransactions) {
    if (seen.has(previousTx.id)) continue;
    if (scannedIdSet.has(previousTx.id)) continue;

    nextTransactions.push(previousTx);
    seen.add(previousTx.id);
  }

  const targetSize = Math.max(
    previousTransactions.length,
    Math.min(realtimeTransactions.length, options.minimumCount ?? 0)
  );

  return nextTransactions.slice(0, targetSize);
}

export function shouldIncludeTransactionInRealtimeWindow(
  tx: Transaction,
  filters: TransactionPageFilters,
  searchContext: TransactionSearchContext,
  { showArchived }: { showArchived: boolean }
): boolean {
  if (!isVisibleInMovementsLedger(tx, { showArchived })) return false;
  return matchesTransactionPageFilters(tx, filters, searchContext);
}
