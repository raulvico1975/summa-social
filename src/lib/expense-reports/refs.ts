// src/lib/expense-reports/refs.ts
// Referències Firestore per a liquidacions

import { collection, doc, type Firestore, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import type { ExpenseReport } from './types';

export function expenseReportsRef(
  firestore: Firestore,
  orgId: string
): CollectionReference<ExpenseReport> {
  return collection(firestore, 'organizations', orgId, 'expenseReports') as CollectionReference<ExpenseReport>;
}

export function expenseReportRef(
  firestore: Firestore,
  orgId: string,
  reportId: string
): DocumentReference<ExpenseReport> {
  return doc(firestore, 'organizations', orgId, 'expenseReports', reportId) as DocumentReference<ExpenseReport>;
}
