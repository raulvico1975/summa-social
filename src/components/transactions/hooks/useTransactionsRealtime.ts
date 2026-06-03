'use client';

import * as React from 'react';
import {
  collection,
  limit as limitQuery,
  onSnapshot,
  orderBy,
  query,
  where,
  type Firestore,
  type FirestoreError,
  type QueryConstraint,
} from 'firebase/firestore';
import type { Transaction } from '@/lib/data';
import {
  hasServerSideTransactionFilters,
  resolvePeriodRange,
  type TransactionMovementType,
  type TransactionPageFilters,
  type TransactionSearchContext,
} from '@/lib/read-models/transactions';
import { serializePublicTransaction } from '@/lib/transactions/public-transaction-dto';
import {
  resolveTransactionsRealtimeLimit,
  shouldIncludeTransactionInRealtimeWindow,
} from '@/lib/transactions/realtime-window';
import type { SourceFilter } from '@/lib/constants';

type PeriodQuery = Record<string, string>;

export interface TransactionsRealtimeWindow {
  transactions: Transaction[];
  scannedIds: string[];
}

export interface UseTransactionsRealtimeInput {
  firestore: Firestore;
  organizationId: string | null | undefined;
  enabled: boolean;
  loadedCount: number;
  periodQuery: PeriodQuery;
  showArchived: boolean;
  movementType: TransactionMovementType | null;
  search: string;
  contactId: string | null;
  source: SourceFilter;
  bankAccountId: string;
  searchContext: TransactionSearchContext;
}

export interface UseTransactionsRealtimeResult {
  window: TransactionsRealtimeWindow | null;
  error: FirestoreError | null;
}

function getPeriodParam(periodQuery: PeriodQuery, name: string): string | null {
  return periodQuery[name] ?? null;
}

export function useTransactionsRealtime(
  input: UseTransactionsRealtimeInput
): UseTransactionsRealtimeResult {
  const [window, setWindow] = React.useState<TransactionsRealtimeWindow | null>(null);
  const [error, setError] = React.useState<FirestoreError | null>(null);

  const pageFilters = React.useMemo<TransactionPageFilters>(() => ({
    search: input.search,
    movementType: input.movementType,
    contactId: input.contactId,
    categoryId: null,
    source: input.source === 'all' ? null : input.source,
    bankAccountId: input.bankAccountId === '__all__' ? null : input.bankAccountId,
  }), [
    input.bankAccountId,
    input.contactId,
    input.movementType,
    input.search,
    input.source,
  ]);

  const periodRange = React.useMemo(
    () => resolvePeriodRange({ get: (name) => getPeriodParam(input.periodQuery, name) }),
    [input.periodQuery]
  );

  const realtimeLimit = React.useMemo(
    () =>
      resolveTransactionsRealtimeLimit({
        loadedCount: input.loadedCount,
        hasServerSideFilters: hasServerSideTransactionFilters(pageFilters),
      }),
    [input.loadedCount, pageFilters]
  );

  React.useEffect(() => {
    if (!input.enabled || !input.organizationId) {
      setWindow(null);
      setError(null);
      return;
    }

    // This listener refreshes the active/recent window, not the full historical ledger.
    const constraints: QueryConstraint[] = [];
    if (periodRange.start) {
      constraints.push(where('date', '>=', periodRange.start));
    }
    if (periodRange.end) {
      constraints.push(where('date', '<=', periodRange.end));
    }
    if (pageFilters.contactId) {
      constraints.push(where('contactId', '==', pageFilters.contactId));
    }
    constraints.push(orderBy('date', 'desc'));
    constraints.push(limitQuery(realtimeLimit));

    const transactionsQuery = query(
      collection(input.firestore, 'organizations', input.organizationId, 'transactions'),
      ...constraints
    );

    return onSnapshot(
      transactionsQuery,
      (snapshot) => {
        const scannedIds: string[] = [];
        const transactions: Transaction[] = [];

        for (const docSnap of snapshot.docs) {
          scannedIds.push(docSnap.id);
          const data = docSnap.data() as Record<string, unknown>;
          const rawTx = { id: docSnap.id, ...data } as Transaction;

          if (
            !shouldIncludeTransactionInRealtimeWindow(rawTx, pageFilters, input.searchContext, {
              showArchived: input.showArchived,
            })
          ) continue;

          transactions.push(serializePublicTransaction(docSnap.id, data) as Transaction);
        }

        setWindow({ transactions, scannedIds });
        setError(null);
      },
      (snapshotError) => {
        console.warn('[transactions-table] realtime subscription error:', snapshotError);
        setWindow(null);
        setError(snapshotError);
      }
    );
  }, [
    input.enabled,
    input.firestore,
    input.organizationId,
    input.searchContext,
    input.showArchived,
    pageFilters,
    periodRange.end,
    periodRange.start,
    realtimeLimit,
  ]);

  return { window, error };
}
