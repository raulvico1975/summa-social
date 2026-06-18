import type {
  DocumentIncident,
  DocumentReviewDocType,
  DocumentReviewDocument,
  DocumentReviewPolicy,
  DocumentReviewRow,
} from './types';

export const DEFAULT_DOCUMENT_REVIEW_POLICY: DocumentReviewPolicy = {
  bankTransactionCountsAsPaymentProof: true,
  amountToleranceEUR: 0.02,
  lowConfidenceThreshold: 0.6,
};

const PRIMARY_SUPPORT_TYPES = new Set<DocumentReviewDocType>([
  'invoice',
  'receipt',
  'ticket',
  'local_support',
]);

const PAYMENT_PROOF_TYPES = new Set<DocumentReviewDocType>([
  'payment_proof',
  'bank_statement',
  'social_security_payment',
  'tax_model_111_payment',
]);

function incident(
  code: DocumentIncident['code'],
  severity: DocumentIncident['severity'],
  documentId: string | null = null,
  details: DocumentIncident['details'] = {}
): DocumentIncident {
  return {
    code,
    severity,
    messageKey: `projectModule.documentReview.incidents.${code}`,
    documentId,
    details,
  };
}

function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasTokenLike(haystack: string, needle: string): boolean {
  const normalizedHaystack = normalizeText(haystack);
  const normalizedNeedle = normalizeText(needle);
  if (!normalizedHaystack || !normalizedNeedle) return false;
  return normalizedHaystack.includes(normalizedNeedle) || normalizedNeedle.includes(normalizedHaystack);
}

function isDateOutsidePeriod(date: string, startDate: string | null, endDate: string | null): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  if (startDate && date < startDate) return true;
  if (endDate && date > endDate) return true;
  return false;
}

function referenceAmount(row: Pick<DocumentReviewRow, 'amountTotalEUR' | 'amountAssignedEUR'>): number | null {
  if (row.amountTotalEUR != null) return Math.abs(row.amountTotalEUR);
  if (row.amountAssignedEUR != null) return Math.abs(row.amountAssignedEUR);
  return null;
}

export function classifyDocumentByName(name: string): DocumentReviewDocType {
  const normalized = normalizeText(name);

  if (/\brlc\b/.test(normalized)) return 'social_security_rlc';
  if (/\brnt\b/.test(normalized)) return 'social_security_rnt';
  if (normalized.includes('111') && /(pagament|pagamento|pago|payment|justificant|comprovant)/.test(normalized)) {
    return 'tax_model_111_payment';
  }
  if (normalized.includes('111')) return 'tax_model_111';
  if (/(seguretat social|seguridad social|social security)/.test(normalized) && /(pagament|pago|payment|justificant|comprovant)/.test(normalized)) {
    return 'social_security_payment';
  }
  if (/(nomina|payroll|salari|salario)/.test(normalized)) return 'payroll';
  if (/(factura|invoice|bill)/.test(normalized)) return 'invoice';
  if (/(comprovant|justificant|transferencia|transfer|pagament|pago|payment|paid)/.test(normalized)) {
    return 'payment_proof';
  }
  if (/(extracte|extracto|statement|bank|banc|banco)/.test(normalized)) return 'bank_statement';
  if (/(ticket|tiquet)/.test(normalized)) return 'ticket';
  if (/(rebut|recibo|receipt)/.test(normalized)) return 'receipt';
  if (/(suport|soporte|support|local|acta|declaracio|declaracion|certificate)/.test(normalized)) {
    return 'local_support';
  }

  return 'unknown';
}

export function resolveDocumentReviewStatus(incidents: DocumentIncident[]): DocumentReviewRow['status'] {
  if (incidents.some((item) => item.code === 'amount_mismatch' || item.code === 'date_mismatch' || item.code === 'supplier_mismatch')) {
    return 'inconsistent';
  }
  if (incidents.some((item) => item.code.startsWith('missing_'))) {
    return 'missing';
  }
  if (incidents.some((item) => item.severity === 'warning')) {
    return 'needs_review';
  }
  return 'complete';
}

