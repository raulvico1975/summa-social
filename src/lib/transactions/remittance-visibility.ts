import type { Transaction } from '@/lib/data';

/**
 * Regla de visibilitat ledger:
 * - amagar sempre filles de remesa
 * - amagar source='remittance' només si NO és pare de remesa
 */
export function isVisibleInMovementsLedger(
  tx: Pick<Transaction, 'isRemittance' | 'isRemittanceItem' | 'source'>
): boolean {
  if (tx.isRemittanceItem === true) return false;
  if (tx.source === 'remittance' && tx.isRemittance !== true) return false;
  return true;
}
