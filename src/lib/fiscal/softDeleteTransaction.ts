// src/lib/fiscal/softDeleteTransaction.ts
// Soft-delete per transaccions fiscals (returns, remittance IN, stripe donations)

import { doc, updateDoc, addDoc, collection, type Firestore } from 'firebase/firestore';
import type { Transaction } from '../data';

// =============================================================================
// TIPUS
// =============================================================================

export interface SoftDeleteContext {
  firestore: Firestore;
  orgId: string;
  userId: string;
  reason?: string;
}

export interface SoftDeleteResult {
  archived: boolean;
  reason: 'fiscal_protected' | 'deleted_normally';
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Determina si una transacció és fiscalment rellevant i requereix soft-delete
 *
 * Criteris:
 * - transactionType === 'return' (devolucions)
 * - source === 'remittance' && amount > 0 (quotes IN)
 * - source === 'stripe' && transactionType === 'donation' && contactId (donacions Stripe amb donant)
 */
export function isFiscallyRelevantTransaction(tx: Transaction): boolean {
  // Returns: sempre fiscals
  if (tx.transactionType === 'return') {
    return true;
  }

  // Remittance IN (quotes positives): fiscals
  if (tx.source === 'remittance' && tx.amount > 0) {
    return true;
  }

  // Stripe donations amb contactId: fiscals
  if (tx.source === 'stripe' && tx.transactionType === 'donation' && tx.contactId) {
    return true;
  }

  return false;
}

/**
 * Arxiva una transacció fiscal (soft-delete)
 * NO elimina el document, només marca amb archivedAt
 */
export async function archiveTransaction(
  tx: Transaction,
  context: SoftDeleteContext
): Promise<void> {
  const { firestore, orgId, userId, reason } = context;

  const txRef = doc(firestore, 'organizations', orgId, 'transactions', tx.id);

  const now = new Date().toISOString();

  await updateDoc(txRef, {
    archivedAt: now,
    archivedByUid: userId,
    archivedReason: reason || 'user_delete',
    archivedFromAction: 'user_delete',
  });

  // Escriure audit log
  await writeAuditLog(firestore, orgId, {
    action: 'ARCHIVE_FISCAL_TX',
    txId: tx.id,
    amount: tx.amount,
    date: tx.date,
    transactionType: tx.transactionType,
    source: tx.source,
    contactId: tx.contactId,
    actorUid: userId,
    timestamp: now,
    reason: reason || 'user_delete',
  });
}

/**
 * Escriu un registre d'auditoria
 */
async function writeAuditLog(
  firestore: Firestore,
  orgId: string,
  data: {
    action: string;
    txId: string;
    amount: number;
    date: string;
    transactionType?: string;
    source?: string;
    contactId?: string | null;
    actorUid: string;
    timestamp: string;
    reason: string;
  }
): Promise<void> {
  try {
    const auditRef = collection(firestore, 'organizations', orgId, 'auditLogs');
    await addDoc(auditRef, data);
  } catch (error) {
    // No bloquejar l'operació principal si falla l'audit
    console.error('[softDeleteTransaction] Error writing audit log:', error);
  }
}

/**
 * Processa una eliminació de transacció:
 * - Si és fiscal: arxiva (soft-delete)
 * - Si no és fiscal: retorna false (cal fer deleteDoc normal)
 *
 * @returns true si s'ha arxivat, false si cal eliminar normalment
 */
export async function handleTransactionDelete(
  tx: Transaction,
  context: SoftDeleteContext
): Promise<SoftDeleteResult> {
  if (isFiscallyRelevantTransaction(tx)) {
    await archiveTransaction(tx, context);
    return { archived: true, reason: 'fiscal_protected' };
  }

  return { archived: false, reason: 'deleted_normally' };
}
