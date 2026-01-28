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
  isChapter: boolean;       // Si és capítol (codi sola lletra: A, B, ...)
  isParentLabelOnly: boolean; // Si és fila pare sense import (només per nom)
}

export interface ConsolidatedBudgetLine {
  code: string | null;
  name: string;
  budgetedAmountEUR: number;
  order: number;
  include: boolean; // L'usuari pot excloure manualment
  isChapter: boolean; // Si és capítol (per UI)
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
  extractCodeFromName: boolean; // Extreure codi del text (PARTIDES)
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

/**
 * Determina si un codi és capítol (sola lletra: A, B, C...)
 */
export function isChapterCode(code: string | null): boolean {
  if (!code) return false;
  return /^[A-Za-z]$/.test(code.trim());
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXTRACCIÓ DE CODI DEL TEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extreu codi i nom net d'un text com "a.1) Remuneració personal"
 * Patrons suportats:
 * - A) / B) (capítol)
 * - a.1) / a.10) (partida)
 * - a.1.1) / a.1.10) (subpartida)
 * - Variants amb espais: a.1 ), a.1.1 )
 *
 * NOTA: El codi es retorna TAL QUAL (preservant majúscules/minúscules de l'original)
 */
export function extractCodeFromText(text: string): { code: string | null; name: string } {
  if (!text) return { code: null, name: '' };

  const trimmed = text.trim();

  // Patró 1: lletra sola amb parèntesi - A) Capítol
  const chapterMatch = trimmed.match(/^([A-Za-z])\s*\)\s*(.*)$/);
  if (chapterMatch) {
    return {
      code: chapterMatch[1], // Preservar case original
      name: chapterMatch[2].trim(),
    };
  }

  // Patró 2: lletra.número(.número)* amb parèntesi - a.1) o a.1.1)
  // Suporta: a.1), a.10), a.1.1), a.1.10), amb o sense espais abans del )
  const partidaMatch = trimmed.match(/^([a-zA-Z](?:\.\d+)+)\s*\)\s*(.*)$/);
  if (partidaMatch) {
    return {
      code: partidaMatch[1], // Preservar case original
      name: partidaMatch[2].trim(),
    };
  }

  // Patró 3: lletra+número amb parèntesi - a1) (menys comú)
  const altMatch = trimmed.match(/^([a-zA-Z]\d+(?:\.\d+)*)\s*\)\s*(.*)$/);
  if (altMatch) {
    return {
      code: altMatch[1], // Preservar case original
      name: altMatch[2].trim(),
    };
  }

  // No s'ha trobat codi
  return { code: null, name: trimmed };
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
 * @param allowParentLabels - Si true, permet files pare sense import (per grouping)
 */
export function parseRows(
  data: unknown[][],
  headerRow: number,
  mapping: ColumnMapping,
  allowParentLabels: boolean = false
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

    // Saltar files sense nom
    let rawName = typeof nameValue === 'string' ? nameValue.trim() : '';
    if (!rawName) continue;

    // Extreure codi del text si està activat i no hi ha columna de codi
    let code: string | null = typeof codeValue === 'string' ? codeValue.trim() : null;
    let name = rawName;

    if (mapping.extractCodeFromName && !code) {
      const extracted = extractCodeFromText(rawName);
      code = extracted.code;
      name = extracted.name || rawName; // Fallback al nom original si queda buit
    }

    const amount = parseEuroAmount(amountValue);
    const hasValidAmount = amount !== null && amount > 0;

    // Si no té import vàlid i no permetem etiquetes pare, saltar
    if (!hasValidAmount && !allowParentLabels) continue;

    // Si no té import vàlid i no té codi, saltar (no pot ser etiqueta pare)
    if (!hasValidAmount && !code) continue;

    const isChapter = isChapterCode(code);
    const isSubline = isSublineCode(code);
    const parentCode = isSubline ? getParentCode(code) : null;
    const isTotal = isTotalRow(name, code);
    const isParentLabelOnly = !hasValidAmount && !!code;

    rows.push({
      rowIndex: i + 1, // 1-indexed per mostrar a l'usuari
      code: code || null,
      name,
      amount: hasValidAmount ? amount : 0,
      isSubline,
      parentCode,
      isTotal,
      isChapter,
      isParentLabelOnly,
    });
  }

  return rows;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLIDACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Consolida files agrupant subpartides a partida
 * @param useContextGrouping - Si true, files sense codi s'assignen al darrer parentCode detectat
 */
