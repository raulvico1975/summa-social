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
}

// ═══════════════════════════════════════════════════════════════════════════
// ASSIGNACIONS DE DESPESES A PROJECTES
// Path: /organizations/{orgId}/projectModule/_/expenseLinks/{txId}
// ═══════════════════════════════════════════════════════════════════════════

export interface ExpenseAssignment {
  projectId: string;
  projectName: string; // denormalitzat
  amountEUR: number; // part assignada (amb signe -)
}

export interface ExpenseLink {
  id: string; // = txId
  orgId: string;

  assignments: ExpenseAssignment[];

  note: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS COMBINATS PER A LA UI
// ═══════════════════════════════════════════════════════════════════════════

export type ExpenseStatus = 'unassigned' | 'assigned' | 'partial';

export interface ExpenseWithLink {
  expense: ProjectExpenseExport;
  link: ExpenseLink | null;
  status: ExpenseStatus;
  assignedAmount: number; // suma de tots els assignments
  remainingAmount: number; // diferència respecte amountEUR
}
