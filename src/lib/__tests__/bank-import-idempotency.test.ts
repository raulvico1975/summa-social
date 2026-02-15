import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  computeBankImportHash,
  prepareDeterministicTransactions,
  type CanonicalBankImportTx,
} from '../bank-import/idempotency';

function makeTx(overrides: Partial<CanonicalBankImportTx> = {}): CanonicalBankImportTx {
  return {
    date: '2026-02-01T00:00:00.000Z',
    description: 'Quota soci',
    amount: 25,
    category: null,
    document: null,
    contactId: 'donor-1',
    contactType: 'donor',
    transactionType: 'normal',
    bankAccountId: 'acc-1',
    source: 'bank',
    ...overrides,
  };
}

describe('bank import idempotency', () => {
  it('genera el mateix hash independentment de l ordre de les transaccions', () => {
    const txA = makeTx({ description: 'Quota A', amount: 10 });
    const txB = makeTx({ description: 'Quota B', amount: 20 });

    const hash1 = computeBankImportHash({
      orgId: 'org-1',
      bankAccountId: 'acc-1',
      source: 'csv',
      fileName: 'extracte.csv',
      totalRows: 2,
      transactions: [txA, txB],
    });

    const hash2 = computeBankImportHash({
      orgId: 'org-1',
      bankAccountId: 'acc-1',
      source: 'csv',
      fileName: 'extracte.csv',
      totalRows: 2,
      transactions: [txB, txA],
    });

    assert.equal(hash1, hash2);
  });

  it('genera ids deterministes independentment de l ordre d entrada', () => {
    const txA = makeTx({ description: 'Quota A', amount: 10 });
    const txB = makeTx({ description: 'Quota B', amount: 20 });
    const inputHash = 'a'.repeat(64);

    const p1 = prepareDeterministicTransactions([txA, txB], inputHash).map((x) => x.id);
    const p2 = prepareDeterministicTransactions([txB, txA], inputHash).map((x) => x.id);

    assert.deepEqual(p1, p2);
  });

  it('manté ids únics quan hi ha files idèntiques duplicades', () => {
    const tx = makeTx({ description: 'Quota Duplicada', amount: 15 });
    const inputHash = 'b'.repeat(64);

    const prepared = prepareDeterministicTransactions([tx, tx], inputHash);
    const ids = prepared.map((x) => x.id);

    assert.equal(ids.length, 2);
    assert.notEqual(ids[0], ids[1]);
  });
});
