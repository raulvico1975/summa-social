export const MAX_DOCUMENT_REVIEW_AI_BYTES = 10 * 1024 * 1024;

const ALLOWED_DOCUMENT_REVIEW_STORAGE_AREAS = new Set([
  'documents',
  'transactions',
  'offBankExpenses',
]);

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

const SUPPORTED_MIME_TYPES = new Set(Object.values(MIME_BY_EXTENSION));

export function isAllowedDocumentReviewStoragePath(storagePath: unknown, orgId: string): storagePath is string {
  if (typeof storagePath !== 'string') return false;
  if (!storagePath.startsWith(`organizations/${orgId}/`)) return false;
  if (storagePath.includes('..') || storagePath.includes('\0')) return false;
  const [, , area] = storagePath.split('/');
  return ALLOWED_DOCUMENT_REVIEW_STORAGE_AREAS.has(area);
}

function extensionFromName(name: string): string | null {
  const lastDot = name.lastIndexOf('.');
  if (lastDot < 0 || lastDot === name.length - 1) return null;
  return name.slice(lastDot + 1).toLowerCase();
}

function contentTypeFromMagicBytes(buffer: Buffer): string | null {
  if (buffer.length >= 4 && buffer.subarray(0, 4).toString('utf8') === '%PDF') {
    return 'application/pdf';
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return 'image/jpeg';
  }
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return 'image/png';
  }
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

export function inferDocumentReviewContentType(params: {
  contentType?: string | null;
  filename: string;
  storagePath: string;
  buffer: Buffer;
}): string | null {
  const declared = params.contentType?.split(';')[0]?.trim().toLowerCase();
  if (declared && SUPPORTED_MIME_TYPES.has(declared)) return declared;

  const magicType = contentTypeFromMagicBytes(params.buffer);
  if (magicType) return magicType;

  const filenameExt = extensionFromName(params.filename);
  if (filenameExt && MIME_BY_EXTENSION[filenameExt]) return MIME_BY_EXTENSION[filenameExt];

  const pathExt = extensionFromName(params.storagePath);
  if (pathExt && MIME_BY_EXTENSION[pathExt]) return MIME_BY_EXTENSION[pathExt];

  return null;
}

export function isSupportedDocumentReviewContentType(contentType: string): boolean {
  return SUPPORTED_MIME_TYPES.has(contentType);
}
