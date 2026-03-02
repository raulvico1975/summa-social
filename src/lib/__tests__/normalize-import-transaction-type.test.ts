import { describe, it } from 'node:test';
import assert from 'node:assert';
import { normalizeImportTransactionTypeForPersist } from '../importers/bank/normalize-import-transaction-type';

describe('normalizeImportTransactionTypeForPersist', () => {
  it('keeps return when detection marked the movement as return', () => {
    const result = normalizeImportTransactionTypeForPersist('return');
    assert.strictEqual(result, 'return');
  });

  it('keeps non-return types unchanged', () => {
    assert.strictEqual(normalizeImportTransactionTypeForPersist('normal'), 'normal');
    assert.strictEqual(normalizeImportTransactionTypeForPersist('donation'), 'donation');
  });
});
