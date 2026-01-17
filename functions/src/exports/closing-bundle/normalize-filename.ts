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
 * Extreu el storagePath d'una URL de Firebase Storage.
 * Reutilitzat de projectExpenses.ts
 */
export function extractStoragePathFromUrl(url: string): string | null {
  if (!url.includes('/o/')) return null;

  const match = url.match(/\/o\/([^?]+)/);
  if (!match?.[1]) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
