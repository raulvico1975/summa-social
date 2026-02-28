import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  handleTransactionDelete,
  isFiscallyRelevantTransaction,
} from '../fiscal/softDeleteTransaction';
import type { Transaction } from '../data';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    date: '2026-02-01',
    description: 'Moviment test',
    amount: -10,
    category: null,
    document: null,
    ...overrides,
  };
}

describe('isFiscallyRelevantTransaction', () => {
  it('marks returns as fiscally relevant', () => {
    assert.equal(isFiscallyRelevantTransaction(makeTx({ transactionType: 'return' })), true);
  });

  it('marks remittance IN as fiscally relevant', () => {
    const tx = makeTx({ source: 'remittance', amount: 25, transactionType: 'normal' });
    assert.equal(isFiscallyRelevantTransaction(tx), true);
  });

  it('marks Stripe donation with contactId as fiscally relevant', () => {
    const tx = makeTx({ source: 'stripe', transactionType: 'donation', amount: 25, contactId: 'd-1' });
    assert.equal(isFiscallyRelevantTransaction(tx), true);
  });

  it('excludes non-fiscal transactions', () => {
    assert.equal(
      isFiscallyRelevantTransaction(makeTx({ source: 'remittance', amount: -25, transactionType: 'normal' })),
      false,
    );
    assert.equal(
      isFiscallyRelevantTransaction(
        makeTx({ source: 'stripe', transactionType: 'donation', amount: 25, contactId: null }),
      ),
      false,
    );
    assert.equal(isFiscallyRelevantTransaction(makeTx({ transactionType: 'normal' })), false);
  });

  it('archivedAt does not change fiscal classification (current behavior)', () => {
    const tx = makeTx({ transactionType: 'return', archivedAt: '2026-02-10T10:00:00.000Z' });
    assert.equal(isFiscallyRelevantTransaction(tx), true);
  });
});

describe('handleTransactionDelete', () => {
  it('returns deleted_normally for non fiscal tx without touching IO', async () => {
    const tx = makeTx({ transactionType: 'normal', source: 'bank', amount: -30 });

    const result = await handleTransactionDelete(tx, {
      firestore: {} as any,
      orgId: 'org-1',
      userId: 'uid-1',
    });

    assert.deepEqual(result, { archived: false, reason: 'deleted_normally' });
  });
});
