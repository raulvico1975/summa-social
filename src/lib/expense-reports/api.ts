// src/lib/expense-reports/api.ts
// API per a liquidacions de despeses

import {
  onSnapshot,
  query,
  where,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  type Firestore,
  type Unsubscribe,
  type FieldValue,
} from 'firebase/firestore';
import { expenseReportsRef, expenseReportsRefUntyped, expenseReportRef } from './refs';
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
