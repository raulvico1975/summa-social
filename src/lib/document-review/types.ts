import type { JustificationRow } from '@/lib/project-justification-rows';

export type DocumentReviewDocType =
  | 'invoice'
  | 'payment_proof'
  | 'payroll'
  | 'social_security_rlc'
  | 'social_security_rnt'
  | 'social_security_payment'
  | 'tax_model_111'
  | 'tax_model_111_payment'
  | 'receipt'
  | 'ticket'
  | 'bank_statement'
  | 'local_support'
  | 'unknown';

export type DocumentReviewStatus =
  | 'complete'
  | 'missing'
  | 'inconsistent'
  | 'needs_review';

export type DocumentIncidentSeverity = 'error' | 'warning' | 'info';

export type DocumentIncidentCode =
  | 'missing_document'
  | 'missing_invoice'
  | 'missing_payment_proof'
  | 'missing_payroll_support'
  | 'unknown_doc_type'
  | 'low_confidence'
  | 'amount_mismatch'
  | 'date_mismatch'
  | 'supplier_mismatch'
  | 'duplicate_suspected'
  | 'fetch_error'
  | 'needs_manual_review';

export interface DocumentReviewField<T> {
  value: T | null;
  confidence: number | null;
  evidence: string | null;
}

export interface DocumentReviewFields {
  invoiceNumber: DocumentReviewField<string>;
  invoiceDate: DocumentReviewField<string>;
  paymentDate: DocumentReviewField<string>;
  amount: DocumentReviewField<number>;
  supplierName: DocumentReviewField<string>;
  supplierTaxId: DocumentReviewField<string>;
}

export interface DocumentReviewDetection {
  docType: DocumentReviewDocType;
  confidence: number | null;
  fields?: Partial<{
    invoiceNumber: DocumentReviewField<string>;
    invoiceDate: DocumentReviewField<string>;
    paymentDate: DocumentReviewField<string>;
    amount: DocumentReviewField<number>;
    supplierName: DocumentReviewField<string>;
    supplierTaxId: DocumentReviewField<string>;
  }>;
  provider?: string | null;
  model?: string | null;
  processedAt?: string | null;
  errors?: string[];
}

export interface DocumentReviewDocument {
  id: string;
  rowOrder: number;
  documentName: string;
  documentUrl: string | null;
  storagePath: string | null;
  contentType?: string | null;
  duplicateKey: string;
  detectedType: DocumentReviewDocType;
  confidence: number | null;
  fields: DocumentReviewFields;
  provider: string | null;
  model: string | null;
  processedAt: string | null;
  errors: string[];
}

export interface DocumentIncident {
  code: DocumentIncidentCode;
  severity: DocumentIncidentSeverity;
  messageKey: string;
  documentId: string | null;
  details: Record<string, string | number | boolean | null>;
}

export interface DocumentReviewPolicy {
  bankTransactionCountsAsPaymentProof: boolean;
  amountToleranceEUR: number;
  lowConfidenceThreshold: number;
}

export interface DocumentReviewRow {
  order: number;
  txId: string;
  source: JustificationRow['source'];
  dateExpense: string;
  paymentDate: string | null;
  counterpartyName: string;
  concept: string;
  budgetLineCode: string;
  budgetLineName: string;
  budgetLineId: string | null;
  amountTotalEUR: number | null;
  amountAssignedEUR: number | null;
  documents: DocumentReviewDocument[];
  incidents: DocumentIncident[];
  status: DocumentReviewStatus;
}

export interface NormalizeDocumentReviewRowsParams {
  rows: JustificationRow[];
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  detectionsByDocumentKey?: Record<string, DocumentReviewDetection>;
  policy?: Partial<DocumentReviewPolicy>;
}
