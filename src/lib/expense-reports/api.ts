// src/lib/expense-reports/api.ts
// API per a liquidacions de despeses

import {
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  getDoc,
  writeBatch,
  serverTimestamp,
  type Firestore,
  type Unsubscribe,
  type FieldValue,
} from 'firebase/firestore';
import { expenseReportsRef, expenseReportsRefUntyped, expenseReportRef } from './refs';
import { pendingDocumentDoc } from '../pending-documents/refs';
import type {
  ExpenseReport,
  ExpenseReportStatus,
  CreateExpenseReportInput,
  UpdateExpenseReportInput,
} from './types';

// =============================================================================
// LISTENERS
// =============================================================================

export type ListenExpenseReportsOptions = {
  statusIn?: ExpenseReportStatus[];
};

export function listenExpenseReports(
  firestore: Firestore,
  orgId: string,
  options: ListenExpenseReportsOptions,
  callback: (reports: ExpenseReport[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const ref = expenseReportsRef(firestore, orgId);

  let q = query(ref, orderBy('createdAt', 'desc'));

  if (options.statusIn && options.statusIn.length > 0) {
    q = query(ref, where('status', 'in', options.statusIn), orderBy('createdAt', 'desc'));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      const reports = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));
      callback(reports);
    },
    (error) => {
      console.error('[listenExpenseReports] Error:', error);
      onError?.(error);
    }
  );
}

// =============================================================================
// MUTATIONS
// =============================================================================

// Tipus per crear document (timestamps com FieldValue)
type ExpenseReportCreate = Omit<ExpenseReport, 'id' | 'createdAt' | 'updatedAt' | 'submittedAt'> & {
  createdAt: FieldValue;
  updatedAt: FieldValue;
  submittedAt: null;
};

export async function createExpenseReportDraft(
  firestore: Firestore,
  orgId: string,
  input?: CreateExpenseReportInput
): Promise<string> {
  // Usar ref sense tipus per evitar WithFieldValue<ExpenseReport>
  const ref = expenseReportsRefUntyped(firestore, orgId);

  const now = serverTimestamp();

  const docData: ExpenseReportCreate = {
    status: 'draft',
    title: input?.title ?? null,
    dateFrom: input?.dateFrom ?? null,
    dateTo: input?.dateTo ?? null,
    location: input?.location ?? null,
    beneficiary: input?.beneficiary ?? null,
    receiptDocIds: [],
    mileage: null,
    mileageItems: null,
    totalAmount: 0,
    notes: input?.notes ?? null,
    matchedTransactionId: null,
    generatedPdf: null,
    sepa: null,
    payment: null,
    createdAt: now,
    updatedAt: now,
    submittedAt: null,
  };

  const docRef = await addDoc(ref, docData);

  return docRef.id;
}

export async function updateExpenseReport(
  firestore: Firestore,
  orgId: string,
  reportId: string,
  input: UpdateExpenseReportInput
): Promise<void> {
  const ref = expenseReportRef(firestore, orgId, reportId);

  await updateDoc(ref, {
    ...input,
    updatedAt: serverTimestamp(),
  });
}

export async function submitExpenseReport(
  firestore: Firestore,
  orgId: string,
  reportId: string
): Promise<void> {
  const ref = expenseReportRef(firestore, orgId, reportId);

  await updateDoc(ref, {
    status: 'submitted',
    submittedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function archiveExpenseReport(
  firestore: Firestore,
  orgId: string,
  reportId: string
): Promise<void> {
  const ref = expenseReportRef(firestore, orgId, reportId);

  await updateDoc(ref, {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
}

export async function restoreExpenseReport(
  firestore: Firestore,
  orgId: string,
  reportId: string,
  toStatus: 'draft' | 'submitted' = 'draft'
): Promise<void> {
  const ref = expenseReportRef(firestore, orgId, reportId);

  await updateDoc(ref, {
    status: toStatus,
    updatedAt: serverTimestamp(),
  });
}

export type DeleteExpenseReportResult = {
  releasedTicketCount: number;
};

/** Màxim d'operacions per batch (Firestore limit 500, usem 50 per seguretat) */
const BATCH_LIMIT = 50;

/**
 * Divideix un array en chunks de mida màxima.
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

/**
 * Esborra una liquidació i allibera els tiquets assignats (tornen a pendent).
 * Operació en batches de màxim 50 operacions.
 *
 * @throws Error si la liquidació està en estat 'matched' (conciliada)
 */
export async function deleteExpenseReport(
  firestore: Firestore,
  orgId: string,
  reportId: string
): Promise<DeleteExpenseReportResult> {
  const ref = expenseReportRef(firestore, orgId, reportId);

  // 1. Llegir la liquidació per obtenir status i receiptDocIds
  const reportSnap = await getDoc(ref);
  if (!reportSnap.exists()) {
    // Ja no existeix, res a fer
    return { releasedTicketCount: 0 };
  }

  const report = reportSnap.data();

  // 2. Guardrail: bloquejar si està conciliada
  if (report.status === 'matched') {
    throw new Error('Una liquidació conciliada no es pot esborrar.');
  }

  const receiptDocIds = report.receiptDocIds ?? [];

  // 3. Batches amb chunking (màx 50 operacions per batch)
  // Reservem 1 operació per l'últim batch pel delete del report
  const chunks = chunk(receiptDocIds, BATCH_LIMIT - 1);

  if (chunks.length === 0) {
    // No hi ha tiquets, només esborrar la liquidació
    const batch = writeBatch(firestore);
    batch.delete(ref);
    await batch.commit();
    return { releasedTicketCount: 0 };
  }

  // Processar tots els chunks
  for (let i = 0; i < chunks.length; i++) {
    const ticketChunk = chunks[i];
    const isLastChunk = i === chunks.length - 1;
    const batch = writeBatch(firestore);

    // Alliberar tiquets d'aquest chunk
    for (const docId of ticketChunk) {
      const ticketRef = pendingDocumentDoc(firestore, orgId, docId);
      batch.update(ticketRef, {
        reportId: null,
        updatedAt: serverTimestamp(),
      });
    }

    // Només l'últim batch esborra la liquidació
    if (isLastChunk) {
      batch.delete(ref);
    }

    await batch.commit();
  }

  return { releasedTicketCount: receiptDocIds.length };
}
