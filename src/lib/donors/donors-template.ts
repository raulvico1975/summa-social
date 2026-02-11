/**
 * Plantilla oficial de Summa per importar/exportar donants
 *
 * REGLA: Import = Export (mateixes columnes, mateix ordre)
 * La plantilla oficial és l'única acceptada per l'importador.
 */

import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════════════════
// DEFINICIÓ DE COLUMNES (ORDRE FIX)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Capçaleres oficials de la plantilla Summa
 * Aquest ordre és immutable i es fa servir tant per import com per export.
 */
export const DONORS_TEMPLATE_HEADERS = [
  'Nom',
  'NIF/DNI',
  'Estat',
  'Tipus',
  'Modalitat',
  'Categoria per defecte',
  'Adreça',
  'Codi postal',
  'Ciutat',
  'Província',
  'Telèfon',
  'Email',
  'IBAN',
  'Quota',
  "Data d'alta",
  'Periodicitat quota',
  'Nom de contacte',
] as const;

export type DonorTemplateHeader = typeof DONORS_TEMPLATE_HEADERS[number];

/**
 * Mapatge de capçaleres a camps interns del Donor
 */
export const HEADER_TO_FIELD: Record<DonorTemplateHeader, string> = {
  'Nom': 'name',
  'NIF/DNI': 'taxId',
  'Estat': 'status',
  'Tipus': 'donorType',
  'Modalitat': 'membershipType',
  'Categoria per defecte': 'defaultCategory',
  'Adreça': 'address',
  'Codi postal': 'zipCode',
  'Ciutat': 'city',
  'Província': 'province',
  'Telèfon': 'phone',
  'Email': 'email',
  'IBAN': 'iban',
  'Quota': 'monthlyAmount',
  "Data d'alta": 'memberSince',
  'Periodicitat quota': 'periodicityQuota',
  'Nom de contacte': 'contactPersonName',
};

/**
 * Camps obligatoris per a la validació
 */
export const REQUIRED_DONOR_FIELDS = ['name', 'taxId', 'zipCode'] as const;

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
 * Capçaleres anteriors acceptades per compatibilitat.
 * Clau = capçalera antiga (normalitzada), valor = capçalera oficial actual (normalitzada).
 */
const LEGACY_HEADER_ALIASES: Record<string, string> = {
  'quota mensual': 'quota',
};

/**
 * Comprova si les capçaleres del fitxer corresponen a la plantilla oficial.
 * Requisits:
 * - Mateixes columnes (o equivalents legacy)
 * - Mateix ordre
 * - Mateixa longitud
 * Comparació case-insensitive + trim + col·lapse espais.
 */
export function isOfficialTemplate(headers: string[]): boolean {
  // Mateixa longitud
  if (headers.length !== DONORS_TEMPLATE_HEADERS.length) {
    return false;
  }

  // Normalitzar ambdues llistes
  const normalizedHeaders = headers.map(normalizeHeader);
  const officialNormalized = DONORS_TEMPLATE_HEADERS.map(normalizeHeader);

  // Comparar cada índex (acceptant aliases legacy)
  for (let i = 0; i < officialNormalized.length; i++) {
    const h = normalizedHeaders[i];
    if (h !== officialNormalized[i] && LEGACY_HEADER_ALIASES[h] !== officialNormalized[i]) {
      return false;
    }
  }

  return true;
}

/**
 * Genera el mapatge automàtic per a la plantilla oficial.
 * Retorna un objecte amb les posicions de cada camp.
 */
export function getOfficialTemplateMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  const normalizedHeaders = headers.map(normalizeHeader);

  for (const [header, field] of Object.entries(HEADER_TO_FIELD)) {
    const normalizedOfficial = normalizeHeader(header);
    let idx = normalizedHeaders.indexOf(normalizedOfficial);
    // Fallback: buscar aliases legacy que apuntin a aquesta capçalera oficial
    if (idx === -1) {
      for (const [legacy, official] of Object.entries(LEGACY_HEADER_ALIASES)) {
        if (official === normalizedOfficial) {
          idx = normalizedHeaders.indexOf(legacy);
          if (idx !== -1) break;
        }
      }
    }
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
 * Descarrega la plantilla oficial de donants en format Excel.
 */
export function downloadDonorsTemplate(): void {
  const exampleRows = [
    // Fila d'exemple 1: Particular soci
    [
      'Maria García López',
      '12345678A',
      'Actiu',
      'Particular',
      'Soci',
      'Quotes socis',
      'Carrer Major, 10',
      '28001',
      'Madrid',
      'Madrid',
      '612345678',
      'maria@exemple.com',
      'ES1234567890123456789012',
      '10',
      '15/01/2023',
      'Mensual',
      '',
    ],
    // Fila d'exemple 2: Particular puntual
    [
      'Joan Pérez Martí',
      '87654321B',
      'Actiu',
      'Particular',
      'Puntual',
      'Donacions',
      '',
      '08001',
      'Barcelona',
      'Barcelona',
      '',
      'joan@exemple.com',
      '',
      '',
      '',
      'Puntual',
      '',
    ],
    // Fila d'exemple 3: Empresa soci
    [
      'Empresa S.L.',
      'B12345678',
      'Actiu',
      'Empresa',
      'Soci',
      'Quotes socis',
      'Av. Principal, 50',
      '25001',
      'Lleida',
      'Lleida',
      '973123456',
      'info@empresa.com',
      'ES0987654321098765432109',
      '50',
      '01/06/2024',
      'Trimestral',
      'Pere Vila',
    ],
  ];

  // Crear worksheet amb capçaleres + exemples
  const data = [
    [...DONORS_TEMPLATE_HEADERS],
    ...exampleRows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ajustar amplades de columna
  ws['!cols'] = [
    { wch: 30 },  // Nom
    { wch: 12 },  // NIF/DNI
    { wch: 10 },  // Estat
    { wch: 12 },  // Tipus
    { wch: 12 },  // Modalitat
    { wch: 20 },  // Categoria per defecte
    { wch: 25 },  // Adreça
    { wch: 12 },  // Codi postal
    { wch: 15 },  // Ciutat
    { wch: 15 },  // Província
    { wch: 12 },  // Telèfon
    { wch: 25 },  // Email
    { wch: 28 },  // IBAN
    { wch: 14 },  // Quota
    { wch: 14 },  // Data d'alta
    { wch: 18 },  // Periodicitat quota
    { wch: 25 },  // Nom de contacte
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Donants');

  XLSX.writeFile(wb, 'plantilla_donants_summa.xlsx');
}
