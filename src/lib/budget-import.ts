/**
 * Budget Import Utilities
 *
 * Funcions pures per parsejar i consolidar pressupostos des d'Excel.
 * Implementat segons especificació: wizard d'importació per finançador principal.
 */

import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export interface ParsedBudgetRow {
  rowIndex: number;
  code: string | null;
  name: string;
  amount: number;
  isSubline: boolean;       // Si és subpartida (codi amb 3+ nivells)
  parentCode: string | null; // Codi de la partida pare (2 nivells)
  isTotal: boolean;         // Si sembla un total/subtotal (excloure per defecte)
}

export interface ConsolidatedBudgetLine {
  code: string | null;
  name: string;
  budgetedAmountEUR: number;
  order: number;
  include: boolean; // L'usuari pot excloure manualment
}

export interface BudgetImportResult {
  lines: ConsolidatedBudgetLine[];
  warnings: string[];
  totalAmount: number;
}

export interface ColumnMapping {
  nameColumn: string | null;
  amountColumn: string | null;
  codeColumn: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING D'IMPORTS (format EU)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parseja un valor d'import amb format EU (1.234,56) o EN (1234.56)
 */
export function parseEuroAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;

  // Si ja és un número
  if (typeof value === 'number') {
    return isFinite(value) ? value : null;
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Eliminar símbols de moneda i espais
  let cleaned = trimmed.replace(/[€$£\s]/g, '');

  // Detectar format: EU (1.234,56) vs EN (1,234.56)
  const hasEuFormat = /\d\.\d{3}/.test(cleaned) || /,\d{1,2}$/.test(cleaned);

  if (hasEuFormat) {
    // Format EU: punts són milers, coma és decimal
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Format EN o sense separadors
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = parseFloat(cleaned);
  return isFinite(parsed) ? parsed : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECCIÓ DE NIVELL DE PARTIDA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Determina el nivell del codi (1, 2, 3...)
 * Exemples: "a1" → 2, "a1.1" → 3, "1.2" → 2, "1.2.3" → 3
 */
export function getCodeLevel(code: string | null): number {
  if (!code) return 0;

  const trimmed = code.trim();
  if (!trimmed) return 0;

  // Comptar segments separats per punt
  const segments = trimmed.split('.').filter(s => s.length > 0);

  // Si el primer segment té lletres i números junts (a1, b2), compta com 2 nivells
  const firstSegment = segments[0];
  const hasLetterAndNumber = /^[a-zA-Z]+\d+$/.test(firstSegment);

  if (hasLetterAndNumber) {
    return segments.length + 1;
  }

  return segments.length;
}

/**
 * Extreu el codi de partida pare (2 nivells)
 * Exemples: "a1.1" → "a1", "1.2.3" → "1.2", "a1" → "a1"
 */
export function getParentCode(code: string | null): string | null {
  if (!code) return null;

  const trimmed = code.trim();
  if (!trimmed) return null;

  const segments = trimmed.split('.');

  // Si és format "a1.1", retornar "a1"
  if (segments.length >= 2) {
    return segments.slice(0, 2).join('.');
  }

  // Si és format "a1" (sense punt), retornar tal qual
  if (/^[a-zA-Z]+\d+$/.test(trimmed)) {
    return trimmed;
  }

  // Si és format "1", retornar tal qual
  return trimmed;
}

/**
 * Determina si un codi és de subpartida (més de 2 nivells)
 */
export function isSublineCode(code: string | null): boolean {
  return getCodeLevel(code) > 2;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DETECCIÓ DE TOTALS/SUBTOTALS
// ═══════════════════════════════════════════════════════════════════════════════

const TOTAL_PATTERNS = [
  /^total/i,
  /^subtotal/i,
  /^suma/i,
  /^sub\s*-?\s*total/i,
  /pressupost\s+total/i,
  /total\s+projecte/i,
  /total\s+proyecto/i,
  /total\s+general/i,
  /import\s+total/i,
];

/**
 * Detecta si una fila sembla un total/subtotal
 */
export function isTotalRow(name: string, code: string | null): boolean {
  if (!name) return false;

  const trimmedName = name.trim().toLowerCase();

  // Patrons de text
  for (const pattern of TOTAL_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return true;
    }
  }

  // Codi buit amb nom que conté "total"
  if (!code && trimmedName.includes('total')) {
    return true;
  }

  return false;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LECTURA D'EXCEL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Llegeix un workbook des d'un ArrayBuffer
 */
export function readWorkbook(data: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(data, { type: 'array' });
}

/**
 * Obté els noms de les sheets d'un workbook
 */
export function getSheetNames(workbook: XLSX.WorkBook): string[] {
  return workbook.SheetNames;
}

/**
 * Obté les dades d'una sheet com a array de arrays
 */
export function getSheetData(workbook: XLSX.WorkBook, sheetName: string): unknown[][] {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];

  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });
}

/**
 * Detecta capçaleres d'una sheet (primera fila no buida amb text)
 */
export function detectHeaders(data: unknown[][], startRow: number = 0): { headers: string[]; headerRow: number } {
  for (let i = startRow; i < Math.min(data.length, startRow + 10); i++) {
    const row = data[i];
    if (!row) continue;

    // Comptar cel·les amb text
    const textCells = row.filter(cell =>
      typeof cell === 'string' && cell.trim().length > 0
    );

    // Si més del 50% són text, probablement és capçalera
    if (textCells.length >= 2 && textCells.length >= row.length * 0.3) {
      const headers = row.map((cell, idx) =>
        typeof cell === 'string' ? cell.trim() : `Columna ${String.fromCharCode(65 + idx)}`
      );
      return { headers, headerRow: i };
    }
  }

  // Fallback: generar capçaleres A, B, C...
  const maxCols = Math.max(...data.map(row => (row ? row.length : 0)));
  const headers = Array.from({ length: maxCols }, (_, i) =>
    `Columna ${String.fromCharCode(65 + i)}`
  );
  return { headers, headerRow: 0 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING DE FILES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parseja les files del pressupost segons el mapping
 */
export function parseRows(
  data: unknown[][],
  headerRow: number,
  mapping: ColumnMapping
): ParsedBudgetRow[] {
  const rows: ParsedBudgetRow[] = [];

  if (!mapping.nameColumn || !mapping.amountColumn) {
    return rows;
  }

  // Trobar índexos de columnes
  const headers = data[headerRow] as string[] || [];
  const nameIdx = headers.indexOf(mapping.nameColumn);
  const amountIdx = headers.indexOf(mapping.amountColumn);
  const codeIdx = mapping.codeColumn ? headers.indexOf(mapping.codeColumn) : -1;

  if (nameIdx === -1 || amountIdx === -1) {
    return rows;
  }

  // Parsejar files (després de la capçalera)
  for (let i = headerRow + 1; i < data.length; i++) {
    const row = data[i];
    if (!row) continue;

    const nameValue = row[nameIdx];
    const amountValue = row[amountIdx];
    const codeValue = codeIdx >= 0 ? row[codeIdx] : null;

    // Saltar files sense nom o import
    const name = typeof nameValue === 'string' ? nameValue.trim() : '';
    if (!name) continue;

    const amount = parseEuroAmount(amountValue);
    if (amount === null || amount <= 0) continue;

    const code = typeof codeValue === 'string' ? codeValue.trim() : null;
    const isSubline = isSublineCode(code);
    const parentCode = isSubline ? getParentCode(code) : code;
    const isTotal = isTotalRow(name, code);

    rows.push({
      rowIndex: i + 1, // 1-indexed per mostrar a l'usuari
      code: code || null,
      name,
      amount,
      isSubline,
      parentCode,
      isTotal,
    });
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLIDACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Consolida files agrupant subpartides a partida
 */
export function consolidateRows(
  rows: ParsedBudgetRow[],
  groupSublines: boolean
): BudgetImportResult {
  const warnings: string[] = [];

  // Excloure totals per defecte
  const filteredRows = rows.filter(row => {
    if (row.isTotal) {
      warnings.push(`Fila ${row.rowIndex} exclosa (detectat com a total): "${row.name}"`);
      return false;
    }
    return true;
  });

  if (!groupSublines) {
    // Mode "tal qual": importar totes les línies sense agrupar
    const lines: ConsolidatedBudgetLine[] = filteredRows.map((row, idx) => ({
      code: row.code,
      name: row.name,
      budgetedAmountEUR: row.amount,
      order: idx + 1,
      include: true,
    }));

    const totalAmount = lines.reduce((sum, line) => sum + line.budgetedAmountEUR, 0);

    return { lines, warnings, totalAmount };
  }

  // Mode "Agrupar": sumar subpartides a partida pare
  const groupMap = new Map<string, { name: string; amount: number; codes: string[] }>();
  const standaloneLines: ParsedBudgetRow[] = [];

  for (const row of filteredRows) {
    if (row.isSubline && row.parentCode) {
      // És subpartida: agrupar per parentCode
      const key = row.parentCode.toLowerCase();
      const existing = groupMap.get(key);

      if (existing) {
        existing.amount += row.amount;
        existing.codes.push(row.code || '');
      } else {
        // Primera subpartida del grup: usar el codi pare com a nom provisional
        groupMap.set(key, {
          name: row.parentCode, // Es pot millorar si trobem el nom del pare
          amount: row.amount,
          codes: [row.code || ''],
        });
      }
    } else {
      // No és subpartida: afegir com a línia independent
      // Però si el seu codi coincideix amb un grup existent, és un total de grup (excloure)
      if (row.code) {
        const key = row.code.toLowerCase();
        if (groupMap.has(key)) {
          // Aquest és el total de grup, ja hem sumat les subpartides
          // Actualitzar el nom del grup amb el nom d'aquesta fila
          const group = groupMap.get(key)!;
          group.name = row.name;
          warnings.push(`Fila ${row.rowIndex} usada per nom de partida (import ignorat, suma subpartides): "${row.name}"`);
          continue;
        }
      }
      standaloneLines.push(row);
    }
  }

  // Construir línies finals
  const lines: ConsolidatedBudgetLine[] = [];
  let order = 1;

  // Primer afegir partides agrupades
  for (const [code, group] of groupMap) {
    lines.push({
      code,
      name: group.name,
      budgetedAmountEUR: group.amount,
      order: order++,
      include: true,
    });
  }

  // Després afegir línies independents
  for (const row of standaloneLines) {
    lines.push({
      code: row.code,
      name: row.name,
      budgetedAmountEUR: row.amount,
      order: order++,
      include: true,
    });
  }

  // Ordenar per codi si existeix
  lines.sort((a, b) => {
    if (!a.code && !b.code) return a.order - b.order;
    if (!a.code) return 1;
    if (!b.code) return -1;
    return a.code.localeCompare(b.code, undefined, { numeric: true });
  });

  // Reassignar ordre
  lines.forEach((line, idx) => {
    line.order = idx + 1;
  });

  const totalAmount = lines
    .filter(line => line.include)
    .reduce((sum, line) => sum + line.budgetedAmountEUR, 0);

  return { lines, warnings, totalAmount };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-DETECT COLUMNES
// ═══════════════════════════════════════════════════════════════════════════════

const NAME_PATTERNS = ['nom', 'nombre', 'name', 'descripcion', 'descripció', 'concepto', 'concepte', 'partida'];
const AMOUNT_PATTERNS = ['import', 'importe', 'amount', 'pressupost', 'presupuesto', 'eur', '€', 'total'];
const CODE_PATTERNS = ['codi', 'codigo', 'code', 'ref', 'referencia', 'num', 'número'];

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Intenta auto-detectar el mapping de columnes
 */
export function autoDetectMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    nameColumn: null,
    amountColumn: null,
    codeColumn: null,
  };

  for (const header of headers) {
    const normalized = normalizeHeader(header);

    // Detectar nom
    if (!mapping.nameColumn) {
      for (const pattern of NAME_PATTERNS) {
        if (normalized.includes(pattern)) {
          mapping.nameColumn = header;
          break;
        }
      }
    }

    // Detectar import
    if (!mapping.amountColumn) {
      for (const pattern of AMOUNT_PATTERNS) {
        if (normalized.includes(pattern)) {
          mapping.amountColumn = header;
          break;
        }
      }
    }

    // Detectar codi
    if (!mapping.codeColumn) {
      for (const pattern of CODE_PATTERNS) {
        if (normalized.includes(pattern)) {
          mapping.codeColumn = header;
          break;
        }
      }
    }
  }

  return mapping;
}

/**
 * Detecta si una columna sembla ser un import (mirant les dades)
 */
export function isAmountColumn(data: unknown[][], headerRow: number, colIdx: number): boolean {
  let numericCount = 0;
  let totalCount = 0;

  for (let i = headerRow + 1; i < Math.min(data.length, headerRow + 20); i++) {
    const row = data[i];
    if (!row) continue;

    const value = row[colIdx];
    if (value === null || value === undefined) continue;

    totalCount++;
    const parsed = parseEuroAmount(value);
    if (parsed !== null) {
      numericCount++;
    }
  }

  return totalCount > 0 && numericCount / totalCount > 0.7;
}
