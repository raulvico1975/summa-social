export interface FiscalNetTransaction {
  date: string;
  amount: number;
  transactionType?: string;
  donationStatus?: string;
  archivedAt?: string | null;
  isRemittance?: boolean;
  isSplit?: boolean;
}

function isArchivedTransaction(tx: FiscalNetTransaction): boolean {
  return tx.archivedAt != null && tx.archivedAt !== '';
}

function isRemittanceParent(tx: FiscalNetTransaction): boolean {
  return tx.isRemittance === true;
}

function isSplitParent(tx: FiscalNetTransaction): boolean {
  return tx.isSplit === true;
}

function isExcludedFiscalTransaction(tx: FiscalNetTransaction): boolean {
  return isArchivedTransaction(tx) || isRemittanceParent(tx) || isSplitParent(tx);
}

export function calculateFiscalTransactionNetAmount(tx: FiscalNetTransaction): number {
  if (isExcludedFiscalTransaction(tx)) {
    return 0;
  }

  if (tx.transactionType === 'return' && tx.amount < 0) {
    return tx.amount;
  }

  if (tx.amount > 0 && tx.donationStatus === 'returned') {
    return -tx.amount;
  }

  if (tx.amount > 0 && tx.transactionType === 'donation') {
    return tx.amount;
  }

  return 0;
}

export function isFiscalReturnLikeTransaction(tx: FiscalNetTransaction): boolean {
  if (isExcludedFiscalTransaction(tx)) {
    return false;
  }

  return (tx.transactionType === 'return' && tx.amount < 0) ||
    (tx.amount > 0 && tx.donationStatus === 'returned');
}

