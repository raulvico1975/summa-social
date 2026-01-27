/**
 * Utilitats per normalitzar noms de fitxers
 * Sense dependències externes
 */

/**
 * Normalitza un text per usar-lo com a part d'un nom de fitxer.
 * - Elimina accents
 * - Converteix a minúscules
 * - Només permet [a-z0-9_]
 * - Col·lapsa guions baixos consecutius
 * - Treu extrems
 * - Limita longitud
 */
export function normalizeFilename(text: string, maxLength = 40): string {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')      // només alfanumèrics
    .replace(/_+/g, '_')              // col·lapsar guions baixos
    .replace(/^_|_$/g, '')            // treure extrems
    .slice(0, maxLength);

  return normalized || 'document';
}

/**
 * Construeix el nom del fitxer PDF dins el ZIP.
 * Format: {ordre}_{YYYY-MM-DD}_{amount}_{concepte}_{txIdShort}.{ext}
 */
export function buildDocumentFileName(params: {
  ordre: number;
  date: string;
  amount: number;
  concept: string;
  txId: string;
  extension: string;
}): string {
  const { ordre, date, amount, concept, txId, extension } = params;

  const ordreStr = String(ordre).padStart(4, '0');
  const amountStr = Math.abs(amount).toFixed(2);
  const conceptNorm = normalizeFilename(concept, 40);
  const txIdShort = txId.slice(-8);
  const ext = extension.startsWith('.') ? extension : `.${extension}`;

  return `${ordreStr}_${date}_${amountStr}_${conceptNorm}_${txIdShort}${ext}`;
}

/**
 * Dedueix l'extensió del fitxer a partir del contentType o nom original.
 */
export function inferExtension(contentType: string | null, originalName: string | null): string {
  // Primer intentar contentType
  if (contentType) {
    const mimeToExt: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'application/xml': 'xml',
      'text/xml': 'xml',
    };

    const ext = mimeToExt[contentType.toLowerCase()];
    if (ext) return ext;
  }

  // Segon intentar nom original
  if (originalName) {
    const match = originalName.match(/\.([a-z0-9]+)$/i);
    if (match) return match[1].toLowerCase();
  }

  // Per defecte
  return 'pdf';
}

/**
 * Tipus de referència de Storage detectada.
 */
export type StorageRefKind = 'v0' | 'app' | 'gs' | 'gcs' | 'direct' | 'generic' | 'unknown';

/**
 * Resultat de l'extracció d'una referència de Storage.
 */
export interface StorageRef {
  path: string | null;
  bucket: string | null;
  kind: StorageRefKind;
}

/**
 * Extreu path i bucket d'una referència de Firebase Storage.
 * Suporta múltiples formats:
 * - gs://bucket/path
 * - https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}
 * - https://{bucket}.firebasestorage.app/o/{path}
 * - https://storage.googleapis.com/{bucket}/{path}
 * - Rutes directes: organizations/... o users/...
 * - URLs signades amb /o/{path}
 */
export function extractStorageRef(input: string): StorageRef {
  // Cas 1: gs://bucket/path
  const gsMatch = input.match(/^gs:\/\/([^/]+)\/(.+)$/);
  if (gsMatch) {
    return { bucket: gsMatch[1], path: gsMatch[2], kind: 'gs' };
  }

  // Cas 2: URL Firebase Storage v0
  // https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
  const v0Match = input.match(/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/);
  if (v0Match) {
    try {
      return { bucket: v0Match[1], path: decodeURIComponent(v0Match[2]), kind: 'v0' };
    } catch {
      return { bucket: v0Match[1], path: v0Match[2], kind: 'v0' };
    }
  }

  // Cas 3: URL firebasestorage.app (nou format)
  // https://{bucket}.firebasestorage.app/o/{path}?...
  const appMatch = input.match(/([^/]+)\.firebasestorage\.app\/o\/([^?]+)/);
  if (appMatch) {
    try {
      return { bucket: appMatch[1], path: decodeURIComponent(appMatch[2]), kind: 'app' };
    } catch {
      return { bucket: appMatch[1], path: appMatch[2], kind: 'app' };
    }
  }

  // Cas 4: URL storage.googleapis.com/{bucket}/{path}
  const gcsMatch = input.match(/storage\.googleapis\.com\/([^/]+)\/(.+?)(?:\?|$)/);
  if (gcsMatch) {
    try {
      return { bucket: gcsMatch[1], path: decodeURIComponent(gcsMatch[2]), kind: 'gcs' };
    } catch {
      return { bucket: gcsMatch[1], path: gcsMatch[2], kind: 'gcs' };
    }
  }

  // Cas 5: Ruta directa de Storage (sense bucket)
  if (input.startsWith('organizations/') || input.startsWith('users/')) {
    return { bucket: null, path: input, kind: 'direct' };
  }

  // Cas 6: Qualsevol altra cosa amb /o/ (URL signada, etc.)
  const genericMatch = input.match(/\/o\/([^?]+)/);
  if (genericMatch) {
    try {
      return { bucket: null, path: decodeURIComponent(genericMatch[1]), kind: 'generic' };
    } catch {
      return { bucket: null, path: genericMatch[1], kind: 'generic' };
    }
  }

  return { path: null, bucket: null, kind: 'unknown' };
}

/**
 * Extreu el storagePath d'una URL de Firebase Storage.
 * @deprecated Usar extractStorageRef per obtenir també bucket i kind
 */
export function extractStoragePathFromUrl(url: string): string | null {
  return extractStorageRef(url).path;
}
