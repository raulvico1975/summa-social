import type { Transaction } from '@/lib/data';

type TransactionsById = Record<string, Transaction>;

/**
 * Un fill de desglossament és una transacció amb parentTransactionId
 * on el pare està marcat com isSplit=true.
 */
export function isSplitChildTransaction(
  transaction: Transaction,
  transactionsById: TransactionsById
): boolean {
  const parentId = transaction.parentTransactionId;
  if (!parentId) return false;
  return transactionsById[parentId]?.isSplit === true;
}

/**
 * Filtra els fills de desglossament per mantenir la taula en mode "només banc real".
 */
export function filterSplitChildTransactions(
  transactions: Transaction[],
  transactionsById: TransactionsById
): Transaction[] {
  return transactions.filter((tx) => !isSplitChildTransaction(tx, transactionsById));
}

/**
 * El menú ha d'oferir "Desfer desglossament" sempre que el pare estigui desglossat.
 */
export function canShowUndoSplitAction(transaction: Transaction): boolean {
  return transaction.isSplit === true;
}
