/**
 * Categories Import Utilities
 *
 * Importació Excel de categories amb:
 * - Matching per (type, normalizeText(name))
 * - Suport de camp order per reordenació
 * - Opció d'actualitzar existents o només crear nous
 * - Preview amb detall de canvis
 */

import * as XLSX from 'xlsx';
import type { Category } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila parsejada del fitxer Excel
 */
export interface ParsedCategoryRow {
  rowIndex: number;             // Fila original (1-indexed per mostrar)
  name: string;                 // Nom original (per mostrar)
  nameKey: string;              // Nom normalitzat (per matching i guardar)
  type: 'income' | 'expense';
  order: number | null;         // Ordre (opcional)
}

/**
 * Resultat del matching amb categories existents
 */
export interface CategoryImportPreview {
  rowIndex: number;
  action: 'create' | 'update' | 'skip';
  reason?: string;              // Motiu del skip
  existingId?: string;          // ID de la categoria existent (si update)
  existingOrder?: number | null; // Ordre existent (per mostrar canvi)
  parsed: ParsedCategoryRow;
  changes?: string[];           // Camps que canviaran (només per update)
}

/**
 * Resultat complet de la importació (preview)
 */
export interface CategoryImportResult {
  previews: CategoryImportPreview[];
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
  warnings: string[];
  errors: string[];             // Errors bloquejants
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓ DE COLUMNES
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnMapping {
  name: number;
  type: number;
  order: number;
}

const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  name: [/^nom$/i, /^nombre$/i, /^name$/i, /^categoria$/i, /^category$/i],
  type: [/^tipus$/i, /^tipo$/i, /^type$/i],
  order: [/^ordre$/i, /^orden$/i, /^order$/i],
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
    name: -1,
    type: -1,
    order: -1,
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

function getCellValue(row: unknown[], idx: number): string | null {
  if (idx < 0 || idx >= row.length) return null;
  const val = row[idx];
  if (val === null || val === undefined) return null;
  const str = String(val).trim();
  return str || null;
}

/**
 * Normalitza el nom per crear la clau (com fa el CategoryManager)
 */
export function normalizeNameKey(name: string): string {
  return name.trim().replace(/\s+/g, '-').toLowerCase();
}

/**
 * Parseja i valida un tipus de categoria
 */
function parseType(value: string | null): 'income' | 'expense' | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  switch (normalized) {
    case 'income':
    case 'ingrés':
    case 'ingres':
    case 'ingreso':
    case 'ingressos':
      return 'income';
    case 'expense':
    case 'despesa':
    case 'gasto':
    case 'despeses':
    case 'gastos':
      return 'expense';
    default:
      return null;
  }
}

/**
 * Parseja un valor d'ordre
 * Accepta: "10", "10.0", "10,0", 10
 * Retorna null si no és vàlid o buit
 */
function parseOrder(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;

  // Si ja és número
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.round(value) : null;
  }

  // Si és string
  const str = String(value).trim();
  if (!str) return null;

  // Acceptar format amb coma decimal
  const normalized = str.replace(',', '.');
  const num = parseFloat(normalized);

  if (Number.isNaN(num) || !Number.isFinite(num)) return null;

  return Math.round(num);
}

// ═══════════════════════════════════════════════════════════════════════════
// LECTURA D'EXCEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Llegeix un fitxer Excel i retorna les files parsejades
 */
