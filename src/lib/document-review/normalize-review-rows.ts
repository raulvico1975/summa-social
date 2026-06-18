import type { JustificationDocument } from '@/lib/project-justification-rows';
import {
  buildDocumentReviewIncidents,
  classifyDocumentByName,
  DEFAULT_DOCUMENT_REVIEW_POLICY,
  resolveDocumentReviewStatus,
} from './checklist';
import type {
  DocumentReviewDetection,
  DocumentReviewDocument,
  DocumentReviewFields,
  DocumentReviewRow,
  NormalizeDocumentReviewRowsParams,
} from './types';

function emptyFields(): DocumentReviewFields {
  return {
    invoiceNumber: { value: null, confidence: null, evidence: null },
    invoiceDate: { value: null, confidence: null, evidence: null },
    paymentDate: { value: null, confidence: null, evidence: null },
    amount: { value: null, confidence: null, evidence: null },
    supplierName: { value: null, confidence: null, evidence: null },
    supplierTaxId: { value: null, confidence: null, evidence: null },
  };
}

function mergeFields(detection: DocumentReviewDetection | undefined): DocumentReviewFields {
  const fields = emptyFields();
  if (!detection?.fields) return fields;

  return {
    ...fields,
    ...detection.fields,
  };
}

export function buildReviewDocumentKey(document: {
  storagePath?: string | null;
  documentUrl?: string | null;
  documentName: string;
}): string {
  return document.storagePath?.trim()
    || document.documentUrl?.trim()
    || document.documentName.trim();
}

function toReviewDocument(params: {
  rowOrder: number;
  index: number;
  document: JustificationDocument;
  detection?: DocumentReviewDetection;
}): DocumentReviewDocument {
  const duplicateKey = buildReviewDocumentKey(params.document);
  const detectedType = params.detection?.docType ?? classifyDocumentByName(params.document.documentName);

  return {
    id: `${params.rowOrder}:${params.index + 1}:${duplicateKey}`,
    rowOrder: params.rowOrder,
    documentName: params.document.documentName,
    documentUrl: params.document.documentUrl,
    storagePath: params.document.storagePath,
    contentType: params.document.contentType ?? null,
    duplicateKey,
    detectedType,
    confidence: params.detection?.confidence ?? null,
    fields: mergeFields(params.detection),
    provider: params.detection?.provider ?? null,
    model: params.detection?.model ?? null,
    processedAt: params.detection?.processedAt ?? null,
    errors: params.detection?.errors ?? [],
  };
}

function collectDuplicateKeys(params: NormalizeDocumentReviewRowsParams): Set<string> {
  const counts = new Map<string, number>();

  for (const row of params.rows) {
    for (const document of row.documents) {
      const key = buildReviewDocumentKey(document);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return new Set([...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key));
}

export function normalizeDocumentReviewRows(params: NormalizeDocumentReviewRowsParams): DocumentReviewRow[] {
  const duplicateKeys = collectDuplicateKeys(params);
  const policy = { ...DEFAULT_DOCUMENT_REVIEW_POLICY, ...params.policy };

  return params.rows.map((row) => {
    const documents = row.documents.map((document, index) => {
      const documentKey = buildReviewDocumentKey(document);
      const detection = params.detectionsByDocumentKey?.[documentKey] ?? document.aiDocumentReview ?? undefined;
      return toReviewDocument({
        rowOrder: row.order,
        index,
        document,
        detection,
      });
    });

    const baseRow: Omit<DocumentReviewRow, 'incidents' | 'status'> = {
      order: row.order,
      txId: row.txId,
      source: row.source,
      dateExpense: row.dateExpense,
      paymentDate: row.paymentDate,
      counterpartyName: row.counterpartyName,
      concept: row.concept,
      budgetLineCode: row.budgetLineCode,
      budgetLineName: row.budgetLineName,
      budgetLineId: row.budgetLineId,
      amountTotalEUR: row.amountTotalEUR,
      amountAssignedEUR: row.amountAssignedEUR,
      documents,
    };

    const incidents = buildDocumentReviewIncidents({
      row: baseRow,
      documents,
      projectStartDate: params.projectStartDate ?? null,
      projectEndDate: params.projectEndDate ?? null,
      duplicateKeys,
      policy,
    });

    return {
      ...baseRow,
      incidents,
      status: resolveDocumentReviewStatus(incidents),
    };
  });
}
