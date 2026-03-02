import { resolveEffectiveFiscalKind } from '@/lib/fiscal/fiscal-oracle';

interface S9TransactionInput {
  id: string;
  date: string;
  amount: number;
  category?: string | null;
  contactId?: string | null;
  contactType?: 'donor' | 'supplier' | 'employee';
  source?: 'bank' | 'remittance' | 'manual' | 'stripe';
  transactionType?: 'normal' | 'return' | 'return_fee' | 'donation' | 'fee';
  archivedAt?: string | null;
  fiscalKind?: 'donation' | 'non_fiscal' | 'pending_review' | null;
}

export interface S9FiscalOrgSettings {
  fiscalIncomeCategoryIds: string[];
}

export interface S9FiscalCoherenceResult {
  pendingCount: number;
  pendingAmountCents: number;
  diagnosisTextCa: string;
  actionTextCa: string;
}

const euroFormatter = new Intl.NumberFormat('ca-ES', {
  style: 'currency',
  currency: 'EUR',
});

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function isFiscalPendingAssignedIncome(tx: S9TransactionInput): boolean {
  if (!tx.contactId) return false;
  if (tx.contactType !== 'donor') return false;
  if (!(tx.amount > 0)) return false;
  if (tx.archivedAt) return false;

  const effectiveFiscalKind = resolveEffectiveFiscalKind(tx);
  return effectiveFiscalKind !== 'donation';
}

export function calculateS9FiscalCoherence(
  transactions: S9TransactionInput[],
  orgSettings: S9FiscalOrgSettings,
): S9FiscalCoherenceResult {
  const fiscalIncomeCategoryIds = new Set(
    orgSettings.fiscalIncomeCategoryIds.filter((value) => typeof value === 'string' && value.trim().length > 0)
  );

  let pendingCount = 0;
  let pendingAmountCents = 0;
  let pendingReviewCount = 0;
  let nonFiscalCount = 0;
  let outsideFiscalCategoryCount = 0;

  for (const tx of transactions) {
    if (!isFiscalPendingAssignedIncome(tx)) continue;

    pendingCount += 1;
    pendingAmountCents += toCents(tx.amount);

    const effectiveFiscalKind = resolveEffectiveFiscalKind(tx);
    if (effectiveFiscalKind === 'pending_review') {
      pendingReviewCount += 1;
    }
    if (effectiveFiscalKind === 'non_fiscal') {
      nonFiscalCount += 1;
    }

    if (!tx.category || !fiscalIncomeCategoryIds.has(tx.category)) {
      outsideFiscalCategoryCount += 1;
    }
  }

  if (pendingCount === 0) {
    return {
      pendingCount,
      pendingAmountCents,
      diagnosisTextCa: 'No hi ha ingressos assignats fora del còmput fiscal.',
      actionTextCa: 'Cap acció necessària.',
    };
  }

  const amountLabel = euroFormatter.format(pendingAmountCents / 100);
  const diagnosisTextCa = `${pendingCount} ingressos assignats no computen fiscalment (${amountLabel}).`;

  if (outsideFiscalCategoryCount >= pendingReviewCount && outsideFiscalCategoryCount >= nonFiscalCount) {
    return {
      pendingCount,
      pendingAmountCents,
      diagnosisTextCa,
      actionTextCa: 'Revisa la categoria d\'ingrés i reclassifica com a donació o quota quan pertoqui.',
    };
  }

  if (pendingReviewCount >= nonFiscalCount) {
    return {
      pendingCount,
      pendingAmountCents,
      diagnosisTextCa,
      actionTextCa: 'Marca els ingressos pendents com a fiscalment donació quan siguin deduïbles.',
    };
  }

  return {
    pendingCount,
    pendingAmountCents,
    diagnosisTextCa,
    actionTextCa: 'Revisa els ingressos marcats com a no fiscals i corregeix-los si han de computar.',
  };
}

export function isS9PendingFiscalTransaction(tx: S9TransactionInput): boolean {
  return isFiscalPendingAssignedIncome(tx);
}
