// src/lib/project-module-types.ts
// Tipus per al mòdul de Projectes (B1)

import type { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════════════════
// FEED D'EXPORTS (read-only des del mòdul)
// Path: /organizations/{orgId}/exports/projectExpenses/items/{txId}
// ═══════════════════════════════════════════════════════════════════════════

export interface ProjectExpenseExport {
  id: string;
  orgId: string;
  schemaVersion: 1;

  source: 'summa';
  sourceUpdatedAt: Timestamp | null;

  date: string; // YYYY-MM-DD
  amountEUR: number; // negatiu = despesa
  currency: 'EUR';

  categoryId: string | null;
  categoryName: string | null;

  counterpartyId: string | null;
  counterpartyName: string | null;
  counterpartyType: 'donor' | 'supplier' | 'employee' | null;

  internalTagId: string | null;
  internalTagName: string | null;

  description: string | null;

  documents: Array<{
    source: 'summa';
    storagePath: string | null;
    fileUrl: string | null;
    name: string | null;
  }>;

  isEligibleForProjects: boolean;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt: Timestamp | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROJECTES DEL MÒDUL
// Path: /organizations/{orgId}/projectModule/_/projects/{projectId}
// ═══════════════════════════════════════════════════════════════════════════

export interface Project {
  id: string;
  orgId: string;

  name: string;
  code: string | null;
  status: 'active' | 'closed';

  budgetEUR: number | null;
  startDate: string | null; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD

  allowedDeviationPct: number; // default 10

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ProjectFormData {
  name: string;
  code: string;
  status: 'active' | 'closed';
  budgetEUR: string;
  startDate: string;
  endDate: string;
  allowedDeviationPct: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARTIDES DE PRESSUPOST
// Path: /organizations/{orgId}/projectModule/_/projects/{projectId}/budgetLines/{lineId}
// ═══════════════════════════════════════════════════════════════════════════

export interface BudgetLine {
  id: string;
  name: string;
  code: string | null;
  budgetedAmountEUR: number;
  order: number | null;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BudgetLineFormData {
  name: string;
  code: string;
  budgetedAmountEUR: string;
  order: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNACIONS DE DESPESES A PROJECTES
// Path: /organizations/{orgId}/projectModule/_/expenseLinks/{txId}
// ═══════════════════════════════════════════════════════════════════════════

export interface ExpenseAssignment {
  projectId: string;
  projectName: string; // denormalitzat
  amountEUR: number; // part assignada (amb signe -)
  budgetLineId?: string | null; // opcional
  budgetLineName?: string | null; // denormalitzat, opcional
}

export interface ExpenseLink {
  id: string; // = txId
  orgId: string;

  assignments: ExpenseAssignment[];
  projectIds: string[]; // per queries ràpides (array-contains)

  note: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════
// DESPESES OFF-BANK (terreny)
// Path: /organizations/{orgId}/projectModule/_/offBankExpenses/{expenseId}
// ═══════════════════════════════════════════════════════════════════════════

export interface OffBankExpense {
  id: string;
  orgId: string;
  source: 'offBank';

  date: string; // YYYY-MM-DD
  concept: string;
  amountEUR: number; // positiu (despesa)

  counterpartyName: string | null;
  categoryName: string | null; // text lliure
  documentUrl: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OffBankExpenseFormData {
  date: string;
  concept: string;
  amountEUR: string;
  counterpartyName: string;
  categoryName: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS COMBINATS PER A LA UI
// ═══════════════════════════════════════════════════════════════════════════

export type ExpenseSource = 'bank' | 'offBank';
export type ExpenseStatus = 'unassigned' | 'assigned' | 'partial';

// Tipus unificat per a la UI (bank o off-bank)
export interface UnifiedExpense {
  txId: string; // bank: transactionId, offBank: "off_" + expenseId
  source: ExpenseSource;
  date: string;
  description: string | null;
  amountEUR: number; // sempre negatiu per consistència
  categoryName: string | null;
  counterpartyName: string | null;
  documentUrl: string | null;
}

export interface ExpenseWithLink {
  expense: ProjectExpenseExport;
  link: ExpenseLink | null;
  status: ExpenseStatus;
  assignedAmount: number; // suma de tots els assignments
  remainingAmount: number; // diferència respecte amountEUR
}

export interface UnifiedExpenseWithLink {
  expense: UnifiedExpense;
  link: ExpenseLink | null;
  status: ExpenseStatus;
  assignedAmount: number;
  remainingAmount: number;
}
