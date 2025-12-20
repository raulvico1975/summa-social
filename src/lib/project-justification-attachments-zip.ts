// src/lib/project-justification-attachments-zip.ts
// Exportació ZIP de comprovants de justificació de projecte

import JSZip from 'jszip';
import type { UnifiedExpense, ExpenseLink, BudgetLine } from '@/lib/project-module-types';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface ExportParams {
  organizationId: string;
  organizationName: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  allowedDeviationPct: number;

  budgetLines: BudgetLine[];
  expenses: UnifiedExpense[];
  expenseLinks: ExpenseLink[];
}

type DocStatus = 'OK' | 'MISSING' | 'MISSING_OFFBANK' | 'NO_EXPENSE_IN_FEED' | 'FETCH_ERROR';

interface ManifestEntry {
  order: number;
  date: string;
  source: 'bank' | 'offBank';
  projectCode: string;
  projectName: string;
  budgetCode: string;
  budgetName: string;
  amountAssignedEUR: number;
  category: string;
  counterparty: string;
  description: string;
  txId: string;
  docStatus: DocStatus;
  docPathPerPartida: string;
  docPathCronologic: string;
  documentUrl: string;
}

interface ProcessedEntry {
  expense: UnifiedExpense;
  assignment: {
    projectId: string;
    projectName: string;
    amountEUR: number;
    budgetLineId?: string | null;
    budgetLineName?: string | null;
  };
  budgetLine: BudgetLine | null;
  link: ExpenseLink;
}

interface ProgressCallback {
  (current: number, total: number): void;
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
 * Format YYYY.MM per carpeta cronològica
 */
function formatDateForFolder(dateStr: string): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '0000.00';
  return `${parsed.year}.${parsed.month}`;
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
 * Obtenir extensió des de Content-Type
 */
function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return '.bin';

