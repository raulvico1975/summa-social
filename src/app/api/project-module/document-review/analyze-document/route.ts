import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAdminApp } from '@/lib/api/admin-sdk';
import { requirePermission } from '@/lib/api/require-permission';
import { checkRateLimit } from '@/lib/api/rate-limit';
import { requireOrgMembership, type ApiGuardCode } from '@/lib/api/request-guards';
import { canAccessProjectsArea } from '@/lib/permissions';
import {
  MAX_DOCUMENT_REVIEW_AI_BYTES,
  OpenAiDocumentReviewError,
  analyzeDocumentWithOpenAI,
  inferDocumentReviewContentType,
  isAllowedDocumentReviewStoragePath,
  isSupportedDocumentReviewContentType,
  resolveOpenAiApiKey,
  resolveOpenAiDocumentReviewModel,
  type DocumentReviewDetection,
  type DocumentReviewField,
} from '@/lib/document-review';

type AnalyzeDocumentRequest = {
  orgId?: string;
  txId?: string;
  documentKey?: string;
  documentName?: string;
  storagePath?: string;
  rowContext?: {
    source?: 'bank' | 'offBank';
    dateExpense?: string;
    paymentDate?: string | null;
    counterpartyName?: string;
    concept?: string;
    amountAssignedEUR?: number | null;
    amountTotalEUR?: number | null;
    budgetLineCode?: string;
    budgetLineName?: string;
  };
};

type AnalyzeDocumentSuccess = {
  ok: true;
  documentKey: string;
  persisted: boolean;
  detection: DocumentReviewDetection;
};

type AnalyzeDocumentError = {
  ok: false;
  code:
    | 'AI_UNAVAILABLE'
    | 'QUOTA_EXCEEDED'
    | 'RATE_LIMITED'
    | 'TRANSIENT'
    | 'INVALID_INPUT'
    | 'UNSUPPORTED_FILE'
    | 'FETCH_ERROR'
    | 'AI_ERROR'
    | 'INVALID_OUTPUT'
    | ApiGuardCode;
  message: string;
};

type AnalyzeDocumentResponse = AnalyzeDocumentSuccess | AnalyzeDocumentError;

function errorResponse(code: AnalyzeDocumentError['code'], message: string, status = 200): NextResponse<AnalyzeDocumentError> {
  return NextResponse.json({ ok: false, code, message }, { status });
}

function safeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function normalizeRowContext(body: AnalyzeDocumentRequest): Parameters<typeof analyzeDocumentWithOpenAI>[0]['rowContext'] {
  const rowContext = body.rowContext ?? {};
  return {
    source: rowContext.source === 'bank' ? 'bank' : 'offBank',
    dateExpense: safeString(rowContext.dateExpense),
    paymentDate: typeof rowContext.paymentDate === 'string' && rowContext.paymentDate.trim()
      ? rowContext.paymentDate.trim()
      : null,
    counterpartyName: safeString(rowContext.counterpartyName),
    concept: safeString(rowContext.concept),
    amountAssignedEUR: safeNumber(rowContext.amountAssignedEUR),
    amountTotalEUR: safeNumber(rowContext.amountTotalEUR),
    budgetLineCode: safeString(rowContext.budgetLineCode),
    budgetLineName: safeString(rowContext.budgetLineName),
  };
}

