export const LEGACY_TRANSACTION_DOCUMENT_ID = '__legacy_transaction_document__';

export type TransactionDocumentSource = 'transaction-upload' | 'legacy-document';

export interface TransactionDocumentRecord {
  id?: string;
  url: string;
  storagePath: string | null;
  filename: string;
  contentType: string | null;
  size: number | null;
  isPrimary: boolean;
  createdAt: string;
  createdByUid: string | null;
  source: TransactionDocumentSource;
}

export interface ResolvedTransactionDocument extends TransactionDocumentRecord {
  id: string;
  isLegacy: boolean;
}

export interface ResolveTransactionDocumentsInput {
  transactionId: string;
  legacyDocument?: string | null;
  documents?: Array<TransactionDocumentRecord & { id?: string }> | null;
}

export interface ResolvedTransactionDocuments {
  documents: ResolvedTransactionDocument[];
  primaryDocument: ResolvedTransactionDocument | null;
  count: number;
}

export function resolveTransactionDocuments({
  transactionId,
  legacyDocument,
  documents,
}: ResolveTransactionDocumentsInput): ResolvedTransactionDocuments {
  const normalizedNewDocuments = normalizeNewDocuments(documents ?? []);
  const legacy = normalizeLegacyDocument(transactionId, legacyDocument);
  const legacyUrlKey = legacy ? normalizeUrlKey(legacy.url) : null;
  const withoutLegacyDuplicates = legacyUrlKey
    ? normalizedNewDocuments.filter((doc) => normalizeUrlKey(doc.url) !== legacyUrlKey)
    : normalizedNewDocuments;

  const resolved = legacy
    ? [legacy, ...withoutLegacyDuplicates]
    : withoutLegacyDuplicates;
  const primaryDocument = pickPrimaryDocument(resolved);
  const documentsWithPrimary = resolved.map((doc) => ({
    ...doc,
    isPrimary: primaryDocument ? doc.id === primaryDocument.id : false,
  }));

  return {
    documents: documentsWithPrimary,
    primaryDocument: primaryDocument
      ? documentsWithPrimary.find((doc) => doc.id === primaryDocument.id) ?? null
      : null,
    count: documentsWithPrimary.length,
  };
}

export function sortTransactionDocuments(
  documents: ResolvedTransactionDocument[]
): ResolvedTransactionDocument[] {
  return [...documents].sort((a, b) => {
    if (a.isLegacy !== b.isLegacy) return a.isLegacy ? -1 : 1;
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    const created = a.createdAt.localeCompare(b.createdAt);
    if (created !== 0) return created;
    return a.id.localeCompare(b.id);
  });
}

export function pickNextPrimaryDocument(
  documents: Array<TransactionDocumentRecord & { id?: string }>,
  deletedDocumentId: string
): (TransactionDocumentRecord & { id?: string }) | null {
  const candidates = normalizeNewDocuments(documents)
    .filter((doc) => doc.id !== deletedDocumentId)
    .sort((a, b) => {
      const created = a.createdAt.localeCompare(b.createdAt);
      if (created !== 0) return created;
      return a.id.localeCompare(b.id);
    });
  return candidates[0] ?? null;
}

export function buildLegacyTransactionDocument(
  transactionId: string,
  url: string
): ResolvedTransactionDocument {
  return {
    id: LEGACY_TRANSACTION_DOCUMENT_ID,
    url,
    storagePath: null,
    filename: inferFilenameFromUrl(url) || `${transactionId}-document`,
    contentType: null,
    size: null,
    isPrimary: true,
    createdAt: '',
    createdByUid: null,
    source: 'legacy-document',
    isLegacy: true,
  };
}

function normalizeNewDocuments(
  documents: Array<TransactionDocumentRecord & { id?: string }>
): ResolvedTransactionDocument[] {
  return documents
    .filter((doc) => typeof doc.url === 'string' && doc.url.trim().length > 0)
    .map((doc, index) => ({
      id: doc.id || `document-${index}`,
      url: doc.url.trim(),
      storagePath: doc.storagePath ?? null,
      filename: doc.filename?.trim() || inferFilenameFromUrl(doc.url) || 'document',
      contentType: doc.contentType ?? null,
      size: typeof doc.size === 'number' && Number.isFinite(doc.size) ? doc.size : null,
      isPrimary: doc.isPrimary === true,
      createdAt: doc.createdAt || '',
      createdByUid: doc.createdByUid ?? null,
      source: doc.source ?? 'transaction-upload',
      isLegacy: false,
    }))
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
      const created = a.createdAt.localeCompare(b.createdAt);
      if (created !== 0) return created;
      return a.id.localeCompare(b.id);
    });
}

function normalizeLegacyDocument(
  transactionId: string,
  legacyDocument?: string | null
): ResolvedTransactionDocument | null {
  if (typeof legacyDocument !== 'string') return null;
  const trimmed = legacyDocument.trim();
  if (!trimmed) return null;
  return buildLegacyTransactionDocument(transactionId, trimmed);
}

function pickPrimaryDocument(
  documents: ResolvedTransactionDocument[]
): ResolvedTransactionDocument | null {
  if (documents.length === 0) return null;
  const explicitNewPrimary = documents.find((doc) => !doc.isLegacy && doc.isPrimary);
  if (explicitNewPrimary) return explicitNewPrimary;
  const legacy = documents.find((doc) => doc.isLegacy);
  if (legacy) return legacy;
  return documents[0];
}

function normalizeUrlKey(url: string): string {
  return url.trim();
}

function inferFilenameFromUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const encodedName = parsed.pathname.split('/').filter(Boolean).pop();
    if (!encodedName) return null;
    const decodedPath = decodeURIComponent(encodedName);
    return decodedPath.split('/').filter(Boolean).pop() ?? decodedPath;
  } catch {
    const rawName = trimmed.split('/').filter(Boolean).pop();
    return rawName ?? null;
  }
}