  const ct = contentType.toLowerCase();
  if (ct.includes('application/pdf')) return '.pdf';
  if (ct.includes('image/jpeg')) return '.jpg';
  if (ct.includes('image/png')) return '.png';
  if (ct.includes('image/gif')) return '.gif';
  if (ct.includes('image/webp')) return '.webp';
  if (ct.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) return '.xlsx';
  if (ct.includes('application/vnd.ms-excel')) return '.xls';
  if (ct.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document')) return '.docx';
  if (ct.includes('application/msword')) return '.doc';
  if (ct.includes('text/plain')) return '.txt';
  if (ct.includes('text/csv')) return '.csv';

  return '.bin';
}

/**
 * Format import amb 2 decimals
 */
function formatAmountForFilename(amount: number): string {
  return Math.abs(amount).toFixed(2).replace('.', ',');
}

/**
 * Generar nom de fitxer segons especificació
 * YYYY.MM.DD - {OrigenDestinatari|Sense} - {ImportAbs}EUR - {ConcepteCurt} - {txId} [{budgetCodeOrNO_PARTIDA}].{ext}
 */
function generateFilename(
  expense: UnifiedExpense,
  assignmentAmount: number,
  budgetCode: string,
  ext: string
): string {
  const datePart = formatDateForFilename(expense.date);
  const counterparty = sanitizeForFilename(expense.counterpartyName ?? 'Sense');
  const amount = formatAmountForFilename(assignmentAmount);
  const concept = sanitizeForFilename(truncate(expense.description ?? '', 50));
  const txIdShort = expense.txId.slice(0, 16); // Truncar txId si és molt llarg

  const filename = `${datePart} - ${counterparty} - ${amount}EUR - ${concept} - ${txIdShort} [${budgetCode}]${ext}`;

  return sanitizeForFilename(filename);
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
 * Generar CSV del manifest
 */
function generateManifestCsv(entries: ManifestEntry[]): string {
  const headers = [
    'order',
    'date',
    'source',
    'projectCode',
    'projectName',
    'budgetCode',
    'budgetName',
    'amountAssignedEUR',
    'category',
    'counterparty',
    'description',
    'txId',
    'docStatus',
    'docPathPerPartida',
    'docPathCronologic',
    'documentUrl',
  ];

  const escapeField = (field: string | number): string => {
    const str = String(field);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = entries.map((e) => [
    e.order,
    e.date,
    e.source,
    e.projectCode,
    e.projectName,
    e.budgetCode,
    e.budgetName,
    e.amountAssignedEUR.toFixed(2),
    e.category,
    e.counterparty,
    e.description,
    e.txId,
    e.docStatus,
    e.docPathPerPartida,
    e.docPathCronologic,
    e.documentUrl,
  ].map(escapeField).join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export interface ExportZipResult {
  entriesCount: number;
  okCount: number;
  missingCount: number;
  fetchErrorCount: number;
}

export async function exportProjectJustificationZip(
  params: ExportParams,
  onProgress?: ProgressCallback
): Promise<ExportZipResult> {
  const {
    projectId,
    projectCode,
    projectName,
    budgetLines,
    expenses,
    expenseLinks,
  } = params;

  // Mapa de budgetLineId -> BudgetLine
  const budgetLineMap = new Map(budgetLines.map((bl) => [bl.id, bl]));

  // Mapa de txId -> UnifiedExpense
  const expenseMap = new Map(expenses.map((e) => [e.txId, e]));

  // 1. Construir llista d'entries (una per cada assignment del projecte)
  const processedEntries: ProcessedEntry[] = [];

  for (const link of expenseLinks) {
    const expense = expenseMap.get(link.id);

    for (const assignment of link.assignments) {
      if (assignment.projectId !== projectId) continue;

      const budgetLine = assignment.budgetLineId
        ? budgetLineMap.get(assignment.budgetLineId) ?? null
        : null;

      processedEntries.push({
        expense: expense!, // pot ser undefined, ho gestionem després
        assignment,
        budgetLine,
        link,
      });
    }
  }

  // 2. Ordenar: primer per partida (ordre), després per data
  processedEntries.sort((a, b) => {
    // Primer per partida (ordre o nom)
    const orderA = a.budgetLine?.order ?? 9999;
    const orderB = b.budgetLine?.order ?? 9999;
    if (orderA !== orderB) return orderA - orderB;

    // Després per data
    const dateA = a.expense?.date ?? '9999-99-99';
    const dateB = b.expense?.date ?? '9999-99-99';
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    // Finalment per txId
    const txIdA = a.link.id;
    const txIdB = b.link.id;
    return txIdA.localeCompare(txIdB);
  });

  // 3. Crear ZIP
  const zip = new JSZip();
  const perPartidaFolder = zip.folder('01_per_partida')!;
  const cronologicFolder = zip.folder('02_cronologic')!;

  const manifestEntries: ManifestEntry[] = [];
  let okCount = 0;
  let missingCount = 0;
  let fetchErrorCount = 0;

  // 4. Processar cada entry
  for (let i = 0; i < processedEntries.length; i++) {
    const entry = processedEntries[i];
    const { expense, assignment, budgetLine, link } = entry;

    // Reportar progrés
    if (onProgress) {
      onProgress(i + 1, processedEntries.length);
    }

    const budgetCode = budgetLine?.code ?? 'NO_PARTIDA';
    const budgetFolderName = generateBudgetFolderName(budgetLine);

    // Crear manifest entry base
    const manifestEntry: ManifestEntry = {
      order: i + 1,
      date: expense?.date ?? '',
      source: expense?.source ?? 'bank',
      projectCode: projectCode ?? '',
      projectName: projectName,
      budgetCode: budgetCode,
      budgetName: budgetLine?.name ?? '(sense partida)',
      amountAssignedEUR: Math.abs(assignment.amountEUR),
      category: expense?.categoryName ?? '',
      counterparty: expense?.counterpartyName ?? '',
      description: expense?.description ?? '',
      txId: link.id,
      docStatus: 'OK',
      docPathPerPartida: '',
      docPathCronologic: '',
      documentUrl: expense?.documentUrl ?? '',
    };

    // Verificar si tenim la despesa al feed
    if (!expense) {
      manifestEntry.docStatus = 'NO_EXPENSE_IN_FEED';
      missingCount++;
      manifestEntries.push(manifestEntry);
      continue;
    }

    // Verificar si té document
    if (!expense.documentUrl) {
      manifestEntry.docStatus = expense.source === 'offBank' ? 'MISSING_OFFBANK' : 'MISSING';
      missingCount++;
      manifestEntries.push(manifestEntry);
      continue;
    }

    // Intentar descarregar el document
    try {
      const response = await fetch(expense.documentUrl);
      if (!response.ok) {
        manifestEntry.docStatus = 'FETCH_ERROR';
        fetchErrorCount++;
        manifestEntries.push(manifestEntry);
        continue;
      }

      const contentType = response.headers.get('Content-Type');
      const ext = getExtensionFromContentType(contentType);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Generar nom de fitxer
      const filename = generateFilename(expense, assignment.amountEUR, budgetCode, ext);

      // Carpeta per partida
      const partidaPath = `${budgetFolderName}/${filename}`;
      perPartidaFolder.file(partidaPath, arrayBuffer);

      // Carpeta cronològica
      const monthFolder = formatDateForFolder(expense.date);
      const cronologicPath = `${monthFolder}/${filename}`;
      cronologicFolder.file(cronologicPath, arrayBuffer);

      // Actualitzar manifest
      manifestEntry.docStatus = 'OK';
      manifestEntry.docPathPerPartida = `01_per_partida/${partidaPath}`;
      manifestEntry.docPathCronologic = `02_cronologic/${cronologicPath}`;
      okCount++;

    } catch (err) {
      console.error('Error fetching document:', err);
      manifestEntry.docStatus = 'FETCH_ERROR';
      fetchErrorCount++;
    }

    manifestEntries.push(manifestEntry);
  }

  // 5. Generar manifest.csv
  const manifestCsv = generateManifestCsv(manifestEntries);
  zip.file('manifest.csv', manifestCsv);

  // 6. Generar i descarregar ZIP
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  // Generar nom de fitxer
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeProjectCode = sanitizeForFilename(projectCode ?? 'projecte');
  const filename = `comprovants_${safeProjectCode}_${dateStr}.zip`;

  // Descarregar
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    entriesCount: processedEntries.length,
    okCount,
    missingCount,
    fetchErrorCount,
  };
}
