import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { calculateTransactionNetAmount } from '../model182';
import { isFiscalDonationCandidate } from '../fiscal/is-fiscal-donation-candidate';
import { mergeTransactionsWithStripeDonations } from '../fiscal/stripe-donations-fiscal-source';
import type { Transaction } from '../data';
import type { Donation } from '../types/donations';

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: overrides.id ?? 'tx',
    date: overrides.date ?? '2026-03-10',
    description: overrides.description ?? 'Test',
    amount: overrides.amount ?? 0,
    category: overrides.category ?? null,
    document: overrides.document ?? null,
    contactId: overrides.contactId ?? 'donor-1',
    contactType: overrides.contactType ?? 'donor',
    transactionType: overrides.transactionType ?? 'donation',
    source: overrides.source ?? 'manual',
    archivedAt: overrides.archivedAt ?? null,
    stripePaymentId: overrides.stripePaymentId ?? null,
    donationStatus: overrides.donationStatus,
  };
}

function donation(overrides: Partial<Donation>): Donation {
  return {
    id: overrides.id ?? 'donation',
    date: overrides.date ?? '2026-03-11',
    contactId: overrides.contactId ?? 'donor-1',
    amountGross: overrides.amountGross ?? 12,
    source: overrides.source ?? 'stripe',
    stripePaymentId: overrides.stripePaymentId ?? 'ch_test_1',
    parentTransactionId: overrides.parentTransactionId ?? 'parent-1',
    type: overrides.type ?? 'donation',
    archivedAt: overrides.archivedAt ?? null,
    description: overrides.description ?? 'Stripe donation',
    customerEmail: overrides.customerEmail ?? 'test@example.org',
  };
}

function buildReportNetTotal(
  transactions: Transaction[],
  donations: Donation[],
  contactId: string,
  year: number
) {
  const fiscalTransactions = mergeTransactionsWithStripeDonations(
    transactions.filter(tx => !tx.archivedAt),
    donations
  );

  return fiscalTransactions.reduce((sum, tx) => {
    if (tx.contactId !== contactId) return sum;
    if (new Date(tx.date).getFullYear() !== year) return sum;
    return sum + calculateTransactionNetAmount(tx);
  }, 0);
}

function buildCertificateSummary(
  transactions: Transaction[],
  donations: Donation[],
  contactId: string,
  year: number
) {
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const fiscalTransactions = mergeTransactionsWithStripeDonations(transactions, donations);

  const yearDonations = fiscalTransactions.filter(tx => {
    const txDate = tx.date.substring(0, 10);
    return (
      tx.amount > 0 &&
      isFiscalDonationCandidate(tx) &&
      tx.contactId === contactId &&
      tx.contactType === 'donor' &&
      txDate >= yearStart &&
      txDate <= yearEnd
    );
  });

  return {
    donationCount: yearDonations.length,
    grossAmount: yearDonations.reduce((sum, tx) => sum + tx.amount, 0),
  };
}

describe('stripe fiscal consumers', () => {
  it('reports net total from legacy + stripe donations without double counting duplicate stripePaymentId', () => {
    const transactions = [
      tx({ id: 'legacy-normal', amount: 15, source: 'manual' }),
      tx({
        id: 'legacy-stripe-duplicate',
        amount: 12,
        source: 'stripe',
        stripePaymentId: 'ch_dup_1',
      }),
    ];
    const donations = [
      donation({
        id: 'stripe-donation',
        amountGross: 12,
        stripePaymentId: 'ch_dup_1',
        type: 'donation',
      }),
      donation({
        id: 'stripe-adjustment',
        amountGross: 0.51,
        stripePaymentId: 'adj_1',
        contactId: null,
        type: 'stripe_adjustment',
      }),
    ];

    assert.equal(buildReportNetTotal(transactions, donations, 'donor-1', 2026), 27);
  });

  it('certificates count only fiscal donations and exclude stripe_adjustment', () => {
    const transactions = [
      tx({ id: 'legacy-normal', amount: 15, source: 'manual' }),
      tx({
        id: 'legacy-stripe-duplicate',
        amount: 12,
        source: 'stripe',
        stripePaymentId: 'ch_dup_1',
      }),
    ];
    const donations = [
      donation({
        id: 'stripe-donation',
        amountGross: 12,
        stripePaymentId: 'ch_dup_1',
        type: 'donation',
      }),
      donation({
        id: 'stripe-adjustment',
        amountGross: 0.51,
        stripePaymentId: 'adj_1',
        contactId: null,
        type: 'stripe_adjustment',
      }),
    ];

    assert.deepEqual(buildCertificateSummary(transactions, donations, 'donor-1', 2026), {
      donationCount: 2,
      grossAmount: 27,
    });
  });
});
