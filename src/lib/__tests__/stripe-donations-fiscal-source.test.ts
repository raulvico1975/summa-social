import test from 'node:test';
import assert from 'node:assert/strict';

import type { Transaction } from '@/lib/data';
import type { Donation } from '@/lib/types/donations';
import {
  isStripeDonationFiscalRecord,
  mergeTransactionsWithStripeDonations,
  toFiscalTransactionFromStripeDonation,
} from '@/lib/fiscal/stripe-donations-fiscal-source';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx_1',
    date: '2026-03-10',
    description: 'Donacio legacy',
    amount: 15,
    category: null,
    document: null,
    contactId: 'donor-1',
    contactType: 'donor',
    transactionType: 'donation',
    ...overrides,
  };
}

function makeDonation(overrides: Partial<Donation> = {}): Donation {
  return {
    id: 'don_1',
    date: '2026-03-12',
    contactId: 'donor-1',
    amountGross: 12,
    source: 'stripe',
    stripePaymentId: 'pay_1',
    parentTransactionId: 'parent_tx_1',
    type: 'donation',
    description: 'Donacio Stripe imputada',
    ...overrides,
  };
}

test('isStripeDonationFiscalRecord accepta només Stripe fiscal vàlida', () => {
  assert.equal(isStripeDonationFiscalRecord(makeDonation()), true);
  assert.equal(isStripeDonationFiscalRecord(makeDonation({ type: 'stripe_adjustment', id: 'adj_1' })), false);
  assert.equal(isStripeDonationFiscalRecord(makeDonation({ archivedAt: '2026-03-13T10:00:00.000Z', id: 'arc_1' })), false);
  assert.equal(isStripeDonationFiscalRecord(makeDonation({ amountGross: 0, id: 'zero_1' })), false);
  assert.equal(isStripeDonationFiscalRecord(makeDonation({ contactId: null, id: 'no_contact_1' })), false);
});

test('toFiscalTransactionFromStripeDonation converteix amountGross en donació fiscal virtual', () => {
  const donation = makeDonation();
  const transaction = toFiscalTransactionFromStripeDonation(donation);

  assert.equal(transaction.id, 'don_1');
  assert.equal(transaction.amount, 12);
  assert.equal(transaction.transactionType, 'donation');
  assert.equal(transaction.contactId, 'donor-1');
  assert.equal(transaction.contactType, 'donor');
  assert.equal(transaction.stripePaymentId, 'pay_1');
});

test('mergeTransactionsWithStripeDonations evita doble còmput per stripePaymentId i exclou ajustos', () => {
  const legacyStripe = makeTransaction({
    id: 'tx_stripe_legacy',
    amount: 12,
    description: 'Stripe legacy',
    stripePaymentId: 'pay_1',
    source: 'stripe',
  });
  const legacyNormal = makeTransaction({
    id: 'tx_normal',
    amount: 15,
    description: 'Donacio transferència normal Bloc C',
    stripePaymentId: null,
    source: 'bank',
  });

  const merged = mergeTransactionsWithStripeDonations(
    [legacyStripe, legacyNormal],
    [
      makeDonation({ id: 'don_stripe_1', stripePaymentId: 'pay_1', amountGross: 12 }),
      makeDonation({ id: 'don_adj_1', stripePaymentId: 'pay_adj', type: 'stripe_adjustment', amountGross: 1 }),
    ]
  );

  assert.equal(merged.length, 2);
  assert.deepEqual(
    merged.map((transaction) => transaction.id).sort(),
    ['don_stripe_1', 'tx_normal']
  );
  assert.equal(merged.find((transaction) => transaction.id === 'don_stripe_1')?.amount, 12);
  assert.equal(merged.find((transaction) => transaction.id === 'tx_normal')?.amount, 15);
});
