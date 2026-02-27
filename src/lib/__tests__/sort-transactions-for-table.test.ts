import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { Transaction } from '../data';
import { sortTransactionsForTable } from '../transactions/sort-transactions-for-table';

function makeTx(
  id: string,
  amount: number,
  options: {
    date?: string;
    operationDate?: string;
    bankAccountId?: string;
    balanceAfter?: number;
  } = {}
): Transaction {
  return {
    id,
    date: options.date ?? '2026-02-10',
    description: `tx ${id}`,
    amount,
    category: null,
    document: null,
    bankAccountId: options.bankAccountId,
    operationDate: options.operationDate,
    balanceAfter: options.balanceAfter,
  };
}

const getDisplayDate = (tx: Transaction): string => tx.operationDate ?? tx.date;

describe('sortTransactionsForTable', () => {
  it('ordena despeses fiables per balanceAfter desc', () => {
    const txs = [
      makeTx('a', -10, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 90 }),
      makeTx('b', -20, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 70 }),
      makeTx('c', -5, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 85 }),
    ];

    const sorted = sortTransactionsForTable(txs, { sortDateAsc: false, getDisplayDate });
    assert.deepStrictEqual(sorted.map((tx) => tx.id), ['a', 'c', 'b']);
  });

  it('ordena ingressos fiables per balanceAfter asc', () => {
    const txs = [
      makeTx('a', 10, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 130 }),
      makeTx('b', 15, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 110 }),
      makeTx('c', 5, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 115 }),
    ];

    const sorted = sortTransactionsForTable(txs, { sortDateAsc: false, getDisplayDate });
    assert.deepStrictEqual(sorted.map((tx) => tx.id), ['b', 'c', 'a']);
  });

  it('manté ordre estable en grup mixt de signes', () => {
    const txs = [
      makeTx('a', 10, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 130 }),
      makeTx('b', -5, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 125 }),
      makeTx('c', 8, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 133 }),
    ];

    const sorted = sortTransactionsForTable(txs, { sortDateAsc: false, getDisplayDate });
    assert.deepStrictEqual(sorted.map((tx) => tx.id), ['a', 'b', 'c']);
  });

  it('manté ordre estable si falta algun balanceAfter', () => {
    const txs = [
      makeTx('a', -10, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 90 }),
      makeTx('b', -20, { bankAccountId: 'acc-1', operationDate: '2026-02-10' }),
      makeTx('c', -5, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 85 }),
    ];

    const sorted = sortTransactionsForTable(txs, { sortDateAsc: false, getDisplayDate });
    assert.deepStrictEqual(sorted.map((tx) => tx.id), ['a', 'b', 'c']);
  });

  it('no aplica ordre per saldo entre comptes diferents', () => {
    const txs = [
      makeTx('a', -10, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 90 }),
      makeTx('b', -20, { bankAccountId: 'acc-2', operationDate: '2026-02-10', balanceAfter: 300 }),
      makeTx('c', -5, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 85 }),
    ];

    const sorted = sortTransactionsForTable(txs, { sortDateAsc: false, getDisplayDate });
    assert.deepStrictEqual(sorted.map((tx) => tx.id), ['a', 'b', 'c']);
  });

  it('manté ordre estable en empat de balanceAfter', () => {
    const txs = [
      makeTx('a', -10, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 90 }),
      makeTx('b', -20, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 90 }),
      makeTx('c', -30, { bankAccountId: 'acc-1', operationDate: '2026-02-10', balanceAfter: 80 }),
    ];

    const sorted = sortTransactionsForTable(txs, { sortDateAsc: false, getDisplayDate });
    assert.deepStrictEqual(sorted.map((tx) => tx.id), ['a', 'b', 'c']);
  });

  it('respecta l ordre principal per data en desc i asc', () => {
    const txs = [
      makeTx('a', 10, { operationDate: '2026-02-09', bankAccountId: 'acc-1', balanceAfter: 100 }),
      makeTx('b', 10, { operationDate: '2026-02-11', bankAccountId: 'acc-1', balanceAfter: 120 }),
      makeTx('c', 10, { operationDate: '2026-02-10', bankAccountId: 'acc-1', balanceAfter: 110 }),
    ];

    const desc = sortTransactionsForTable(txs, { sortDateAsc: false, getDisplayDate });
    assert.deepStrictEqual(desc.map((tx) => tx.id), ['b', 'c', 'a']);

    const asc = sortTransactionsForTable(txs, { sortDateAsc: true, getDisplayDate });
    assert.deepStrictEqual(asc.map((tx) => tx.id), ['a', 'c', 'b']);
  });
});
