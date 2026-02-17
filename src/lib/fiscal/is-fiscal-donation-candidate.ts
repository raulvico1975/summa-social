interface FiscalDonationCandidateInput {
  transactionType?: string | null;
  archivedAt?: string | null;
  isSplit?: boolean;
}

export function isFiscalDonationCandidate(tx: FiscalDonationCandidateInput): boolean {
  if (tx.archivedAt) return false;
  if (tx.isSplit) return false;
  return tx.transactionType === 'donation';
}
