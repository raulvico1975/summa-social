import type { Transaction } from '@/lib/data';
import type { Donation } from '@/lib/types/donations';

export function isStripeDonationFiscalRecord(donation: Donation): boolean {
  return Boolean(
    donation.source === 'stripe' &&
      donation.type !== 'stripe_adjustment' &&
      !donation.archivedAt &&
      donation.contactId &&
      typeof donation.amountGross === 'number' &&
      donation.amountGross > 0
  );
}

export function toFiscalTransactionFromStripeDonation(donation: Donation): Transaction {
  if (!donation.id) {
    throw new Error('Stripe donation requires id to build fiscal transaction');
  }
  if (!isStripeDonationFiscalRecord(donation)) {
    throw new Error('Donation is not a fiscal Stripe donation');
  }

  return {
    id: donation.id,
    date: donation.date,
    description: donation.description ?? donation.customerEmail ?? donation.stripePaymentId ?? 'Donacio Stripe',
    amount: donation.amountGross!,
    category: null,
    document: null,
    contactId: donation.contactId,
    contactType: 'donor',
    transactionType: 'donation',
    source: 'stripe',
    stripePaymentId: donation.stripePaymentId ?? null,
    archivedAt: donation.archivedAt ?? null,
  };
}

export function mergeTransactionsWithStripeDonations(
  transactions: Transaction[],
  donations: Donation[]
): Transaction[] {
  const fiscalStripeDonations = donations
    .filter(isStripeDonationFiscalRecord)
    .map(toFiscalTransactionFromStripeDonation);

  const importedStripePaymentIds = new Set(
    fiscalStripeDonations
      .map((donation) => donation.stripePaymentId)
      .filter((stripePaymentId): stripePaymentId is string => typeof stripePaymentId === 'string' && stripePaymentId.trim().length > 0)
  );

  const dedupedTransactions = transactions.filter((transaction) => {
    if (!transaction.stripePaymentId) return true;
    return !importedStripePaymentIds.has(transaction.stripePaymentId);
  });

  return [...dedupedTransactions, ...fiscalStripeDonations];
}
