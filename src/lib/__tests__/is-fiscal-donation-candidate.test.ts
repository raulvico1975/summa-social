import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isFiscalDonationCandidate } from '../fiscal/is-fiscal-donation-candidate';

describe('isFiscalDonationCandidate', () => {
  it('retorna true només per transactionType=donation', () => {
    assert.strictEqual(isFiscalDonationCandidate({ transactionType: 'donation' }), true);
    assert.strictEqual(isFiscalDonationCandidate({ transactionType: 'normal' }), false);
    assert.strictEqual(isFiscalDonationCandidate({ transactionType: 'return' }), false);
    assert.strictEqual(isFiscalDonationCandidate({ transactionType: undefined }), false);
  });

  it('exclou transaccions arxivades', () => {
    assert.strictEqual(
      isFiscalDonationCandidate({
        transactionType: 'donation',
        archivedAt: '2025-01-01T00:00:00.000Z',
      }),
      false
    );
  });

  it('exclou transaccions pare desglossades', () => {
    assert.strictEqual(
      isFiscalDonationCandidate({
        transactionType: 'donation',
        isSplit: true,
      }),
      false
    );
  });
});
