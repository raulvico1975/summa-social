/**
 * Bank Accounts Import Utilities
 *
 * Importació Excel de comptes bancaris amb:
 * - Matching per IBAN normalitzat únicament
 * - Validació i normalització de dades
 * - Validació de regla "només 1 isDefault"
 * - Preview abans d'aplicar canvis
 */

import * as XLSX from 'xlsx';
import type { BankAccount } from '@/lib/data';
import { normalizeIBAN } from '@/lib/normalize';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila parsejada del fitxer Excel
 */
export interface ParsedBankAccountRow {
  rowIndex: number;           // Fila original (1-indexed per mostrar)
  name: string;
  iban: string | null;        // IBAN normalitzat
  bankName: string | null;
  isDefault: boolean | null;  // null = no especificat
  isActive: boolean | null;   // null = no especificat (default true)
}

/**
 * Resultat del matching amb comptes existents
 */
export interface BankAccountImportPreview {
  rowIndex: number;
  action: 'create' | 'update' | 'skip';
  reason?: string;            // Motiu del skip o error
  existingId?: string;        // ID del compte existent (si update)
  parsed: ParsedBankAccountRow;
  changes?: string[];         // Camps que canviaran (només per update)
}

/**
 * Resultat complet de la importació (preview)
 */
export interface BankAccountImportResult {
  previews: BankAccountImportPreview[];
  summary: {
    total: number;
    toCreate: number;
    toUpdate: number;
    toSkip: number;
  };
  warnings: string[];
  errors: string[];           // Errors bloquejants
  finalDefaultInfo: string;   // Info sobre quin serà el default final
}

// ═══════════════════════════════════════════════════════════════════════════
// DETECCIÓ DE COLUMNES
// ═══════════════════════════════════════════════════════════════════════════

interface ColumnMapping {
  name: number;
  iban: number;
  bankName: number;
  isDefault: number;
  isActive: number;
}

