import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getSafeDuplicateUi } from '../safe-duplicate-ui';

describe('safe duplicate UI mapping', () => {
  it('maps INTRA_FILE without existing ID', () => {
    const ui = getSafeDuplicateUi('INTRA_FILE');
    assert.equal(ui.mainKey, 'movements.import.safeDuplicates.reason.intraFile.main');
    assert.equal(ui.showExistingId, false);
  });

  it('maps BANK_REF with existing ID', () => {
    const ui = getSafeDuplicateUi('BANK_REF');
    assert.equal(ui.mainKey, 'movements.import.safeDuplicates.reason.bankRef.main');
    assert.equal(ui.showExistingId, true);
  });

  it('maps BALANCE_AMOUNT_DATE with existing ID', () => {
    const ui = getSafeDuplicateUi('BALANCE_AMOUNT_DATE');
    assert.equal(ui.mainKey, 'movements.import.safeDuplicates.reason.balanceAmountDate.main');
    assert.equal(ui.showExistingId, true);
  });

  it('falls back to unknown mapping for null reason', () => {
    const ui = getSafeDuplicateUi(null);
    assert.equal(ui.mainKey, 'movements.import.safeDuplicates.reason.unknown.main');
    assert.equal(ui.detailKey, null);
    assert.equal(ui.showExistingId, false);
  });
});
