// src/lib/project-justification-rows.ts
// Unifica l'ordenació i estructura de files de justificació per Excel, ZIP i manifest.csv

import type { BudgetLine, ExpenseLink, UnifiedExpense } from '@/lib/project-module-types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fila de justificació unificada.
 * Single source of truth per Excel, ZIP i manifest.csv.
 */
export interface JustificationRow {
  /** Número d'ordre (1..N), assignat després d'ordenar */
  order: number;

  /** ID de la transacció (bank: txId, offBank: "off_" + expenseId) */
  txId: string;

  /** Data de la despesa (YYYY-MM-DD) */
  dateExpense: string;

  /** Data de pagament opcional (YYYY-MM-DD) */
  paymentDate: string | null;

  /** Nom del proveïdor/destinatari */
  counterpartyName: string;

  /** Concepte de la despesa */
  concept: string;

  /** Codi de la partida (per ordenació) */
  budgetLineCode: string;

  /** Nom de la partida */
  budgetLineName: string;

  /** ID de la partida (per lookups) */
  budgetLineId: string | null;

  /** Import total de la despesa en EUR (null si no disponible) */
  amountTotalEUR: number | null;

  /** Import assignat a aquesta partida en EUR */
  amountAssignedEUR: number;

  /** Nom del document (per Excel i ZIP) */
  documentName: string;

  /** Ruta dins del ZIP per carpeta cronològica */
  zipPathCronologic: string;

  /** Ruta dins del ZIP per carpeta de partida */
  zipPathPerPartida: string;

  /** URL del document original (per download) */
  documentUrl: string | null;

  /** Font de la despesa */
  source: 'bank' | 'offBank';

  /** Categoria de la despesa */
  categoryName: string | null;
}

export interface BuildJustificationRowsParams {
  projectId: string;
  projectCode: string;
  budgetLines: BudgetLine[];
  expenseLinks: ExpenseLink[];
  expenses: Map<string, UnifiedExpense>;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Parsejar data en formats diversos i retornar parts
 */
function parseDate(dateStr: string): { year: string; month: string; day: string } | null {
  // YYYY-MM-DD
  let match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return { year: match[1], month: match[2], day: match[3] };
  }

  // DD.MM.YYYY
  match = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) {
    return { year: match[3], month: match[2], day: match[1] };
  }

  // DD/MM/YYYY
  match = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (match) {
    return { year: match[3], month: match[2], day: match[1] };
  }

  return null;
}

/**
 * Format YYYY.MM.DD per nom de fitxer
 */
function formatDateForFilename(dateStr: string): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '0000.00.00';
  return `${parsed.year}.${parsed.month}.${parsed.day}`;
}

/**
 * Sanititzar text per nom de fitxer (treure caràcters no vàlids)
 */
