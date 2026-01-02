// src/lib/expense-reports/refs.ts
// Referències Firestore per a liquidacions

import { collection, doc, type Firestore, type CollectionReference, type DocumentReference, type DocumentData } from 'firebase/firestore';
import type { ExpenseReport } from './types';

export function expenseReportsRef(
  firestore: Firestore,
  orgId: string
): CollectionReference<ExpenseReport> {
  return collection(firestore, 'organizations', orgId, 'expenseReports') as CollectionReference<ExpenseReport>;
}

/**
 * Referència sense tipus genèric per a addDoc (evita problemes amb WithFieldValue)
 */
export function expenseReportsRefUntyped(
  firestore: Firestore,
  orgId: string
): CollectionReference<DocumentData> {
  return collection(firestore, 'organizations', orgId, 'expenseReports');
}

export function expenseReportRef(
  firestore: Firestore,
  orgId: string,
  reportId: string
): DocumentReference<ExpenseReport> {
  return doc(firestore, 'organizations', orgId, 'expenseReports', reportId) as DocumentReference<ExpenseReport>;
}
