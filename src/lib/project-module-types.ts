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

  // Tipus de canvi per despeses offBank (moneda local → EUR)
  // fxRate = quantes unitats de moneda local equivalen a 1 EUR
  fxRate?: number | null;
  fxCurrency?: string | null; // ex: "XOF", "VES", "DOP"

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

// Dades de justificació opcionals (per bank expenses)
export interface ExpenseJustification {
  invoiceNumber?: string | null;
  issuerTaxId?: string | null;
  invoiceDate?: string | null; // YYYY-MM-DD
  paymentDate?: string | null; // YYYY-MM-DD
  supportDocNumber?: string | null;
}

export interface ExpenseLink {
  id: string; // = txId
  orgId: string;

  assignments: ExpenseAssignment[];
  projectIds: string[]; // per queries ràpides (array-contains)

  note: string | null;

  // Dades de justificació per despeses bank (opcional)
  justification?: ExpenseJustification | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ═══════════════════════════════════════════════════════════════════════════
// DESPESES OFF-BANK (terreny)
// Path: /organizations/{orgId}/projectModule/_/offBankExpenses/{expenseId}
// ═══════════════════════════════════════════════════════════════════════════

/** Attachment dins d'una despesa off-bank */
export interface OffBankAttachment {
  url: string;
  name: string;
  contentType: string;
  size: number;
  uploadedAt: string; // YYYY-MM-DD
}

export interface OffBankExpense {
  id: string;
  orgId: string;
  source: 'offBank';

  date: string; // YYYY-MM-DD
  concept: string;
  amountEUR: number | null; // positiu (despesa) - pot ser null si falta fxRate

  // Moneda original i conversió (opcional)
  originalCurrency?: string | null; // ex: "XOF", "USD" (null = EUR)
  originalAmount?: number | null; // import en moneda local
  fxRate?: number | null; // tipus de canvi (1 moneda → EUR)
  fxDate?: string | null; // data del tipus de canvi (opcional)

  // DEPRECATED: usar originalCurrency, originalAmount, fxRate
  currency?: string | null;
  amountOriginal?: number | null;
  fxRateUsed?: number | null;

  counterpartyName: string | null;
  categoryName: string | null; // text lliure
  documentUrl: string | null; // DEPRECATED: usar attachments[]

  // Múltiples comprovants (nou)
  attachments?: OffBankAttachment[] | null;

  // Estat de revisió (nou)
  needsReview?: boolean | null; // true si ve de terreny i cal revisar a oficina

  // Dades de justificació (opcional)
  invoiceNumber?: string | null;
  issuerTaxId?: string | null;
  invoiceDate?: string | null; // YYYY-MM-DD
  paymentDate?: string | null; // YYYY-MM-DD
  supportDocNumber?: string | null;

  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface OffBankExpenseFormData {
  date: string;
  concept: string;
  amountEUR?: string | null; // pot ser null si moneda local sense fxRate
  counterpartyName: string;
  categoryName: string;
  // Moneda local
  originalCurrency?: string | null;
  originalAmount?: string | null;
  fxRate?: string | null;
  // DEPRECATED
  currency?: string;
  amountOriginal?: string;
  fxRateOverride?: string;
  // Justificació
  invoiceNumber?: string;
  issuerTaxId?: string;
  invoiceDate?: string;
  paymentDate?: string;
  supportDocNumber?: string;
  // Attachments
  attachments?: OffBankAttachment[];
  // Revisió
  needsReview?: boolean;
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
  amountEUR: number; // per UI, si és null intern usem 0
  categoryName: string | null;
  counterpartyName: string | null;
  documentUrl: string | null;
  // Camps moneda estrangera (off-bank)
  originalCurrency?: string | null;
  originalAmount?: number | null;
  fxRate?: number | null;
  // Flag per indicar si amountEUR és real o pendent de conversió
  pendingConversion?: boolean;
  // DEPRECATED: usar originalCurrency, originalAmount, fxRate
  currency?: string | null;
  amountOriginal?: number | null;
  fxRateUsed?: number | null;
  // Camps justificació (per offBank)
  invoiceNumber?: string | null;
  issuerTaxId?: string | null;
  invoiceDate?: string | null;
  paymentDate?: string | null;
  supportDocNumber?: string | null;
  // Nous camps
  attachments?: OffBankAttachment[] | null;
  needsReview?: boolean | null;
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
