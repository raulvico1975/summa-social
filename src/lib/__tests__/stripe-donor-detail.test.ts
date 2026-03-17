import test from 'node:test';
import assert from 'node:assert/strict';

import {
  filterStripeDonationsForDrawer,
  isStripeDonationForDrawer,
} from '@/lib/donor-detail/stripe-donations-for-drawer';
import type { Donation } from '@/lib/types/donations';

function makeDonation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: 'don_1',
    date: '2026-06-01',
    contactId: 'donor-1',
    amountGross: 25,
    source: 'stripe',
    stripePaymentId: 'pay_1',
    parentTransactionId: 'tx_parent_1',
    type: 'donation',
    description: 'Donacio Stripe',
    ...overrides,
  };
}

test('isStripeDonationForDrawer accepta donacions Stripe actives i fiscals del drawer', () => {
  assert.equal(isStripeDonationForDrawer(makeDonation()), true);
});

test('isStripeDonationForDrawer exclou ajustos Stripe i arxivades', () => {
  assert.equal(isStripeDonationForDrawer(makeDonation({ id: 'adj_1', type: 'stripe_adjustment' })), false);
  assert.equal(isStripeDonationForDrawer(makeDonation({ id: 'arc_1', archivedAt: '2026-06-02T10:00:00.000Z' })), false);
});

test('filterStripeDonationsForDrawer filtra per any i no mostra Stripe a la vista de returns', () => {
  const donations = [
    makeDonation({ id: 'don_2026', date: '2026-06-01', amountGross: 25 }),
    makeDonation({ id: 'don_2025', date: '2025-05-01', amountGross: 30, stripePaymentId: 'pay_2', parentTransactionId: 'tx_parent_2' }),
    makeDonation({ id: 'adj_2026', date: '2026-06-01', type: 'stripe_adjustment', parentTransactionId: 'tx_parent_3' }),
  ];

  const all2026 = filterStripeDonationsForDrawer({
    donations,
    selectedYear: '2026',
    filterStatus: 'all',
  });
  const returns2026 = filterStripeDonationsForDrawer({
    donations,
    selectedYear: '2026',
    filterStatus: 'returns',
  });

  assert.deepEqual(all2026.map((donation) => donation.id), ['don_2026']);
  assert.deepEqual(returns2026, []);
});
