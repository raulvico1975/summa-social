/**
 * Employees Import Utilities
 *
 * Importació Excel de treballadors amb:
 * - Matching per NIF (taxId) únicament
 * - Validació i normalització de dades
 * - Preview abans d'aplicar canvis
 * - Batch writes (màx 50)
 */

import * as XLSX from 'xlsx';
import type { Employee } from '@/lib/data';
import { normalizeContact, normalizeIBAN, normalizeTaxId, normalizeEmail, normalizePhone, normalizeZipCode, toTitleCase } from '@/lib/normalize';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila parsejada del fitxer Excel
 */
export interface ParsedEmployeeRow {
  rowIndex: number;         // Fila original (1-indexed per mostrar)
  taxId: string | null;     // NIF normalitzat
  name: string;
  email: string | null;
  phone: string | null;
  iban: string | null;
  startDate: string | null; // Format ISO YYYY-MM-DD
  zipCode: string | null;
  notes: string | null;
}

/**
 * Resultat del matching amb treballadors existents
 */
export interface EmployeeImportPreview {
  rowIndex: number;
  action: 'create' | 'update' | 'skip';
  reason?: string;          // Motiu del skip (ex: "Nom obligatori")
  existingId?: string;      // ID del treballador existent (si update)
  parsed: ParsedEmployeeRow;
  changes?: string[];       // Camps que canviaran (només per update)
}

/**
 * Resultat complet de la importació (preview)
 */
export interface EmployeeImportResult {
  previews: EmployeeImportPreview[];
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓ DE COLUMNES
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnMapping {
  taxId: number;
  name: number;
  email: number;
  phone: number;
  iban: number;
  startDate: number;
  zipCode: number;
  notes: number;
}

const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  taxId: [/^nif$/i, /^dni$/i, /^nie$/i, /^tax\s*id$/i, /^cif$/i],
  name: [/^nom$/i, /^nombre$/i, /^name$/i],
  email: [/^email$/i, /^correu$/i, /^e-mail$/i, /^correo$/i],
  phone: [/^tel[eè]fon$/i, /^telefono$/i, /^phone$/i, /^m[oò]bil$/i, /^movil$/i],
  iban: [/^iban$/i, /^compte$/i, /^cuenta$/i, /^bank$/i],
  startDate: [/^data\s*alta$/i, /^fecha\s*alta$/i, /^start\s*date$/i, /^inici$/i, /^inicio$/i],
  zipCode: [/^codi\s*postal$/i, /^codigo\s*postal$/i, /^cp$/i, /^zip$/i, /^postal$/i],
  notes: [/^notes$/i, /^notas$/i, /^observacions$/i, /^comentaris$/i],
};

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    taxId: -1,
    name: -1,
    email: -1,
    phone: -1,
    iban: -1,
    startDate: -1,
    zipCode: -1,
    notes: -1,
  };

  headers.forEach((header, idx) => {
    const normalized = normalizeHeader(header);

    for (const [field, patterns] of Object.entries(COLUMN_PATTERNS)) {
      if (mapping[field as keyof ColumnMapping] === -1) {
        for (const pattern of patterns) {
          if (pattern.test(normalized) || pattern.test(header)) {
            mapping[field as keyof ColumnMapping] = idx;
            break;
          }
        }
      }
    }
  });

  return mapping;
}

// ═══════════════════════════════════════════════════════════════════════════
// PARSING DE DADES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parseja una data en múltiples formats
 * Accepta: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD.MM.YYYY
 * Retorna: YYYY-MM-DD (format ISO) o null
 */
