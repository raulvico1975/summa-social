import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  calculateSplitAmountDeltaCents,
  isSplitAmountBalanced,
  SPLIT_AMOUNT_TOLERANCE_CENTS,
} from '../fiscal/split-amount-balance';

describe('split-amount-balance', () => {
  it('calcula delta correcte en cèntims', () => {
    assert.strictEqual(calculateSplitAmountDeltaCents(1000, [600, 400]), 0);
    assert.strictEqual(calculateSplitAmountDeltaCents(1000, [600, 401]), 1);
    assert.strictEqual(calculateSplitAmountDeltaCents(1000, [600, 397]), -3);
  });

  it('accepta tolerància de ±2 cèntims', () => {
    assert.strictEqual(isSplitAmountBalanced(1000, [500, 502]), true);
    assert.strictEqual(isSplitAmountBalanced(1000, [500, 498]), true);
    assert.strictEqual(isSplitAmountBalanced(1000, [500, 503]), false);
    assert.strictEqual(isSplitAmountBalanced(1000, [500, 497]), false);
  });

  it('usa la tolerància P0 per defecte', () => {
    assert.strictEqual(SPLIT_AMOUNT_TOLERANCE_CENTS, 2);
  });
});
