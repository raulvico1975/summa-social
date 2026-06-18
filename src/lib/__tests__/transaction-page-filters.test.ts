import assert from 'node:assert/strict';
import test from 'node:test';

import type { Transaction } from '@/lib/data';
import {
  hasServerSideTransactionFilters,
  matchesTransactionPageFilters,
  parseTransactionPageFilters,
} from '@/lib/read-models/transactions';

function params(values: Record<string, string | null>) {
  return {
    get(name: string) {
      return values[name] ?? null;
    },
  };
}

function transaction(id: string): Transaction {
  return {
    id,
    date: '2026-06-18',
    amount: -100,
    description: 'Material projecte',
  } as Transaction;
}

test('transaction page filters support direct transactionId lookup', () => {
  const filters = parseTransactionPageFilters(params({ transactionId: 'tx-target' }));

  assert.equal(filters.transactionId, 'tx-target');
  assert.equal(hasServerSideTransactionFilters(filters), true);
  assert.equal(matchesTransactionPageFilters(transaction('tx-target'), filters), true);
  assert.equal(matchesTransactionPageFilters(transaction('tx-other'), filters), false);
});
