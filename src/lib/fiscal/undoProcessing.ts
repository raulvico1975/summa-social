// src/lib/fiscal/undoProcessing.ts
// Lògica per desfer processaments de remeses (quotes, returns, Stripe)
// Utilitza soft-delete per filles fiscals i locks per multiusuari

import {
  doc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  deleteField,
  addDoc,
  type Firestore,
} from 'firebase/firestore';
import type { Transaction } from '../data';
import { isFiscallyRelevantTransaction } from './softDeleteTransaction';
import { acquireProcessLock, releaseProcessLock, type LockOperation } from './processLocks';

// =============================================================================
// TIPUS
// =============================================================================

export type UndoOperationType = 'remittance_in' | 'returns' | 'stripe';

export interface UndoContext {
  firestore: Firestore;
  orgId: string;
  userId: string;
}

export interface UndoResult {
  success: boolean;
  childrenArchived: number;
  childrenDeleted: number;
  error?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Detecta el tipus d'operació a desfer basant-se en la transacció pare
 */
export function detectUndoOperationType(tx: Transaction): UndoOperationType | null {
  // Stripe split: filles amb source='stripe'
  // El pare no té source='stripe' (és bancari) però ha generat filles Stripe
  // Detectem per existència de stripeTransferId o comprovant filles
  if (tx.stripeTransferId) {
    return 'stripe';
  }

  if (!tx.isRemittance) {
    return null;
  }

  // Remesa de devolucions
  if (tx.remittanceType === 'returns') {
    return 'returns';
  }

  // Remesa IN (quotes/donacions)
  if (tx.amount > 0) {
    return 'remittance_in';
  }

  // Remesa OUT (pagaments) - també suportada
  if (tx.amount < 0) {
    return 'remittance_in'; // Usem el mateix flux
  }

  return null;
}

/**
 * Obté el text de confirmació segons el tipus
 */
export function getUndoConfirmationText(type: UndoOperationType): string {
  switch (type) {
    case 'remittance_in':
      return 'DESFER QUOTES';
    case 'returns':
      return 'DESFER DEVOLUCIONS';
    case 'stripe':
      return 'DESFER STRIPE';
  }
}

/**
 * Obté el títol del diàleg segons el tipus
 */
export function getUndoDialogTitle(type: UndoOperationType): string {
  switch (type) {
    case 'remittance_in':
      return 'Desfer remesa de quotes';
    case 'returns':
      return 'Desfer remesa de devolucions';
    case 'stripe':
      return 'Desfer import Stripe';
  }
}

/**
 * Obté la descripció del diàleg segons el tipus i nombre de filles
 */
export function getUndoDialogDescription(type: UndoOperationType, childCount: number): string {
  const baseText = `S'arxivaran ${childCount} transacció${childCount !== 1 ? 'ns' : ''} filla${childCount !== 1 ? 'es' : ''} i podràs processar de nou.`;

  switch (type) {
    case 'remittance_in':
      return `Això NO esborra el moviment bancari. ${baseText}`;
    case 'returns':
      return `Això NO esborra el moviment bancari. ${baseText} Les devolucions s'arxivaran (no s'eliminaran).`;
    case 'stripe':
      return `Això NO esborra el moviment bancari. ${baseText} Les donacions Stripe s'arxivaran.`;
  }
}

// =============================================================================
// FUNCIONS PRINCIPALS
// =============================================================================

/**
 * Compta les transaccions filles d'un pare
 */
export async function countChildTransactions(
  firestore: Firestore,
  orgId: string,
  parentTxId: string,
  remittanceId?: string | null
): Promise<number> {
  const transactionsRef = collection(firestore, 'organizations', orgId, 'transactions');

  // Buscar per parentTransactionId O per remittanceId
  let count = 0;

  // Mètode 1: parentTransactionId (Stripe i nous processaments)
  const byParentQuery = query(
    transactionsRef,
    where('parentTransactionId', '==', parentTxId)
  );
  const byParentSnap = await getDocs(byParentQuery);
  count = byParentSnap.size;

  // Mètode 2: remittanceId (remeses legacy)
  if (remittanceId && count === 0) {
    const byRemittanceQuery = query(
      transactionsRef,
      where('remittanceId', '==', remittanceId)
    );
    const byRemittanceSnap = await getDocs(byRemittanceQuery);
    // No comptar el pare
    count = byRemittanceSnap.docs.filter(d => d.id !== parentTxId).length;
  }

  return count;
}

/**
 * Executa l'operació d'undo amb locks i soft-delete
 */
export async function executeUndo(
  parentTx: Transaction,
  operationType: UndoOperationType,
  context: UndoContext
): Promise<UndoResult> {
  const { firestore, orgId, userId } = context;
  const parentTxId = parentTx.id;

  // Determinar operació de lock
  const lockOperation: LockOperation = 'undoRemittance';

  // Adquirir lock
  const lockResult = await acquireProcessLock({
    firestore,
    orgId,
    parentTxId,
    operation: lockOperation,
    uid: userId,
  });

  if (!lockResult.ok) {
    return {
      success: false,
      childrenArchived: 0,
      childrenDeleted: 0,
      error: lockResult.reason === 'locked_by_other'
        ? 'Un altre usuari està processant aquesta transacció'
        : 'No s\'ha pogut adquirir el lock',
    };
  }

  try {
    const batch = writeBatch(firestore);
    const transactionsRef = collection(firestore, 'organizations', orgId, 'transactions');
    const now = new Date().toISOString();

    // Buscar totes les filles
    const children: { id: string; data: Transaction }[] = [];

    // Buscar per parentTransactionId
    const byParentQuery = query(
      transactionsRef,
      where('parentTransactionId', '==', parentTxId)
    );
    const byParentSnap = await getDocs(byParentQuery);
    byParentSnap.forEach(d => {
      children.push({ id: d.id, data: { id: d.id, ...d.data() } as Transaction });
    });

    // Buscar per remittanceId (legacy) si no hem trobat res
    if (children.length === 0 && parentTx.remittanceId) {
      const byRemittanceQuery = query(
        transactionsRef,
        where('remittanceId', '==', parentTx.remittanceId)
      );
      const byRemittanceSnap = await getDocs(byRemittanceQuery);
      byRemittanceSnap.forEach(d => {
        if (d.id !== parentTxId) {
          children.push({ id: d.id, data: { id: d.id, ...d.data() } as Transaction });
        }
      });
    }

    let archivedCount = 0;
    let deletedCount = 0;

    // Processar cada filla
    for (const child of children) {
      const childRef = doc(transactionsRef, child.id);

      // Decidir: soft-delete (arxivar) o hard-delete
      if (isFiscallyRelevantTransaction(child.data)) {
        // Soft-delete per transaccions fiscals
        batch.update(childRef, {
          archivedAt: now,
          archivedByUid: userId,
          archivedReason: 'undo_process',
          archivedFromAction: `undo_${operationType}`,
        });
        archivedCount++;
      } else {
        // Hard-delete per transaccions no fiscals
        batch.delete(childRef);
        deletedCount++;
      }
    }

    // Eliminar document de remesa si existeix
    if (parentTx.remittanceId) {
      const remittanceRef = doc(firestore, 'organizations', orgId, 'remittances', parentTx.remittanceId);
      batch.delete(remittanceRef);
    }

    // Resetejar el pare
    batch.update(doc(transactionsRef, parentTxId), {
      // Camps de remesa
      isRemittance: deleteField(),
      remittanceId: deleteField(),
      remittanceItemCount: deleteField(),
      remittanceResolvedCount: deleteField(),
      remittancePendingCount: deleteField(),
      remittancePendingTotalAmount: deleteField(),
      remittanceType: deleteField(),
      remittanceDirection: deleteField(),
      remittanceStatus: deleteField(),
      pendingReturns: deleteField(),
      // Camps Stripe (si aplica)
      stripeTransferId: deleteField(),
      stripePayoutId: deleteField(),
      // Metadata
      updatedAt: now,
    });

    // Commit
    await batch.commit();

    // Escriure audit log
    await writeUndoAuditLog(firestore, orgId, {
      action: 'UNDO_PROCESSING',
      parentTxId,
      operationType,
      childrenArchived: archivedCount,
      childrenDeleted: deletedCount,
      actorUid: userId,
      timestamp: now,
    });

    return {
      success: true,
      childrenArchived: archivedCount,
      childrenDeleted: deletedCount,
    };

  } finally {
    // Alliberar lock sempre
    await releaseProcessLock({
      firestore,
      orgId,
      parentTxId,
    });
  }
}

/**
 * Escriu un registre d'auditoria per l'undo
 */
async function writeUndoAuditLog(
  firestore: Firestore,
  orgId: string,
  data: {
    action: string;
    parentTxId: string;
    operationType: UndoOperationType;
    childrenArchived: number;
    childrenDeleted: number;
    actorUid: string;
    timestamp: string;
  }
): Promise<void> {
  try {
    const auditRef = collection(firestore, 'organizations', orgId, 'auditLogs');
    await addDoc(auditRef, data);
  } catch (error) {
    // No bloquejar l'operació principal si falla l'audit
    console.error('[undoProcessing] Error writing audit log:', error);
  }
}