export function readCategoriesExcel(data: ArrayBuffer): {
  rows: ParsedCategoryRow[];
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const rows: ParsedCategoryRow[] = [];

  // Llegir workbook
  const wb = XLSX.read(data, { type: 'array' });

  // Obtenir primera sheet
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    errors.push('El fitxer no conté cap full.');
    return { rows, warnings, errors };
  }

  const sheet = wb.Sheets[sheetName];
  const rawData = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
  });

  if (rawData.length < 2) {
    errors.push('El fitxer no conté files de dades (només capçalera o buit).');
    return { rows, warnings, errors };
  }

  // Detectar capçaleres (primera fila)
  const headers = (rawData[0] as unknown[]).map(h => String(h || '').trim());
  const mapping = detectColumnMapping(headers);

  // Validar columnes obligatòries
  if (mapping.name === -1) {
    errors.push('No s\'ha trobat la columna "Nom". És obligatòria.');
    return { rows, warnings, errors };
  }

  if (mapping.type === -1) {
    errors.push('No s\'ha trobat la columna "Tipus". És obligatòria.');
    return { rows, warnings, errors };
  }

  // Info sobre columna ordre
  if (mapping.order === -1) {
    warnings.push('No s\'ha trobat la columna "Ordre". Les categories es crearan sense ordre específic.');
  }

  // Parsejar files (saltant capçalera)
  for (let i = 1; i < rawData.length; i++) {
    const row = rawData[i] as unknown[];
    if (!row || row.every(c => c === null || c === undefined || String(c).trim() === '')) {
      continue; // Saltar files buides
    }

    // Nom
    const name = getCellValue(row, mapping.name);
    if (!name) {
      errors.push(`Fila ${i + 1}: El nom és obligatori.`);
      continue;
    }

    // Tipus
    const typeRaw = getCellValue(row, mapping.type);
    const type = parseType(typeRaw);

    if (!type) {
      errors.push(`Fila ${i + 1}: Tipus invàlid "${typeRaw}". Valors vàlids: income, expense.`);
      continue;
    }

    // Ordre (opcional)
    let order: number | null = null;
    if (mapping.order >= 0) {
      const orderRaw = row[mapping.order];
      if (orderRaw !== null && orderRaw !== undefined && orderRaw !== '') {
        order = parseOrder(orderRaw);
        if (order === null) {
          warnings.push(`Fila ${i + 1}: Ordre invàlid "${orderRaw}", s'ignorarà.`);
        }
      }
    }

    rows.push({
      rowIndex: i + 1,
      name,
      nameKey: normalizeNameKey(name),
      type,
      order,
    });
  }

  return { rows, warnings, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHING AMB EXISTENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el preview de la importació comparant amb categories existents
 *
 * REGLA: Match per (type, name normalitzat)
 * - Si existeix i updateExisting=false → SKIP
 * - Si existeix i updateExisting=true → UPDATE si order canvia
 * - Si no existeix → CREATE
 *
 * @param parsedRows - Files parsejades del fitxer
 * @param existingCategories - Categories existents
 * @param updateExisting - Si true, actualitza categories existents
 */
export function generateCategoryImportPreview(
  parsedRows: ParsedCategoryRow[],
  existingCategories: Category[],
  updateExisting: boolean = false
): CategoryImportResult {
  const previews: CategoryImportPreview[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Crear índex per (type, name normalitzat)
  // Usem el nom existent normalitzat (que ja és nameKey al DB)
  const categoryIndex = new Map<string, Category>();
  for (const cat of existingCategories) {
    const key = `${cat.type}:${cat.name.toLowerCase()}`;
    categoryIndex.set(key, cat);
  }

  // Categories processades en aquest import (per detectar duplicats)
  const processedKeys = new Set<string>();

  // Processar cada fila
  for (const parsed of parsedRows) {
    const matchKey = `${parsed.type}:${parsed.nameKey}`;

    // Duplicat dins l'Excel?
    if (processedKeys.has(matchKey)) {
      previews.push({
        rowIndex: parsed.rowIndex,
        action: 'skip',
        reason: 'Duplicat dins el fitxer',
        parsed,
      });
      continue;
    }

    processedKeys.add(matchKey);

    // Buscar per clau composta
    const existing = categoryIndex.get(matchKey);

    if (existing) {
      if (!updateExisting) {
        // Mode només crear nous
        previews.push({
          rowIndex: parsed.rowIndex,
          action: 'skip',
          reason: 'Ja existeix',
          existingId: existing.id,
          existingOrder: existing.order ?? null,
          parsed,
        });
      } else {
        // Mode actualitzar existents - mirar si hi ha canvis
        const changes: string[] = [];

        // Comprovar si order canvia
        const existingOrder = existing.order ?? null;
        const newOrder = parsed.order;

        if (newOrder !== null && newOrder !== existingOrder) {
          if (existingOrder !== null) {
            changes.push(`Ordre: ${existingOrder} → ${newOrder}`);
          } else {
            changes.push(`Ordre: (buit) → ${newOrder}`);
          }
        }

        if (changes.length === 0) {
          previews.push({
            rowIndex: parsed.rowIndex,
            action: 'skip',
            reason: 'Sense canvis',
            existingId: existing.id,
            existingOrder,
            parsed,
          });
        } else {
          previews.push({
            rowIndex: parsed.rowIndex,
            action: 'update',
            existingId: existing.id,
            existingOrder,
            parsed,
            changes,
          });
        }
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

  return { previews, summary, warnings, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREPARACIÓ DE DADES PER FIRESTORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prepara les dades d'una categoria per crear a Firestore
 * Mai escriu undefined
 *
 * IMPORTANT: Usem parsed.name (original amb espais), NO nameKey (guions)
 * El nameKey només és per matching intern
 *
 * NO fem toLowerCase() perquè degradaria noms propis:
 * "Quotes socis - Barcelona" ha de quedar "Quotes socis - Barcelona"
 */
export function prepareCategoryCreateData(
  parsed: ParsedCategoryRow
): {
  name: string;
  type: 'income' | 'expense';
  order?: number;
} {
  // Només trim, conservant majúscules/minúscules originals
  const data: {
    name: string;
    type: 'income' | 'expense';
    order?: number;
  } = {
    name: parsed.name.trim(),
    type: parsed.type,
  };

  // Només afegir order si té valor
  if (parsed.order !== null) {
    data.order = parsed.order;
  }

  return data;
}

/**
 * Prepara les dades d'una categoria per actualitzar a Firestore
 * Només actualitza order (name i type són immutables per matching)
 * Mai escriu undefined
 */
export function prepareCategoryUpdateData(
  parsed: ParsedCategoryRow,
  existingOrder: number | null | undefined
): {
  order?: number;
  updatedAt: string;
} {
  const data: {
    order?: number;
    updatedAt: string;
  } = {
    updatedAt: new Date().toISOString(),
  };

  // Actualitzar order si ve a l'Excel
  if (parsed.order !== null) {
    data.order = parsed.order;
  } else if (existingOrder !== undefined && existingOrder !== null) {
    // Mantenir l'ordre existent si no ve nou
    data.order = existingOrder;
  }

  return data;
}
