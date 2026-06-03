import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mergeTransactionsRealtimeWindow,
  resolveTransactionsRealtimeLimit,
  shouldIncludeTransactionInRealtimeWindow,
  TRANSACTIONS_REALTIME_MAX_SCAN,
  TRANSACTIONS_REALTIME_PAGE_SIZE,
} from '../transactions/realtime-window';
import type { Transaction } from '../data';

type TestTransaction = {
  id: string;
  note?: string;
};

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? 'tx-1',
    date: overrides.date ?? '2026-06-03',
    description: overrides.description ?? 'Moviment bancari',
    amount: overrides.amount ?? 25,
    category: overrides.category ?? null,
    document: overrides.document ?? null,
    parentTransactionId: overrides.parentTransactionId ?? null,
    isRemittance: overrides.isRemittance ?? false,
    isRemittanceItem: overrides.isRemittanceItem ?? false,
    source: overrides.source ?? 'bank',
    archivedAt: overrides.archivedAt ?? null,
    bankAccountId: overrides.bankAccountId ?? null,
  };
}

test('mergeTransactionsRealtimeWindow updates rows returned by the realtime window', () => {
  const previous: TestTransaction[] = [
    { id: 'tx-1', note: 'old' },
    { id: 'tx-2', note: 'stable' },
  ];

  const next = mergeTransactionsRealtimeWindow(
    previous,
    [{ id: 'tx-1', note: 'updated' }],
    ['tx-1'],
    { minimumCount: TRANSACTIONS_REALTIME_PAGE_SIZE }
  );

  assert.deepEqual(next, [
    { id: 'tx-1', note: 'updated' },
    { id: 'tx-2', note: 'stable' },
  ]);
});

test('mergeTransactionsRealtimeWindow removes scanned rows that no longer match visible filters', () => {
  const previous: TestTransaction[] = [
    { id: 'tx-1' },
    { id: 'tx-2' },
    { id: 'tx-3' },
  ];

  const next = mergeTransactionsRealtimeWindow(
    previous,
    [{ id: 'tx-2' }],
    ['tx-1', 'tx-2'],
    { minimumCount: TRANSACTIONS_REALTIME_PAGE_SIZE }
  );

  assert.deepEqual(next, [
    { id: 'tx-2' },
    { id: 'tx-3' },
  ]);
});

test('mergeTransactionsRealtimeWindow does not duplicate rows already present locally', () => {
  const previous: TestTransaction[] = [
    { id: 'tx-1', note: 'old' },
    { id: 'tx-2', note: 'stable' },
  ];

  const next = mergeTransactionsRealtimeWindow(
    previous,
    [
      { id: 'tx-1', note: 'updated' },
      { id: 'tx-2', note: 'newer stable' },
    ],
    ['tx-1', 'tx-2'],
    { minimumCount: TRANSACTIONS_REALTIME_PAGE_SIZE }
  );

  assert.deepEqual(next, [
    { id: 'tx-1', note: 'updated' },
    { id: 'tx-2', note: 'newer stable' },
  ]);
});

test('mergeTransactionsRealtimeWindow preserves locally locked rows', () => {
  const previous: TestTransaction[] = [
    { id: 'tx-1', note: 'optimistic' },
  ];

  const next = mergeTransactionsRealtimeWindow(
    previous,
    [{ id: 'tx-1', note: 'stale snapshot' }],
    ['tx-1'],
    {
      lockedIds: ['tx-1'],
      minimumCount: TRANSACTIONS_REALTIME_PAGE_SIZE,
    }
  );

  assert.deepEqual(next, [
    { id: 'tx-1', note: 'optimistic' },
  ]);
});

test('shouldIncludeTransactionInRealtimeWindow excludes children with parentTransactionId', () => {
  const included = shouldIncludeTransactionInRealtimeWindow(
    makeTransaction({ parentTransactionId: 'parent-1', isRemittanceItem: false }),
    {
      search: '',
      movementType: null,
      contactId: null,
      categoryId: null,
      source: null,
      bankAccountId: null,
    },
    {},
    { showArchived: false }
  );

  assert.equal(included, false);
});

test('shouldIncludeTransactionInRealtimeWindow excludes remittance items', () => {
  const included = shouldIncludeTransactionInRealtimeWindow(
    makeTransaction({ parentTransactionId: null, isRemittanceItem: true }),
    {
      search: '',
      movementType: null,
      contactId: null,
      categoryId: null,
      source: null,
      bankAccountId: null,
    },
    {},
    { showArchived: false }
  );

  assert.equal(included, false);
});

test('resolveTransactionsRealtimeLimit keeps the listener bounded', () => {
  assert.equal(
    resolveTransactionsRealtimeLimit({ loadedCount: 0, hasServerSideFilters: false }),
    TRANSACTIONS_REALTIME_PAGE_SIZE * 3
  );
  assert.equal(
    resolveTransactionsRealtimeLimit({ loadedCount: 50, hasServerSideFilters: true }),
    TRANSACTIONS_REALTIME_MAX_SCAN
  );
  assert.equal(
    resolveTransactionsRealtimeLimit({ loadedCount: 500, hasServerSideFilters: true }),
    TRANSACTIONS_REALTIME_MAX_SCAN
  );
});
