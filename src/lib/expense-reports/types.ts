// src/lib/expense-reports/types.ts
// Model de dades per a liquidacions de despeses (pre-banc)

import type { Timestamp } from 'firebase/firestore';

export type ExpenseReportStatus = 'draft' | 'submitted' | 'matched' | 'archived';

export type ExpenseReportBeneficiary =
  | { kind: 'employee'; employeeId: string }
  | { kind: 'contact'; contactId: string }
  | { kind: 'manual'; name: string; iban: string };

export type ExpenseReportMileage = {
  km: number | null;
  rateEurPerKm: number | null;
  amount: number | null; // km * rate, calculat
  description: string | null; // ruta, opcional
  categoryId: string | null; // preomplir "Vehicle propi"
};

export type ExpenseReportGeneratedPdf = {
  storagePath: string; // organizations/{orgId}/expenseReports/{reportId}/liquidacio.pdf
  filename: string; // liquidacio_{reportId}.pdf
  createdAt: Timestamp;
};

export type ExpenseReportSepa = {
  remittanceId: string; // ID de la prebankRemittance
  endToEndId: string; // Identificador únic per conciliar
};

export type ExpenseReportPayment = {
  method: 'sepa';
  debtorBankAccountId: string; // Compte emissor
  executionDate: string; // YYYY-MM-DD
};

export type ExpenseReport = {
  id: string;
  status: ExpenseReportStatus;

  title: string | null; // motiu/viatge
  dateFrom: string | null; // YYYY-MM-DD
  dateTo: string | null; // YYYY-MM-DD
  location: string | null; // opcional

  beneficiary: ExpenseReportBeneficiary | null;

  receiptDocIds: string[]; // pendingDocuments ids (type receipt)
  mileage: ExpenseReportMileage | null;

  totalAmount: number; // calculat (receipts + mileage)
  notes: string | null;

  matchedTransactionId: string | null;

  generatedPdf: ExpenseReportGeneratedPdf | null; // PDF generat
  sepa: ExpenseReportSepa | null; // Info SEPA quan es genera remesa
  payment: ExpenseReportPayment | null; // Info pagament (SEPA o futur)

  createdAt: Timestamp;
  updatedAt: Timestamp;
  submittedAt: Timestamp | null;
};

// Input per crear/actualitzar
export type CreateExpenseReportInput = {
  title?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  location?: string | null;
  beneficiary?: ExpenseReportBeneficiary | null;
  notes?: string | null;
};

export type UpdateExpenseReportInput = {
  title?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  location?: string | null;
  beneficiary?: ExpenseReportBeneficiary | null;
  receiptDocIds?: string[];
  mileage?: ExpenseReportMileage | null;
  totalAmount?: number;
  notes?: string | null;
  status?: ExpenseReportStatus;
  submittedAt?: Timestamp | null;
  matchedTransactionId?: string | null;
  generatedPdf?: ExpenseReportGeneratedPdf | null;
  sepa?: ExpenseReportSepa | null;
  payment?: ExpenseReportPayment | null;
};
