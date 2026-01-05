/**
 * Plantilla oficial de Summa per importar/exportar proveïdors
 *
 * REGLA: Import = Export (mateixes columnes, mateix ordre)
 * La plantilla oficial és l'única acceptada per l'importador.
 */

import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════════════════
// DEFINICIÓ DE COLUMNES (ORDRE FIX)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Capçaleres oficials de la plantilla Summa per proveïdors
 * Aquest ordre és immutable i es fa servir tant per import com per export.
 */
export const SUPPLIERS_TEMPLATE_HEADERS = [
  'Nom',
  'NIF/CIF',
  'Categoria per defecte',
  'Adreça',
  'Codi postal',
  'Ciutat',
  'Província',
  'Telèfon',
  'Email',
  'IBAN',
] as const;

export type SupplierTemplateHeader = typeof SUPPLIERS_TEMPLATE_HEADERS[number];

/**
 * Mapatge de capçaleres a camps interns del Supplier
 */
export const HEADER_TO_FIELD: Record<SupplierTemplateHeader, string> = {
  'Nom': 'name',
  'NIF/CIF': 'taxId',
  'Categoria per defecte': 'defaultCategory',
  'Adreça': 'address',
  'Codi postal': 'zipCode',
  'Ciutat': 'city',
  'Província': 'province',
  'Telèfon': 'phone',
  'Email': 'email',
  'IBAN': 'iban',
};

/**
 * Camps obligatoris per a la validació
 */
export const REQUIRED_SUPPLIER_FIELDS = ['name'] as const;

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓ DE PLANTILLA OFICIAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Normalitza una capçalera per comparació:
 * - trim
 * - col·lapsar espais múltiples
 * - lowercase
 */
function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/**
 * Comprova si les capçaleres del fitxer corresponen EXACTAMENT a la plantilla oficial.
 * Requisits estrictes:
 * - Mateixes columnes
 * - Mateix ordre
 * - Mateixa longitud
 * Comparació case-insensitive + trim + col·lapse espais.
 */
export function isOfficialSuppliersTemplate(headers: string[]): boolean {
  // Mateixa longitud
  if (headers.length !== SUPPLIERS_TEMPLATE_HEADERS.length) {
    return false;
  }

  // Normalitzar ambdues llistes
  const normalizedHeaders = headers.map(normalizeHeader);
  const officialNormalized = SUPPLIERS_TEMPLATE_HEADERS.map(normalizeHeader);

  // Comparar cada índex exactament
  for (let i = 0; i < officialNormalized.length; i++) {
    if (normalizedHeaders[i] !== officialNormalized[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Genera el mapatge automàtic per a la plantilla oficial.
 * Retorna un objecte amb les posicions de cada camp.
 */
export function getOfficialSupplierMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [header, field] of Object.entries(HEADER_TO_FIELD)) {
    const idx = normalizedHeaders.indexOf(normalizeHeader(header));
    if (idx !== -1) {
      mapping[field] = idx;
    }
  }

  return mapping;
}

// ═══════════════════════════════════════════════════════════════════════════
// GENERACIÓ DE PLANTILLA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Descarrega la plantilla oficial de proveïdors en format Excel.
 */
export function downloadSuppliersTemplate(): void {
  const exampleRows = [
    // Fila d'exemple 1: Proveïdor amb totes les dades
    [
      'Subministraments ABC S.L.',
      'B12345678',
      'Material oficina',
      'Carrer Industrial, 15',
      '08001',
      'Barcelona',
      'Barcelona',
      '932345678',
      'info@abc.com',
      'ES1234567890123456789012',
    ],
    // Fila d'exemple 2: Proveïdor amb dades mínimes
    [
      'Electricitat Ràpida',
      'B87654321',
      'Subministraments',
      '',
      '28001',
      'Madrid',
      'Madrid',
      '',
      'electricitat@rapid.es',
      '',
    ],
    // Fila d'exemple 3: Autònom
    [
      'Joan Garcia - Freelance',
      '12345678A',
      'Serveis externs',
      'Av. Principal, 25',
      '25001',
      'Lleida',
      'Lleida',
      '612345678',
      'joan@freelance.cat',
      'ES0987654321098765432109',
    ],
  ];

  // Crear worksheet amb capçaleres + exemples
  const data = [
    [...SUPPLIERS_TEMPLATE_HEADERS],
    ...exampleRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ajustar amplades de columna
  ws['!cols'] = [
    { wch: 30 },  // Nom
    { wch: 12 },  // NIF/CIF
    { wch: 20 },  // Categoria per defecte
    { wch: 25 },  // Adreça
    { wch: 12 },  // Codi postal
    { wch: 15 },  // Ciutat
    { wch: 15 },  // Província
    { wch: 12 },  // Telèfon
    { wch: 25 },  // Email
    { wch: 28 },  // IBAN
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Proveidors');

  XLSX.writeFile(wb, 'plantilla_proveidors_summa.xlsx');
}
