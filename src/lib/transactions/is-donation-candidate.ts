import type { Transaction } from '@/lib/data';

function hasPositiveLinkedDonor(tx: Transaction): boolean {
  return tx.amount > 0 && !!tx.contactId && tx.contactType === 'donor';
}

export function isDonationCandidate(tx: Transaction): boolean {
  return hasPositiveLinkedDonor(tx) && tx.transactionType !== 'donation';
}

export function canToggleDonation182(tx: Transaction): boolean {
  if (tx.donationStatus === 'returned') {
    return false;
  }

  if (isDonationCandidate(tx)) {
    return true;
  }

  // Structural donations (Stripe, remittances, split children) keep their badge
  // but are not exposed as a reversible 182 toggle from the movements table.
  return (
    hasPositiveLinkedDonor(tx) &&
    tx.transactionType === 'donation' &&
    tx.source !== 'stripe' &&
    tx.source !== 'remittance' &&
    !tx.isRemittance &&
    !tx.isRemittanceItem &&
    !tx.isSplit &&
    !tx.parentTransactionId
  );
}