function sanitizeForFilename(text: string): string {
  return text
    .replace(/[<>:"/\\|?*]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncar text a un màxim de caràcters
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim();
}

/**
 * Format import amb 2 decimals i coma
 */
function formatAmountForFilename(amount: number): string {
  return Math.abs(amount).toFixed(2).replace('.', ',');
}

/**
 * Generar nom de carpeta de partida
 */
function generateBudgetFolderName(budgetLine: BudgetLine | null): string {
  if (!budgetLine) return 'ZZ_NO_PARTIDA';
  const code = sanitizeForFilename(budgetLine.code ?? 'XX');
  const name = sanitizeForFilename(truncate(budgetLine.name, 30));
  return `${code}_${name}`;
}

/**
 * Generar nom de document estandarditzat.
 * Format: YYYY.MM.DD_{counterparty}_{amount}EUR_{concept}_{txId}[{budgetCode}].{ext}
 */
function generateDocumentName(
  expense: UnifiedExpense,
  assignmentAmount: number,
  budgetCode: string
): string {
  const datePart = formatDateForFilename(expense.date);
  const counterparty = sanitizeForFilename(truncate(expense.counterpartyName ?? 'Sense', 20));
  const amount = formatAmountForFilename(assignmentAmount);
  const concept = sanitizeForFilename(truncate(expense.description ?? '', 30));
  const txIdShort = expense.txId.slice(0, 12);

  // Si tenim attachments amb nom, usar l'extensió del primer attachment
  const attachment = expense.attachments?.[0];
  let ext = '.pdf'; // default
  if (attachment?.name) {
    const lastDot = attachment.name.lastIndexOf('.');
    if (lastDot > 0) {
      ext = attachment.name.slice(lastDot);
    }
  }

  return `${datePart}_${counterparty}_${amount}EUR_${concept}_${txIdShort}[${budgetCode}]${ext}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Construeix i ordena les files de justificació.
 * Regla d'ordenació: budgetLineCode (asc) → expense.date (asc) → txId (asc)
 *
 * Aquesta funció és el SINGLE SOURCE OF TRUTH per:
 * - Excel de justificació
 * - ZIP de comprovants
 * - manifest.csv
 */
export function buildJustificationRows(params: BuildJustificationRowsParams): JustificationRow[] {
  const { projectId, budgetLines, expenseLinks, expenses } = params;

  // Mapa de budgetLineId -> BudgetLine per lookup ràpid
  const budgetLineMap = new Map(budgetLines.map((bl) => [bl.id, bl]));

  // 1. Construir llista de files (una per cada assignment del projecte)
  const rows: Omit<JustificationRow, 'order' | 'zipPathCronologic' | 'zipPathPerPartida'>[] = [];

  for (const link of expenseLinks) {
    const expense = expenses.get(link.id);
    if (!expense) continue;

    // Filtrar només assignacions d'aquest projecte
    for (const assignment of link.assignments) {
      if (assignment.projectId !== projectId) continue;

      const budgetLine = assignment.budgetLineId
        ? budgetLineMap.get(assignment.budgetLineId) ?? null
        : null;

      const budgetLineCode = budgetLine?.code ?? 'ZZ_NO_PARTIDA';
      const budgetLineName = budgetLine?.name ?? '(sense partida)';

      // Generar nom del document
      const documentName = generateDocumentName(
        expense,
        Math.abs(assignment.amountEUR),
        budgetLineCode
      );

      rows.push({
        txId: link.id,
        dateExpense: expense.date,
        paymentDate: expense.paymentDate ?? null,
        counterpartyName: expense.counterpartyName ?? '',
        concept: expense.description ?? '',
        budgetLineCode,
        budgetLineName,
        budgetLineId: assignment.budgetLineId ?? null,
        amountTotalEUR: expense.amountEUR !== 0 ? Math.abs(expense.amountEUR) : null,
        amountAssignedEUR: Math.abs(assignment.amountEUR),
        documentName,
        documentUrl: expense.documentUrl ?? expense.attachments?.[0]?.url ?? null,
        source: expense.source,
        categoryName: expense.categoryName,
      });
    }
  }

  // 2. Ordenar amb la regla fixa: budgetLineCode (asc) → date (asc) → txId (asc)
  rows.sort((a, b) => {
    // Primer: budgetLineCode alfabèticament
    const codeCompare = a.budgetLineCode.localeCompare(b.budgetLineCode);
    if (codeCompare !== 0) return codeCompare;

    // Segon: data de despesa
    const dateCompare = a.dateExpense.localeCompare(b.dateExpense);
    if (dateCompare !== 0) return dateCompare;

    // Tercer: txId com a desempat
    return a.txId.localeCompare(b.txId);
  });

  // 3. Assignar ordre i generar paths
  // Tracking de noms usats per evitar col·lisions
  const usedNamesPerPartida = new Map<string, Set<string>>();
  const usedNamesCronologic = new Set<string>();

  const finalRows: JustificationRow[] = rows.map((row, index) => {
    const order = index + 1;
    const budgetFolderName = generateBudgetFolderName(
      row.budgetLineId ? budgetLineMap.get(row.budgetLineId) ?? null : null
    );

    // Resoldre col·lisions per partida
    if (!usedNamesPerPartida.has(budgetFolderName)) {
      usedNamesPerPartida.set(budgetFolderName, new Set());
    }
    const partidaNames = usedNamesPerPartida.get(budgetFolderName)!;
    const filenamePartida = resolveFilenameCollision(row.documentName, partidaNames);
    partidaNames.add(filenamePartida);

    // Resoldre col·lisions per cronològic
    const filenameCronologic = resolveFilenameCollision(row.documentName, usedNamesCronologic);
    usedNamesCronologic.add(filenameCronologic);

    return {
      ...row,
      order,
      zipPathPerPartida: `01_per_partida/${budgetFolderName}/${filenamePartida}`,
      zipPathCronologic: `02_cronologic/${filenameCronologic}`,
    };
  });

  return finalRows;
}

/**
 * Afegir sufix de col·lisió a un nom de fitxer si ja existeix.
 * Ex: "2025.12.25_taxi.pdf" → "2025.12.25_taxi__2.pdf"
 */
function resolveFilenameCollision(filename: string, usedNames: Set<string>): string {
  if (!usedNames.has(filename)) {
    return filename;
  }

  // Separar nom base i extensió
  const lastDot = filename.lastIndexOf('.');
  const hasExtension = lastDot > 0;
  const baseName = hasExtension ? filename.slice(0, lastDot) : filename;
  const ext = hasExtension ? filename.slice(lastDot) : '';

  // Buscar sufix lliure
  let counter = 2;
  let newFilename = `${baseName}__${counter}${ext}`;
  while (usedNames.has(newFilename)) {
    counter++;
    newFilename = `${baseName}__${counter}${ext}`;
  }

  return newFilename;
}
