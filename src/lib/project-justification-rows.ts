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
 * Padding del número d'ordre a 3 dígits mínim (001, 002, ..., 999, 1000, ...)
 */
function padOrderNumber(order: number): string {
  return order.toString().padStart(3, '0');
}

/**
 * Generar nom de document estandarditzat AMB prefix d'ordre.
 * Format: {order}_{YYYY.MM.DD}_{counterparty}_{amount}EUR_{concept}.{ext}
 *
 * IMPORTANT: El prefix d'ordre és la CLAU MESTRA per traçabilitat:
 * - Línia 7 de l'Excel → fitxer 007_...pdf
 * - Sense buscar, sense interpretar, sense errors humans.
 */
function generateDocumentNameWithOrder(
  order: number,
  expense: UnifiedExpense,
  assignmentAmount: number
): string {
  const orderPart = padOrderNumber(order);
  const datePart = formatDateForFilename(expense.date);
  const counterparty = sanitizeForFilename(truncate(expense.counterpartyName ?? 'Sense', 20));
  const amount = formatAmountForFilename(assignmentAmount);
  const concept = sanitizeForFilename(truncate(expense.description ?? '', 30));

  // Si tenim attachments amb nom, usar l'extensió del primer attachment
  const attachment = expense.attachments?.[0];
  let ext = '.pdf'; // default
  if (attachment?.name) {
    const lastDot = attachment.name.lastIndexOf('.');
    if (lastDot > 0) {
      ext = attachment.name.slice(lastDot);
    }
  }

  return `${orderPart}_${datePart}_${counterparty}_${amount}EUR_${concept}${ext}`;
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
  // NOTA: No generem documentName encara - ho farem després d'ordenar i assignar ordre
  interface PreRow {
    txId: string;
    expense: UnifiedExpense;
    budgetLineCode: string;
    budgetLineName: string;
    budgetLineId: string | null;
    amountAssignedEUR: number;
  }

  const preRows: PreRow[] = [];

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

      preRows.push({
        txId: link.id,
        expense,
        budgetLineCode,
        budgetLineName,
        budgetLineId: assignment.budgetLineId ?? null,
        amountAssignedEUR: Math.abs(assignment.amountEUR),
      });
    }
  }

  // 2. Ordenar amb la regla fixa: budgetLineCode (asc) → date (asc) → txId (asc)
  // AQUEST ORDRE ÉS DEFINITIU I NO NEGOCIABLE
  preRows.sort((a, b) => {
    // Primer: budgetLineCode alfabèticament
    const codeCompare = a.budgetLineCode.localeCompare(b.budgetLineCode);
    if (codeCompare !== 0) return codeCompare;

    // Segon: data de despesa
    const dateCompare = a.expense.date.localeCompare(b.expense.date);
    if (dateCompare !== 0) return dateCompare;

    // Tercer: txId com a desempat estable
    return a.txId.localeCompare(b.txId);
  });

  // 3. Assignar ordre (1..N) i generar noms amb prefix d'ordre
  // IMPORTANT: L'ordre és la CLAU MESTRA per traçabilitat Excel ↔ ZIP ↔ manifest
  const finalRows: JustificationRow[] = preRows.map((preRow, index) => {
    const order = index + 1;
    const { expense, budgetLineCode, budgetLineName, budgetLineId, amountAssignedEUR, txId } = preRow;

    // Generar nom del document AMB prefix d'ordre
    const documentName = generateDocumentNameWithOrder(order, expense, amountAssignedEUR);

    // Generar nom de carpeta de partida
    const budgetFolderName = generateBudgetFolderName(
      budgetLineId ? budgetLineMap.get(budgetLineId) ?? null : null
    );

    // ZIP paths:
    // - 01_per_partida: subcarpeta per partida
    // - 02_cronologic: CARPETA PLANA (sense subcarpetes per mes!)
    //   L'ordre el dona el prefix numèric del nom de fitxer.
    return {
      order,
      txId,
      dateExpense: expense.date,
      paymentDate: expense.paymentDate ?? null,
      counterpartyName: expense.counterpartyName ?? '',
      concept: expense.description ?? '',
      budgetLineCode,
      budgetLineName,
      budgetLineId,
      amountTotalEUR: expense.amountEUR !== 0 ? Math.abs(expense.amountEUR) : null,
      amountAssignedEUR,
      documentName,
      documentUrl: expense.documentUrl ?? expense.attachments?.[0]?.url ?? null,
      source: expense.source,
      categoryName: expense.categoryName,
      // Paths dins del ZIP
      zipPathPerPartida: `01_per_partida/${budgetFolderName}/${documentName}`,
      zipPathCronologic: `02_cronologic/${documentName}`,
    };
  });

  return finalRows;
}

// NOTA: resolveFilenameCollision ja no és necessària perquè cada fitxer
// té un prefix d'ordre únic (001_, 002_, ...) que garanteix unicitat.
