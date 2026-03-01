import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isVisibleInMovementsLedger } from '../transactions/remittance-visibility';

describe('isVisibleInMovementsLedger', () => {
  it('mostra pare de remesa legacy (isRemittance=true, source=remittance)', () => {
    const visible = isVisibleInMovementsLedger({
      isRemittance: true,
      isRemittanceItem: false,
      source: 'remittance',
    });
    assert.equal(visible, true);
  });

  it('oculta filla de remesa (isRemittanceItem=true)', () => {
    const visible = isVisibleInMovementsLedger({
      isRemittance: false,
      isRemittanceItem: true,
      source: 'remittance',
    });
    assert.equal(visible, false);
  });
});
