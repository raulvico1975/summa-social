// src/lib/build-document-filename.ts
// Funcions pures per generar noms de fitxer estandarditzats per comprovants de despeses off-bank

/**
 * Converteix una data ISO (YYYY-MM-DD) a format per nom de fitxer (YYYY.MM.DD)
 * Si la data no és vàlida, retorna la data d'avui en el format correcte.
 */
export function formatDateForFilename(dateISO: string): string {
  // Validar format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateISO)) {
    // Fallback a data d'avui
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}.${mm}.${dd}`;
  }

  // Substituir guions per punts
  return dateISO.replace(/-/g, '.');
}

/**
 * Normalitza el concepte per usar-lo en un nom de fitxer:
 * - Trim i lowercase
 * - Elimina accents (diacrítics)
 * - Substitueix caràcters no alfanumèrics per guió baix
 * - Col·lapsa guions baixos consecutius
 * - Màxim 40 caràcters
 * - Si queda buit, retorna "document"
 */
export function normalizeConcept(concept: string): string {
  if (!concept || typeof concept !== 'string') {
    return 'document';
  }

  let normalized = concept
    .trim()
    .toLowerCase()
    // Eliminar accents/diacrítics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Substituir caràcters no alfanumèrics per guió baix
    .replace(/[^a-z0-9]/g, '_')
    // Col·lapsar guions baixos consecutius
    .replace(/_+/g, '_')
    // Treure guions baixos al principi i final
    .replace(/^_+|_+$/g, '');

  // Tallar a màxim 40 caràcters
  if (normalized.length > 40) {
    normalized = normalized.substring(0, 40);
    // Evitar tallar a mig guió baix
    normalized = normalized.replace(/_+$/, '');
  }

  // Si queda buit, retornar "document"
  return normalized || 'document';
}

/**
 * Extreu l'extensió d'un nom de fitxer original.
 * Retorna l'extensió amb el punt inclòs (p.ex. ".pdf", ".jpg").
 * Si no té extensió, retorna string buit.
 */
function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }

  return filename.substring(lastDotIndex).toLowerCase();
}

export interface BuildDocumentFilenameParams {
  dateISO: string;
  concept: string;
  originalName: string;
}

/**
 * Construeix el nom de fitxer estandarditzat per un comprovant de despesa off-bank.
 * Format: YYYY.MM.DD_concepte_normalitzat.ext
 *
 * @example
 * buildDocumentFilename({
 *   dateISO: '2024-03-15',
 *   concept: 'Compra material oficina',
 *   originalName: 'factura_123.pdf'
 * })
 * // Retorna: '2024.03.15_compra_material_oficina.pdf'
 */
export function buildDocumentFilename(params: BuildDocumentFilenameParams): string {
  const { dateISO, concept, originalName } = params;

  const formattedDate = formatDateForFilename(dateISO);
  const normalizedConcept = normalizeConcept(concept);
  const extension = getFileExtension(originalName);

  return `${formattedDate}_${normalizedConcept}${extension}`;
}
