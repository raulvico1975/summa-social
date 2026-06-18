import type {
  DocumentIncident,
  DocumentIncidentCode,
  DocumentReviewDocument,
  DocumentReviewRow,
} from './types';

const DOCUMENT_REVIEW_INCIDENT_CSV_HEADERS = [
  'order',
  'source',
  'txId',
  'dateExpense',
  'paymentDate',
  'budgetLine',
  'counterpartyName',
  'concept',
  'amountAssignedEUR',
  'documentCount',
  'reviewStatus',
  'incidentCodes',
  'primaryIncident',
  'recommendedAction',
  'documents',
] as const;

type DocumentReviewIncidentCsvHeader = typeof DOCUMENT_REVIEW_INCIDENT_CSV_HEADERS[number];
type DocumentReviewIncidentCsvValue = string | number | null;
type DocumentReviewIncidentCsvRecord = Record<DocumentReviewIncidentCsvHeader, DocumentReviewIncidentCsvValue>;

const RECOMMENDED_ACTION_BY_INCIDENT_CODE: Record<DocumentIncidentCode, string> = {
  missing_document: 'Add required documents',
  missing_invoice: 'Add invoice or valid primary support',
  missing_payment_proof: 'Add proof of payment',
  missing_payroll_support: 'Add payroll support documents',
  unknown_doc_type: 'Review document type',
  low_confidence: 'Review detected document data',
  amount_mismatch: 'Check amount against expense record',
  date_mismatch: 'Check document date against project period',
  supplier_mismatch: 'Check supplier against expense record',
  duplicate_suspected: 'Check possible duplicate document',
  fetch_error: 'Retry document read',
  needs_manual_review: 'Review manually',
};

function sortByReviewOrder(rows: DocumentReviewRow[]): DocumentReviewRow[] {
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const byOrder = left.row.order - right.row.order;
      return byOrder !== 0 ? byOrder : left.index - right.index;
    })
    .map(({ row }) => row);
}

function escapeCsvValue(value: DocumentReviewIncidentCsvValue): string {
  const text = value == null ? '' : String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function formatBudgetLine(row: Pick<DocumentReviewRow, 'budgetLineCode' | 'budgetLineName'>): string {
  if (row.budgetLineCode && row.budgetLineName) return `${row.budgetLineCode} - ${row.budgetLineName}`;
  return row.budgetLineCode || row.budgetLineName;
}

function formatDocuments(documents: DocumentReviewDocument[]): string {
  return documents
    .map((document) => `${document.documentName} [${document.detectedType}]`)
    .join(' | ');
}

function resolvePrimaryIncident(incidents: DocumentIncident[]): DocumentIncident | null {
  return incidents[0] ?? null;
}

function toCsvRecord(row: DocumentReviewRow): DocumentReviewIncidentCsvRecord {
  const primaryIncident = resolvePrimaryIncident(row.incidents);

  return {
    order: row.order,
    source: row.source,
    txId: row.txId,
    dateExpense: row.dateExpense,
    paymentDate: row.paymentDate,
    budgetLine: formatBudgetLine(row),
    counterpartyName: row.counterpartyName,
    concept: row.concept,
    amountAssignedEUR: row.amountAssignedEUR,
    documentCount: row.documents.length,
    reviewStatus: row.status,
    incidentCodes: row.incidents.map((incident) => incident.code).join('|'),
    primaryIncident: primaryIncident?.code ?? '',
    recommendedAction: primaryIncident
      ? RECOMMENDED_ACTION_BY_INCIDENT_CODE[primaryIncident.code]
      : 'No action',
    documents: formatDocuments(row.documents),
  };
}

export function buildDocumentReviewIncidentsCsv(rows: DocumentReviewRow[]): string {
  const headerLine = DOCUMENT_REVIEW_INCIDENT_CSV_HEADERS.join(',');
  const dataLines = sortByReviewOrder(rows).map((row) => {
    const record = toCsvRecord(row);
    return DOCUMENT_REVIEW_INCIDENT_CSV_HEADERS
      .map((header) => escapeCsvValue(record[header]))
      .join(',');
  });

  return [headerLine, ...dataLines].join('\n');
}