export function buildDocumentReviewIncidents(params: {
  row: Pick<DocumentReviewRow, 'source' | 'amountTotalEUR' | 'amountAssignedEUR' | 'counterpartyName'>;
  documents: DocumentReviewDocument[];
  projectStartDate?: string | null;
  projectEndDate?: string | null;
  duplicateKeys: Set<string>;
  policy?: Partial<DocumentReviewPolicy>;
}): DocumentIncident[] {
  const policy = { ...DEFAULT_DOCUMENT_REVIEW_POLICY, ...params.policy };
  const incidents: DocumentIncident[] = [];

  if (params.documents.length === 0) {
    incidents.push(incident('missing_document', 'error'));
    return incidents;
  }

  const types = new Set(params.documents.map((document) => document.detectedType));
  const hasPrimarySupport = params.documents.some((document) => PRIMARY_SUPPORT_TYPES.has(document.detectedType));
  const hasPayroll = types.has('payroll');
  const hasPaymentProof =
    params.documents.some((document) => PAYMENT_PROOF_TYPES.has(document.detectedType))
    || (params.row.source === 'bank' && policy.bankTransactionCountsAsPaymentProof);

  for (const document of params.documents) {
    if (document.detectedType === 'unknown') {
      incidents.push(incident('unknown_doc_type', 'warning', document.id));
    }
    if (document.confidence != null && document.confidence < policy.lowConfidenceThreshold) {
      incidents.push(incident('low_confidence', 'warning', document.id, { confidence: document.confidence }));
    }
    if (document.errors.length > 0) {
      incidents.push(incident('fetch_error', 'warning', document.id, { errorCount: document.errors.length }));
    }
    if (params.duplicateKeys.has(document.duplicateKey)) {
      incidents.push(incident('duplicate_suspected', 'warning', document.id));
    }
  }

  if (!hasPrimarySupport && !hasPayroll) {
    incidents.push(incident('missing_invoice', 'error'));
  }

  if ((hasPrimarySupport || hasPayroll) && !hasPaymentProof) {
    incidents.push(incident('missing_payment_proof', 'error'));
  }

  if (hasPayroll) {
    if (!types.has('social_security_rlc')) {
      incidents.push(incident('missing_payroll_support', 'error', null, { missing: 'social_security_rlc' }));
    }
    if (!types.has('social_security_rnt')) {
      incidents.push(incident('missing_payroll_support', 'error', null, { missing: 'social_security_rnt' }));
    }
    if (!types.has('social_security_payment')) {
      incidents.push(incident('missing_payroll_support', 'error', null, { missing: 'social_security_payment' }));
    }
  }

  const amountToCompare = referenceAmount(params.row);
  if (amountToCompare != null) {
    for (const document of params.documents) {
      const detectedAmount = document.fields.amount.value;
      if (detectedAmount == null) continue;
      const delta = Math.abs(Math.abs(detectedAmount) - amountToCompare);
      if (delta > policy.amountToleranceEUR) {
        incidents.push(incident('amount_mismatch', 'warning', document.id, {
          expected: amountToCompare,
          detected: detectedAmount,
          delta: Number(delta.toFixed(2)),
        }));
      }
    }
  }

  for (const document of params.documents) {
    const detectedDate = document.fields.invoiceDate.value ?? document.fields.paymentDate.value;
    if (detectedDate && isDateOutsidePeriod(detectedDate, params.projectStartDate ?? null, params.projectEndDate ?? null)) {
      incidents.push(incident('date_mismatch', 'warning', document.id, { detectedDate }));
    }

    const supplierName = document.fields.supplierName.value;
    if (supplierName && params.row.counterpartyName && !hasTokenLike(supplierName, params.row.counterpartyName)) {
      incidents.push(incident('supplier_mismatch', 'warning', document.id, {
        expected: params.row.counterpartyName,
        detected: supplierName,
      }));
    }
  }

  return incidents;
}
