/**
 * Tipus per al Paquet de Tancament (Closing Bundle)
 */

export interface ClosingBundleRequest {
  orgId: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;   // YYYY-MM-DD
}

export type IncidentType =
  | 'FALTA_DOCUMENT'
  | 'SENSE_CATEGORIA'
  | 'SENSE_CONTACTE'
  | 'DEVOLUCIO_PENDENT'
  | 'REMESA_PARCIAL'
  | 'DOC_DESCARREGA_FALLIDA';

export type IncidentSeverity = 'alta' | 'mitjana' | 'baixa';

export type DocumentStatus = 'OK' | 'FALTA' | 'FALLA_DESCARREGA';

export interface ClosingTransaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  category: string | null;
  categoryName: string | null;
  contactId: string | null;
  contactName: string | null;
  document: string | null; // URL de Firebase Storage
  transactionType: string | null;
  isRemittance: boolean;
  remittanceStatus: string | null;
}

export interface ClosingManifestRow {
  ordre: number;
  data: string;
  import: number;
  moneda: string;
  concepte: string;
  categoria: string;
  contacte: string;
  txId: string;
  document: string; // Nom del PDF dins el ZIP o "—"
  estat: DocumentStatus;
}

export interface ClosingIncident {
  txId: string;
  type: IncidentType;
  severity: IncidentSeverity;
  message: string;
}

export interface ClosingDocumentInfo {
  txId: string;
  ordre: number;
  storagePath: string;
  fileName: string;
  contentType: string | null;
  size: number | null;
}

export interface ClosingBundleStats {
  totalTransactions: number;
  totalWithDocument: number;
  totalDownloaded: number;
  totalFailed: number;
  totalIncidents: number;
  totalIncome: number;
  totalExpense: number;
}

export interface ClosingBundleError {
  code: 'UNAUTHENTICATED' | 'UNAUTHORIZED' | 'INVALID_REQUEST' | 'LIMIT_EXCEEDED' | 'NO_TRANSACTIONS' | 'INTERNAL_ERROR';
  message: string;
}

export const MAX_DOCUMENTS = 120;
export const MAX_TOTAL_SIZE_MB = 350;