function parseDate(value: unknown): string | null {
  if (!value) return null;

  const str = String(value).trim();
  if (!str) return null;

  // Si és un número (Excel serial date)
  if (typeof value === 'number') {
    // Excel serial date: dies des de 1900-01-01
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return null;
  }

  // Format DD/MM/YYYY o DD-MM-YYYY o DD.MM.YYYY
  const euMatch = str.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (euMatch) {
    const day = euMatch[1].padStart(2, '0');
    const month = euMatch[2].padStart(2, '0');
    const year = euMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Format YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    const year = isoMatch[1];
    const month = isoMatch[2].padStart(2, '0');
    const day = isoMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

function getCellValue(row: unknown[], idx: number): string | null {
  if (idx < 0 || idx >= row.length) return null;
  const val = row[idx];
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str || null;
}

// ═══════════════════════════════════════════════════════════════════════════
// LECTURA D'EXCEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Llegeix un fitxer Excel i retorna les files parsejades
 */
export function readEmployeesExcel(data: ArrayBuffer): {
  rows: ParsedEmployeeRow[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const rows: ParsedEmployeeRow[] = [];

  // Llegir workbook
  const wb = XLSX.read(data, { type: 'array' });

  // Obtenir primera sheet
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    warnings.push('El fitxer no conté cap full.');
    return { rows, warnings };
  }

  const sheet = wb.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  if (rawData.length < 2) {
    warnings.push('El fitxer no conté files de dades (només capçalera o buit).');
    return { rows, warnings };
  }

  // Detectar capçaleres (primera fila)
  const headers = (rawData[0] as unknown[]).map(h => String(h || '').trim());
  const mapping = detectColumnMapping(headers);

  // Validar columnes obligatòries
  if (mapping.name === -1) {
    warnings.push('No s\'ha trobat la columna "Nom". És obligatòria.');
    return { rows, warnings };
  }

  // Parsejar files (saltant capçalera)
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) {
      continue; // Saltar files buides
    }

    const name = getCellValue(row, mapping.name);
    if (!name) {
      warnings.push(`Fila ${i + 1}: Saltada perquè no té nom.`);
      continue;
    }

    const taxIdRaw = getCellValue(row, mapping.taxId);
    const taxId = taxIdRaw ? normalizeTaxId(taxIdRaw) : null;

    const emailRaw = getCellValue(row, mapping.email);
    const email = emailRaw ? normalizeEmail(emailRaw) : null;

    const phoneRaw = getCellValue(row, mapping.phone);
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

    const ibanRaw = getCellValue(row, mapping.iban);
    const iban = ibanRaw ? normalizeIBAN(ibanRaw) : null;

    const startDateRaw = mapping.startDate >= 0 ? row[mapping.startDate] : null;
    const startDate = parseDate(startDateRaw);

    const zipCodeRaw = getCellValue(row, mapping.zipCode);
    const zipCode = zipCodeRaw ? normalizeZipCode(zipCodeRaw) : null;

    const notes = getCellValue(row, mapping.notes);

    rows.push({
      rowIndex: i + 1,
      taxId,
      name: toTitleCase(name) || name,
      email,
      phone,
      iban,
      startDate,
      zipCode,
      notes,
    });
  }

  return { rows, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHING AMB EXISTENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el preview de la importació comparant amb treballadors existents
 *
 * REGLA: Match NOMÉS per NIF (taxId)
 * - Si té NIF i coincideix → UPDATE
 * - Si té NIF i no coincideix → CREATE
 * - Si no té NIF → CREATE (mai actualitza)
 */
export function generateImportPreview(
  parsedRows: ParsedEmployeeRow[],
  existingEmployees: Employee[]
): EmployeeImportResult {
  const previews: EmployeeImportPreview[] = [];
  const warnings: string[] = [];

  // Crear índex per NIF (case insensitive)
  const employeesByTaxId = new Map<string, Employee>();
  for (const emp of existingEmployees) {
    if (emp.taxId) {
      employeesByTaxId.set(emp.taxId.toLowerCase(), emp);
    }
  }

  for (const parsed of parsedRows) {
    // Validar nom obligatori
    if (!parsed.name.trim()) {
      previews.push({
        rowIndex: parsed.rowIndex,
        action: 'skip',
        reason: 'El nom és obligatori',
        parsed,
      });
      continue;
    }

    // Buscar per NIF (únic criteri de matching)
    let existing: Employee | undefined;

    if (parsed.taxId) {
      existing = employeesByTaxId.get(parsed.taxId.toLowerCase());
    }

    if (existing) {
      // UPDATE: detectar quins camps canvien
      const changes: string[] = [];

      if (parsed.name !== existing.name) changes.push('Nom');
      if ((parsed.email || null) !== (existing.email || null)) changes.push('Email');
      if ((parsed.phone || null) !== (existing.phone || null)) changes.push('Telèfon');
      if ((parsed.iban || null) !== (existing.iban || null)) changes.push('IBAN');
      if ((parsed.startDate || null) !== (existing.startDate || null)) changes.push('Data alta');
      if ((parsed.zipCode || null) !== (existing.zipCode || null)) changes.push('Codi postal');
      if ((parsed.notes || null) !== (existing.notes || null)) changes.push('Notes');

      if (changes.length === 0) {
        previews.push({
          rowIndex: parsed.rowIndex,
          action: 'skip',
          reason: 'Sense canvis',
          existingId: existing.id,
          parsed,
        });
      } else {
        previews.push({
          rowIndex: parsed.rowIndex,
          action: 'update',
          existingId: existing.id,
          parsed,
          changes,
        });
      }
    } else {
      // CREATE
      previews.push({
        rowIndex: parsed.rowIndex,
        action: 'create',
        parsed,
      });
    }
  }

  // Resum
  const summary = {
    total: previews.length,
    toCreate: previews.filter(p => p.action === 'create').length,
    toUpdate: previews.filter(p => p.action === 'update').length,
    toSkip: previews.filter(p => p.action === 'skip').length,
  };

  return { previews, summary, warnings };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREPARACIÓ DE DADES PER FIRESTORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prepara les dades d'un treballador per guardar a Firestore
 * Converteix null a null (no undefined) per evitar errors Firestore
 */
export function prepareEmployeeData(parsed: ParsedEmployeeRow): Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: 'employee',
    name: parsed.name,
    taxId: parsed.taxId || '',
    zipCode: parsed.zipCode || '',
    iban: parsed.iban || null,
    startDate: parsed.startDate || null,
    email: parsed.email || null,
    phone: parsed.phone || null,
    notes: parsed.notes || null,
  } as Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>;
}