const COLUMN_PATTERNS: Record<keyof ColumnMapping, RegExp[]> = {
  name: [/^nom$/i, /^nombre$/i, /^name$/i, /^compte$/i, /^cuenta$/i],
  iban: [/^iban$/i],
  bankName: [/^banc$/i, /^banco$/i, /^bank$/i, /^entitat$/i, /^entidad$/i],
  isDefault: [/^per\s*defecte$/i, /^por\s*defecto$/i, /^default$/i, /^predeterminat$/i],
  isActive: [/^actiu$/i, /^activo$/i, /^active$/i, /^estat$/i, /^estado$/i],
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
    iban: -1,
    bankName: -1,
    isDefault: -1,
    isActive: -1,
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
 * Parseja un valor booleà des d'Excel
 * Accepta: Sí, Si, Yes, 1, true, No, 0, false
 */
function parseBoolean(value: unknown): boolean | null {
  if (value === null || value === undefined) return null;

  // Si ja és booleà
  if (typeof value === 'boolean') return value;

  // Si és número
  if (typeof value === 'number') return value !== 0;

  const str = String(value).trim().toLowerCase();
  if (!str) return null;

  // Valors afirmatius
  if (['sí', 'si', 'yes', '1', 'true', 'x'].includes(str)) return true;

  // Valors negatius
  if (['no', '0', 'false', '-'].includes(str)) return false;

  return null;
}

/**
 * Valida un IBAN (format bàsic)
 * No fa validació MOD97, només format
 */
function isValidIbanFormat(iban: string): boolean {
  // IBAN espanyol: ES + 22 dígits = 24 caràcters
  // Altres països poden tenir longitud diferent (15-34)
  const clean = iban.replace(/\s/g, '').toUpperCase();
  if (clean.length < 15 || clean.length > 34) return false;
  // Primer 2 chars són lletres (país), després números
  if (!/^[A-Z]{2}[0-9A-Z]+$/.test(clean)) return false;
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════
// LECTURA D'EXCEL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Llegeix un fitxer Excel i retorna les files parsejades
 */
export function readBankAccountsExcel(data: ArrayBuffer): {
  rows: ParsedBankAccountRow[];
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  const rows: ParsedBankAccountRow[] = [];

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

  // Validar columna obligatòria
  if (mapping.name === -1) {
    errors.push('No s\'ha trobat la columna "Nom". És obligatòria.');
    return { rows, warnings, errors };
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

    // IBAN
    const ibanRaw = getCellValue(row, mapping.iban);
    let iban: string | null = null;
    if (ibanRaw) {
      const normalizedIban = normalizeIBAN(ibanRaw);
      if (normalizedIban && !isValidIbanFormat(normalizedIban)) {
        errors.push(`Fila ${i + 1}: IBAN invàlid "${ibanRaw}".`);
        continue;
      }
      iban = normalizedIban || null;
    }

    // Nom del banc
    const bankName = getCellValue(row, mapping.bankName);

    // isDefault
    const isDefaultRaw = mapping.isDefault >= 0 ? row[mapping.isDefault] : null;
    const isDefault = parseBoolean(isDefaultRaw);

    // isActive
    const isActiveRaw = mapping.isActive >= 0 ? row[mapping.isActive] : null;
    const isActive = parseBoolean(isActiveRaw);

    rows.push({
      rowIndex: i + 1,
      name,
      iban,
      bankName,
      isDefault,
      isActive,
    });
  }

  return { rows, warnings, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
// MATCHING AMB EXISTENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera el preview de la importació comparant amb comptes existents
 *
 * REGLA: Match NOMÉS per IBAN normalitzat
 * - Si té IBAN i coincideix → UPDATE
 * - Si té IBAN i no coincideix → CREATE
 * - Si no té IBAN → CREATE (i advertir)
 *
 * REGLA ESPECIAL: Només 1 isDefault === true
 * - Si l'Excel en porta >1 → error bloquejant
 * - Si no en porta cap i no n'hi ha → primer importat serà default
 */
export function generateImportPreview(
  parsedRows: ParsedBankAccountRow[],
  existingAccounts: BankAccount[]
): BankAccountImportResult {
  const previews: BankAccountImportPreview[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Crear índex per IBAN (case insensitive, normalitzat)
  const accountsByIban = new Map<string, BankAccount>();
  for (const acc of existingAccounts) {
    if (acc.iban) {
      accountsByIban.set(acc.iban.toLowerCase(), acc);
    }
  }

  // Comptar quants isDefault=true vénen a l'Excel
  const defaultsInExcel = parsedRows.filter(r => r.isDefault === true);
  if (defaultsInExcel.length > 1) {
    errors.push(`L'Excel conté ${defaultsInExcel.length} comptes marcats com a "Per defecte". Només en pot haver 1.`);
    return {
      previews: [],
      summary: { total: 0, toCreate: 0, toUpdate: 0, toSkip: 0 },
      warnings,
      errors,
      finalDefaultInfo: '',
    };
  }

  // Detectar default existent
  const existingDefault = existingAccounts.find(acc => acc.isDefault === true);

  // Processar cada fila
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

    // Advertir si no té IBAN
    if (!parsed.iban) {
      warnings.push(`Fila ${parsed.rowIndex}: El compte "${parsed.name}" no té IBAN, es crearà com a nou.`);
    }

    // Buscar per IBAN (únic criteri de matching)
    let existing: BankAccount | undefined;

    if (parsed.iban) {
      existing = accountsByIban.get(parsed.iban.toLowerCase());
    }

    if (existing) {
      // UPDATE: detectar quins camps canvien
      const changes: string[] = [];

      if (parsed.name !== existing.name) changes.push('Nom');
      if ((parsed.bankName || null) !== (existing.bankName || null)) changes.push('Banc');
      // isDefault i isActive es gestionen a part

      if (changes.length === 0 && parsed.isDefault === null && parsed.isActive === null) {
        previews.push({
          rowIndex: parsed.rowIndex,
          action: 'skip',
          reason: 'Sense canvis',
          existingId: existing.id,
          parsed,
        });
      } else {
        if (parsed.isDefault === true && !existing.isDefault) changes.push('Per defecte');
        if (parsed.isActive !== null && parsed.isActive !== existing.isActive) changes.push('Actiu');

        previews.push({
          rowIndex: parsed.rowIndex,
          action: 'update',
          existingId: existing.id,
          parsed,
          changes: changes.length > 0 ? changes : ['Sense canvis visibles'],
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

  // Determinar quin serà el default final
  let finalDefaultInfo = '';
  const hasDefaultInImport = defaultsInExcel.length === 1;
  const willCreateAny = summary.toCreate > 0;
  const noExistingDefault = !existingDefault;
  const noExistingAccounts = existingAccounts.length === 0;

  if (hasDefaultInImport) {
    const defaultRow = defaultsInExcel[0];
    finalDefaultInfo = `El compte "${defaultRow.name}" (fila ${defaultRow.rowIndex}) serà el compte per defecte.`;
  } else if (noExistingAccounts && willCreateAny) {
    // Si no hi ha cap compte i es crearan nous, el primer serà default
    const firstCreate = previews.find(p => p.action === 'create');
    if (firstCreate) {
      finalDefaultInfo = `El compte "${firstCreate.parsed.name}" (fila ${firstCreate.parsed.rowIndex}) es marcarà com a per defecte (primer compte creat).`;
    }
  } else if (existingDefault) {
    finalDefaultInfo = `El compte per defecte actual "${existingDefault.name}" es mantindrà.`;
  } else if (noExistingDefault && !hasDefaultInImport && willCreateAny) {
    // No hi ha default i no en ve cap, el primer creat serà default
    const firstCreate = previews.find(p => p.action === 'create');
    if (firstCreate) {
      finalDefaultInfo = `El compte "${firstCreate.parsed.name}" (fila ${firstCreate.parsed.rowIndex}) es marcarà com a per defecte (no n'hi havia cap).`;
    }
  }

  return { previews, summary, warnings, errors, finalDefaultInfo };
}

// ═══════════════════════════════════════════════════════════════════════════
// PREPARACIÓ DE DADES PER FIRESTORE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Prepara les dades d'un compte bancari per crear a Firestore
 */
export function prepareBankAccountCreateData(
  parsed: ParsedBankAccountRow,
  makeDefault: boolean
): {
  name: string;
  iban: string | null;
  bankName: string | null;
  isDefault: boolean;
} {
  return {
    name: parsed.name,
    iban: parsed.iban || null,
    bankName: parsed.bankName || null,
    isDefault: parsed.isDefault === true || makeDefault,
  };
}

/**
 * Prepara les dades d'un compte bancari per actualitzar a Firestore
 */
export function prepareBankAccountUpdateData(
  parsed: ParsedBankAccountRow
): {
  name: string;
  iban: string | null;
  bankName: string | null;
  isActive?: boolean;
} {
  const data: {
    name: string;
    iban: string | null;
    bankName: string | null;
    isActive?: boolean;
  } = {
    name: parsed.name,
    iban: parsed.iban || null,
    bankName: parsed.bankName || null,
  };

  // Només incloure isActive si s'ha especificat
  if (parsed.isActive !== null) {
    data.isActive = parsed.isActive;
  }

  return data;
}
