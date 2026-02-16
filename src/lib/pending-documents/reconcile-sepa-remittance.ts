// src/lib/pending-documents/reconcile-sepa-remittance.ts
// Servei per reconciliar una remesa SEPA pre-banc amb un moviment agregat

import {
  doc,
  getDoc,
  collection,
  writeBatch,
  serverTimestamp,
  type Firestore,
} from 'firebase/firestore';
import type { Transaction } from '@/lib/data';
import type { PendingDocument } from './types';
import type { PrebankRemittance } from './sepa-remittance';
import { pendingDocumentDoc } from './refs';
import { prebankRemittanceDoc } from './sepa-remittance';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ReconcileSepaRemittanceInput {
  orgId: string;
  prebankRemittanceId: string;
  parentTransactionId: string;
}

export interface ReconcileSepaRemittanceResult {
  success: boolean;
  remittanceId: string;
  childTransactionIds: string[];
  matchedDocCount: number;
  error?: string;
}

interface ChildTransactionData {
  pendingDoc: PendingDocument;
  amount: number;
  description: string;
  contactId: string | null;
  categoryId: string | null;
  documentPath: string | null;
  endToEndId: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

interface ValidationResult {
  valid: boolean;
  error?: string;
  prebankRemittance?: PrebankRemittance;
  parentTransaction?: Transaction;
  pendingDocs?: PendingDocument[];
  totalDocsAmount?: number;
}

async function validateReconciliation(
  firestore: Firestore,
  input: ReconcileSepaRemittanceInput
): Promise<ValidationResult> {
  const { orgId, prebankRemittanceId, parentTransactionId } = input;

  // 1. Carregar remesa pre-banc
  const prebankRef = prebankRemittanceDoc(firestore, orgId, prebankRemittanceId);
  const prebankSnap = await getDoc(prebankRef);

  if (!prebankSnap.exists()) {
    return { valid: false, error: 'Remesa pre-banc no trobada' };
  }

  const prebankRemittance = {
    id: prebankSnap.id,
    ...prebankSnap.data(),
  } as PrebankRemittance;

  // 2. Comprovar idempotència: si ja està reconciliada, retornar
  if (prebankRemittance.linkedRemittanceId) {
    return {
      valid: false,
      error: `Remesa ja reconciliada (ID: ${prebankRemittance.linkedRemittanceId})`
    };
  }

  // 3. Carregar transacció pare
  const parentTxRef = doc(
    firestore,
    'organizations', orgId,
    'transactions', parentTransactionId
  );
  const parentTxSnap = await getDoc(parentTxRef);

  if (!parentTxSnap.exists()) {
    return { valid: false, error: 'Transacció pare no trobada' };
  }

  const parentTransaction = {
    id: parentTxSnap.id,
    ...parentTxSnap.data(),
  } as Transaction;

  // 4. Carregar tots els documents pendents de la remesa
  const pendingDocs: PendingDocument[] = [];

  for (const docId of prebankRemittance.pendingDocumentIds) {
    const docRef = pendingDocumentDoc(firestore, orgId, docId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return { valid: false, error: `Document pendent no trobat: ${docId}` };
    }

    const docData = docSnap.data();
    const pendingDoc = {
      ...docData,
      id: docSnap.id,
    } as PendingDocument;

    // Validar estat
    if (pendingDoc.status !== 'sepa_generated') {
      return {
        valid: false,
        error: `Document ${pendingDoc.invoiceNumber || pendingDoc.id} no està en estat sepa_generated`
      };
    }

    // Validar que té endToEndId
    if (!pendingDoc.sepa?.endToEndId) {
      return {
        valid: false,
        error: `Document ${pendingDoc.invoiceNumber || pendingDoc.id} no té endToEndId`
      };
    }

    pendingDocs.push(pendingDoc);
  }

  // 5. Calcular total dels documents
  const totalDocsAmount = pendingDocs.reduce((sum, d) => sum + (d.amount || 0), 0);
  const parentAmount = Math.abs(parentTransaction.amount);
  const difference = Math.abs(totalDocsAmount - parentAmount);

  // Tolerància de 0.02€
  if (difference > 0.02) {
    return {
      valid: false,
      error: `Import no coincideix: documents ${totalDocsAmount.toFixed(2)}€ vs transacció ${parentAmount.toFixed(2)}€ (diferència: ${difference.toFixed(2)}€)`
    };
  }

  return {
    valid: true,
    prebankRemittance,
    parentTransaction,
    pendingDocs,
    totalDocsAmount,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Reconcilia una remesa SEPA pre-banc amb un moviment agregat.
 *
 * Operacions atòmiques (per batxos):
 * 1. Crea document de remesa (post-banc)
 * 2. Crea transaccions fill
 * 3. Actualitza pendingDocuments a 'matched'
 * 4. Actualitza prebankRemittance amb linkedRemittanceId
 * 5. Marca la transacció pare com a remesa
 */
export async function reconcileSepaRemittanceToAggregatedTransaction(
  firestore: Firestore,
  input: ReconcileSepaRemittanceInput
): Promise<ReconcileSepaRemittanceResult> {
  const { orgId, prebankRemittanceId, parentTransactionId } = input;

  // Validar
  const validation = await validateReconciliation(firestore, input);

  if (!validation.valid) {
    return {
      success: false,
      remittanceId: '',
      childTransactionIds: [],
      matchedDocCount: 0,
      error: validation.error,
    };
  }

  const { parentTransaction, pendingDocs } = validation;

  // Col·leccions
  const transactionsRef = collection(firestore, 'organizations', orgId, 'transactions');
  const remittancesRef = collection(firestore, 'organizations', orgId, 'remittances');

  // Crear ID de remesa post-banc
  const remittanceRef = doc(remittancesRef);
  const remittanceId = remittanceRef.id;
  const now = new Date().toISOString();

  // Preparar dades per als fills
  const childrenData: ChildTransactionData[] = pendingDocs!.map(pendingDoc => ({
    pendingDoc,
    amount: -(pendingDoc.amount || 0), // Negatiu (pagament)
    description: pendingDoc.invoiceNumber
      ? `Factura ${pendingDoc.invoiceNumber}`
      : pendingDoc.file.filename,
    contactId: pendingDoc.supplierId,
    categoryId: pendingDoc.categoryId,
    documentPath: pendingDoc.file?.storagePath || null,
    endToEndId: pendingDoc.sepa!.endToEndId,
  }));

  // Firestore writeBatch: límit dur de 500, però invariants de plataforma <= 50
  const BATCH_SIZE = 50;
  const childTransactionIds: string[] = [];

  // Primer batch: crear transaccions fill
  for (let i = 0; i < childrenData.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const chunk = childrenData.slice(i, i + BATCH_SIZE);

    for (const child of chunk) {
      const newTxRef = doc(transactionsRef);
      childTransactionIds.push(newTxRef.id);

      const newTxData: Partial<Transaction> & { id: string } = {
        id: newTxRef.id,
        date: parentTransaction!.date,
        description: child.description,
        amount: child.amount,
        category: child.categoryId || null,
        document: child.documentPath,
        contactId: child.contactId,
        projectId: parentTransaction!.projectId ?? null,
        source: 'remittance',
        parentTransactionId: parentTransactionId,
        bankAccountId: parentTransaction!.bankAccountId ?? null,
        isRemittanceItem: true,
        remittanceId: remittanceId,
      };

      if (child.contactId) {
        newTxData.contactType = 'supplier';
      }

      batch.set(newTxRef, newTxData);
    }

    await batch.commit();
  }

  // Segon batch: actualitzar pendingDocuments
  for (let i = 0; i < pendingDocs!.length; i += BATCH_SIZE) {
    const batch = writeBatch(firestore);
    const chunk = pendingDocs!.slice(i, i + BATCH_SIZE);

    for (let j = 0; j < chunk.length; j++) {
      const pendingDoc = chunk[j];
      const childTxId = childTransactionIds[i + j];
      const docRef = pendingDocumentDoc(firestore, orgId, pendingDoc.id);

      batch.update(docRef, {
        status: 'matched',
        matchedTransactionId: childTxId,
        suggestedTransactionIds: [],
        ignoredTransactionIds: [],
      });
    }

    await batch.commit();
  }

  // Tercer batch: crear remesa post-banc + actualitzar prebank + marcar pare
  const finalBatch = writeBatch(firestore);

  // Document de remesa post-banc
  const remittanceData = {
    direction: 'out',
    type: 'payments',
    parentTransactionId: parentTransactionId,
    transactionIds: childTransactionIds,
    totalAmount: Math.abs(validation.totalDocsAmount!),
    itemCount: pendingDocs!.length,
    createdAt: now,
    createdBy: null, // Seria user.uid en un context real
    bankAccountId: parentTransaction!.bankAccountId ?? null,
    validation: {
      deltaCents: Math.round((validation.totalDocsAmount! - Math.abs(parentTransaction!.amount)) * 100),
      parentAmount: Math.abs(parentTransaction!.amount),
      totalItems: validation.totalDocsAmount!,
      validatedAt: now,
      validatedByUid: null,
    },
    // Referència a la remesa pre-banc
    prebankRemittanceId: prebankRemittanceId,
  };

  finalBatch.set(remittanceRef, remittanceData);

  // Actualitzar prebankRemittance
  const prebankRef = prebankRemittanceDoc(firestore, orgId, prebankRemittanceId);
  finalBatch.update(prebankRef, {
    status: 'reconciled',
    linkedRemittanceId: remittanceId,
    linkedAt: serverTimestamp(),
  });

  // Marcar transacció pare
  const parentTxRef = doc(firestore, 'organizations', orgId, 'transactions', parentTransactionId);
  finalBatch.update(parentTxRef, {
    isRemittance: true,
    remittanceId: remittanceId,
    remittanceType: 'payments',
    remittanceDirection: 'OUT',
    remittanceStatus: 'complete',
    remittanceItemCount: pendingDocs!.length,
    remittanceTotalAmount: validation.totalDocsAmount!,
  });

  await finalBatch.commit();

  return {
    success: true,
    remittanceId,
    childTransactionIds,
    matchedDocCount: pendingDocs!.length,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER: Comprovar si una transacció té remesa SEPA detectada
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Busca si existeix una remesa pre-banc que coincideixi amb una transacció.
 * Útil per mostrar el badge "Remesa SEPA detectada" a la UI.
 */
export async function findMatchingPrebankRemittance(
  firestore: Firestore,
  orgId: string,
  transaction: Transaction
): Promise<PrebankRemittance | null> {
  // Només transaccions negatives (pagaments)
  if (transaction.amount >= 0) return null;

  // Ja és una remesa?
  if (transaction.isRemittance || transaction.isRemittanceItem) return null;

  // Buscar per parentTransactionId
  const { query, where, getDocs } = await import('firebase/firestore');
  const { prebankRemittancesCollection } = await import('./sepa-remittance');

  const q = query(
    prebankRemittancesCollection(firestore, orgId),
    where('parentTransactionId', '==', transaction.id),
    where('status', 'in', ['matched_to_bank', 'prebank_generated'])
  );

  const snap = await getDocs(q);

  if (snap.empty) return null;

  const remittanceDoc = snap.docs[0];
  return {
    id: remittanceDoc.id,
    ...remittanceDoc.data(),
  } as PrebankRemittance;
}