function fileNameFromPath(storagePath: string): string {
  const parts = storagePath.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'document';
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function serializeReviewField<T extends string | number>(
  field: DocumentReviewField<T> | undefined
): DocumentReviewField<T> {
  return {
    value: field?.value ?? null,
    confidence: nullableNumber(field?.confidence),
    evidence: nullableString(field?.evidence),
  };
}

function serializeDocumentReviewDetection(detection: DocumentReviewDetection): DocumentReviewDetection {
  const fields = detection.fields ?? {};
  return {
    docType: detection.docType,
    confidence: nullableNumber(detection.confidence),
    fields: {
      invoiceNumber: serializeReviewField(fields.invoiceNumber),
      invoiceDate: serializeReviewField(fields.invoiceDate),
      paymentDate: serializeReviewField(fields.paymentDate),
      amount: serializeReviewField(fields.amount),
      supplierName: serializeReviewField(fields.supplierName),
      supplierTaxId: serializeReviewField(fields.supplierTaxId),
    },
    provider: nullableString(detection.provider),
    model: nullableString(detection.model),
    processedAt: nullableString(detection.processedAt) ?? new Date().toISOString(),
    errors: Array.isArray(detection.errors)
      ? detection.errors.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [],
  };
}

function documentMatches(params: {
  candidate: Record<string, unknown>;
  storagePath: string;
  documentKey: string;
  documentName: string;
}): boolean {
  const candidateStoragePath = nullableString(params.candidate.storagePath);
  const candidateUrl = nullableString(params.candidate.url) ?? nullableString(params.candidate.fileUrl);
  const candidateName = nullableString(params.candidate.name);
  return candidateStoragePath === params.storagePath
    || candidateUrl === params.documentKey
    || candidateName === params.documentName;
}

async function persistDocumentReviewDetection(params: {
  orgId: string;
  txId: string | undefined;
  source: 'bank' | 'offBank';
  storagePath: string;
  documentKey: string;
  documentName: string;
  detection: DocumentReviewDetection;
}): Promise<boolean> {
  const txId = params.txId?.trim();
  if (!txId) return false;
  if (params.source !== 'offBank') return false;

  const app = getAdminApp();
  const db = getFirestore(app);
  const serialized = serializeDocumentReviewDetection(params.detection);

  if (!txId.startsWith('off_')) return false;
  const expenseId = txId.slice(4).trim();
  if (!expenseId) return false;

  const ref = db.doc(`organizations/${params.orgId}/projectModule/_/offBankExpenses/${expenseId}`);
  const snap = await ref.get();
  if (!snap.exists) return false;

  const data = snap.data() ?? {};
  const attachments = Array.isArray(data.attachments) ? data.attachments : [];
  let found = false;
  const nextAttachments = attachments.map((attachment) => {
    if (!attachment || typeof attachment !== 'object') return attachment;
    const candidate = attachment as Record<string, unknown>;
    if (!documentMatches({
      candidate,
      storagePath: params.storagePath,
      documentKey: params.documentKey,
      documentName: params.documentName,
    })) {
      return attachment;
    }

    found = true;
    return {
      ...candidate,
      aiDocumentReview: serialized,
    };
  });

  if (!found) return false;
  await ref.update({
    attachments: nextAttachments,
    updatedAt: Timestamp.now(),
  });
  return true;
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeDocumentResponse>> {
  let body: AnalyzeDocumentRequest;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_INPUT', 'Cos de petició invàlid.', 400);
  }

  const guard = await requireOrgMembership(request, body.orgId);
  if (!guard.ok) {
    return NextResponse.json({
      ok: false,
      code: guard.code,
      message: guard.message,
    }, { status: guard.status });
  }

  const denied = requirePermission(guard.membership, {
    code: 'PROJECT_MODULE_REQUIRED',
    check: canAccessProjectsArea,
  });
  if (denied) {
    return errorResponse('FORBIDDEN', 'No tens permisos per usar la revisió documental amb IA.', 403);
  }

  const apiKey = resolveOpenAiApiKey();
  if (!apiKey) {
    return errorResponse('AI_UNAVAILABLE', 'OpenAI API key not configured.');
  }

  const rateLimit = checkRateLimit({
    key: `ai:document-review:${guard.auth.uid}:${guard.orgId}`,
    limit: 20,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json({
      ok: false,
      code: 'RATE_LIMITED',
      message: 'Rate limited. Espera uns segons.',
    }, {
      status: 429,
      headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    });
  }

  const storagePath = body.storagePath?.trim();
  if (!storagePath || !isAllowedDocumentReviewStoragePath(storagePath, guard.orgId)) {
    return errorResponse('INVALID_INPUT', 'storagePath no pertany als documents revisables d’aquesta organització.', 400);
  }

  const documentKey = body.documentKey?.trim() || storagePath;
  const documentName = body.documentName?.trim() || fileNameFromPath(storagePath);

  let buffer: Buffer;
  let metadataContentType: string | null = null;
  try {
    const bucket = getStorage(getAdminApp()).bucket();
    const file = bucket.file(storagePath);
    const [metadata] = await file.getMetadata();
    const metadataSize = typeof metadata.size === 'string' ? Number(metadata.size) : Number(metadata.size ?? 0);
    if (Number.isFinite(metadataSize) && metadataSize > MAX_DOCUMENT_REVIEW_AI_BYTES) {
      return errorResponse('INVALID_INPUT', 'El document supera la mida màxima permesa.', 400);
    }
    metadataContentType = typeof metadata.contentType === 'string' ? metadata.contentType : null;
    const [downloaded] = await file.download();
    buffer = downloaded;
  } catch (error) {
    console.error('[document-review-ai] Storage error:', error);
    return errorResponse('FETCH_ERROR', 'No s’ha pogut llegir el document de Storage.');
  }

  if (buffer.byteLength > MAX_DOCUMENT_REVIEW_AI_BYTES) {
    return errorResponse('INVALID_INPUT', 'El document supera la mida màxima permesa.', 400);
  }

  const contentType = inferDocumentReviewContentType({
    contentType: metadataContentType,
    filename: documentName,
    storagePath,
    buffer,
  });
  if (!contentType || !isSupportedDocumentReviewContentType(contentType)) {
    return errorResponse('UNSUPPORTED_FILE', 'Aquest tipus de document encara no es pot analitzar amb IA.', 400);
  }

  try {
    const detection = await analyzeDocumentWithOpenAI({
      apiKey,
      model: resolveOpenAiDocumentReviewModel(),
      file: {
        filename: documentName,
        contentType,
        base64: buffer.toString('base64'),
      },
      rowContext: normalizeRowContext(body),
    });

    let persisted = false;
    try {
      persisted = await persistDocumentReviewDetection({
        orgId: guard.orgId,
        txId: body.txId,
        source: body.rowContext?.source === 'bank' ? 'bank' : 'offBank',
        storagePath,
        documentKey,
        documentName,
        detection,
      });
    } catch (persistError) {
      console.warn('[document-review-ai] Could not persist detection:', persistError);
    }

    return NextResponse.json({
      ok: true,
      documentKey,
      persisted,
      detection,
    });
  } catch (error) {
    if (error instanceof OpenAiDocumentReviewError) {
      return errorResponse(error.code, error.message, error.status);
    }

    console.error('[document-review-ai] Error:', error);
    return errorResponse('AI_ERROR', error instanceof Error ? error.message : 'No s’ha pogut analitzar el document.');
  }
}