export function consolidateRows(
  rows: ParsedBudgetRow[],
  groupSublines: boolean,
  useContextGrouping: boolean = false
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
    // Excloure files pare sense import (isParentLabelOnly)
    const lines: ConsolidatedBudgetLine[] = filteredRows
      .filter(row => !row.isParentLabelOnly)
      .map((row, idx) => ({
        code: row.code,
        name: row.name,
        budgetedAmountEUR: row.amount,
        order: idx + 1,
        include: !row.isChapter, // Capítols desactivats per defecte
        isChapter: row.isChapter,
      }));

    const totalAmount = lines
      .filter(line => line.include)
      .reduce((sum, line) => sum + line.budgetedAmountEUR, 0);

    return { lines, warnings, totalAmount };
  }

  // Mode "Agrupar": sumar subpartides a partida pare
  // Mapa: codi partida → { name, amount, hasSublines }
  const groupMap = new Map<string, { name: string; amount: number; codes: string[]; hasSublines: boolean }>();
  const standaloneLines: ParsedBudgetRow[] = [];
  const chapterLines: ParsedBudgetRow[] = [];

  // Primera passada: recollir etiquetes pare per tenir els noms
  const parentLabels = new Map<string, string>();
  for (const row of filteredRows) {
    if (row.isParentLabelOnly && row.code) {
      parentLabels.set(row.code.toLowerCase(), row.name);
    }
  }

  // Context per agrupació de files sense codi (mode ACCD/Fons Català)
  // Només s'activa quan useContextGrouping = true
  let currentParentCode: string | null = null;

  // Segona passada: agrupar (ordre original important per context)
  for (const row of filteredRows) {
    // Saltar files que només són etiquetes (les processarem després per noms)
    if (row.isParentLabelOnly) {
      // Actualitzar context si és partida (no capítol)
      if (row.code && !row.isChapter) {
        currentParentCode = row.code.toLowerCase();
      }
      continue;
    }

    // Capítols: tractar apart (no s'inclouen per defecte)
    // IMPORTANT: Els capítols NO actualitzen currentParentCode
    if (row.isChapter) {
      chapterLines.push(row);
      continue;
    }

    if (row.isSubline && row.parentCode) {
      // És subpartida amb codi explícit (a.1.1): agrupar per parentCode
      const key = row.parentCode.toLowerCase();
      const existing = groupMap.get(key);

      if (existing) {
        existing.amount += row.amount;
        existing.codes.push(row.code || '');
        existing.hasSublines = true;
      } else {
        // Primera subpartida del grup: buscar nom a parentLabels o usar codi
        const parentName = parentLabels.get(key) || row.parentCode;
        groupMap.set(key, {
          name: parentName,
          amount: row.amount,
          codes: [row.code || ''],
          hasSublines: true,
        });
      }
      // Actualitzar context al pare
      currentParentCode = key;
    } else if (row.code) {
      // Té codi (partida independent o pare amb import)
      const key = row.code.toLowerCase();
      const existing = groupMap.get(key);

      if (existing && existing.hasSublines) {
        // Ja existeix un grup amb sublínies: ignorar import d'aquesta fila (és total)
        // Però actualitzar nom si és millor que el provisional
        if (row.name && row.name !== row.code) {
          existing.name = row.name;
        }
        warnings.push(`Fila ${row.rowIndex}: import ignorat (prioritzada suma sublínies): "${row.name}"`);
      } else if (existing) {
        // Existeix però no té sublínies: sumar
        existing.amount += row.amount;
        existing.codes.push(row.code);
      } else {
        // No existeix: crear grup nou (pot rebre sublínies després)
        groupMap.set(key, {
          name: row.name,
          amount: row.amount,
          codes: [row.code],
          hasSublines: false,
        });
      }
      // Actualitzar context
      currentParentCode = key;
    } else {
      // Fila SENSE codi però AMB import
      // Mode context: assignar al darrer parentCode detectat
      if (useContextGrouping && currentParentCode && row.amount > 0) {
        const key = currentParentCode;
        const existing = groupMap.get(key);

        if (existing) {
          existing.amount += row.amount;
          existing.codes.push(`[${row.name.slice(0, 20)}...]`);
          existing.hasSublines = true;
        } else {
          // Crear grup amb el parentCode
          const parentName = parentLabels.get(key) || key;
          groupMap.set(key, {
            name: parentName,
            amount: row.amount,
            codes: [`[${row.name.slice(0, 20)}...]`],
            hasSublines: true,
          });
        }
      } else if (row.amount > 0) {
        // Mode normal o sense context: línia independent
        if (useContextGrouping && !currentParentCode) {
          warnings.push(`Fila ${row.rowIndex}: import sense partida pare detectada: "${row.name}"`);
        }
        standaloneLines.push(row);
      }
    }
  }

  // Tercera passada: actualitzar noms de grups amb etiquetes pare
  for (const [key, label] of parentLabels) {
    const group = groupMap.get(key);
    if (group && (group.name === key || !group.name)) {
      group.name = label;
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
      isChapter: false,
    });
  }

  // Després afegir línies independents (sense codi)
  for (const row of standaloneLines) {
    lines.push({
      code: row.code,
      name: row.name,
      budgetedAmountEUR: row.amount,
      order: order++,
      include: true,
      isChapter: false,
    });
  }

  // Finalment afegir capítols (desactivats per defecte)
  for (const row of chapterLines) {
    lines.push({
      code: row.code,
      name: row.name,
      budgetedAmountEUR: row.amount,
      order: order++,
      include: false, // Capítols desactivats per defecte
      isChapter: true,
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
    extractCodeFromName: false,
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
