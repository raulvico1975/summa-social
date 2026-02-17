import { describe, it } from 'node:test';
import assert from 'node:assert';
import { classifyTransactions } from '../transaction-dedupe';
import type { Transaction } from '../data';

function makeExisting(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-existing',
    date: '2026-02-10T00:00:00.000Z',
    description: 'Quota soci',
    amount: 25,
    category: null,
    document: null,
    bankAccountId: 'acc-1',
    source: 'bank',
    ...overrides,
  };
}

function makeIncoming(overrides: Partial<Omit<Transaction, 'id'>> = {}): { tx: Omit<Transaction, 'id'>; rawRow: Record<string, unknown> } {
  return {
    tx: {
      date: '2026-02-10T00:00:00.000Z',
      description: 'Quota soci',
      amount: 25,
      category: null,
      document: null,
      bankAccountId: 'acc-1',
      source: 'bank',
      ...overrides,
    },
    rawRow: {},
  };
}

describe('transaction dedupe with balanceAfter strong rule', () => {
  it('saldo+amount+data igual classifica com DUPLICATE_SAFE', () => {
    const existing = [makeExisting({ id: 'tx-1', balanceAfter: 1000, operationDate: '2026-02-10' })];
    const parsed = [makeIncoming({ balanceAfter: 1000, operationDate: '2026-02-10' })];

    const result = classifyTransactions(parsed, existing, 'acc-1');

    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'DUPLICATE_SAFE');
    assert.equal(result[0].reason, 'BALANCE_AMOUNT_DATE');
    assert.equal(result[0].tx.duplicateReason, 'balance+amount+date');
  });

  it('si incoming no té saldo, no aplica la regla forta de saldo', () => {
    const existing = [makeExisting({ id: 'tx-1', balanceAfter: 1000, operationDate: '2026-02-10' })];
    const parsed = [makeIncoming()];

    const result = classifyTransactions(parsed, existing, 'acc-1');

    assert.equal(result.length, 1);
    assert.notEqual(result[0].reason, 'BALANCE_AMOUNT_DATE');
    assert.equal(result[0].status, 'DUPLICATE_CANDIDATE');
  });

  it('mateix saldo però amount diferent no és duplicate fort', () => {
    const existing = [makeExisting({ id: 'tx-1', balanceAfter: 1000, amount: 25, operationDate: '2026-02-10' })];
    const parsed = [makeIncoming({ balanceAfter: 1000, amount: 30, operationDate: '2026-02-10' })];

    const result = classifyTransactions(parsed, existing, 'acc-1');

    assert.equal(result.length, 1);
    assert.notEqual(result[0].reason, 'BALANCE_AMOUNT_DATE');
    assert.equal(result[0].status, 'NEW');
  });

  it('mateix saldo+amount però data diferent no és duplicate fort', () => {
    const existing = [makeExisting({ id: 'tx-1', balanceAfter: 1000, operationDate: '2026-02-10' })];
    const parsed = [makeIncoming({ balanceAfter: 1000, operationDate: '2026-02-11' })];

    const result = classifyTransactions(parsed, existing, 'acc-1');

    assert.equal(result.length, 1);
    assert.notEqual(result[0].reason, 'BALANCE_AMOUNT_DATE');
    assert.notEqual(result[0].status, 'DUPLICATE_SAFE');
  });

  it('operationDate present usa (operationDate || date) per fer match fort', () => {
    const existing = [makeExisting({ id: 'tx-1', balanceAfter: 1000, operationDate: undefined, date: '2026-02-15T12:00:00.000Z' })];
    const parsed = [makeIncoming({ balanceAfter: 1000, operationDate: '2026-02-15', date: '2026-02-10T00:00:00.000Z' })];

    const result = classifyTransactions(parsed, existing, 'acc-1');

    assert.equal(result.length, 1);
    assert.equal(result[0].status, 'DUPLICATE_SAFE');
    assert.equal(result[0].reason, 'BALANCE_AMOUNT_DATE');
  });
});
