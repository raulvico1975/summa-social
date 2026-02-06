// src/lib/project-justification-attachments-zip.ts
// Exportació ZIP de comprovants de justificació de projecte

import JSZip from 'jszip';
import type { UnifiedExpense, ExpenseLink, BudgetLine } from '@/lib/project-module-types';
import { buildJustificationRows, type JustificationRow } from '@/lib/project-justification-rows';

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
  amountAssignedEUR: number | null;
  category: string;
  counterparty: string;
  description: string;
  txId: string;
  docStatus: DocStatus;
  docPathPerPartida: string;
  docPathCronologic: string;
  documentUrl: string;
}

interface ProgressCallback {
  (current: number, total: number): void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

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
    e.amountAssignedEUR != null ? e.amountAssignedEUR.toFixed(2) : '',
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

  // Mapa de txId -> UnifiedExpense
  const expenseMap = new Map(expenses.map((e) => [e.txId, e]));

  // 1. Obtenir files ordenades des de buildJustificationRows (SINGLE SOURCE OF TRUTH)
  const justificationRows = buildJustificationRows({
    projectId,
    projectCode: projectCode ?? '',
    budgetLines,
    expenseLinks,
    expenses: expenseMap,
  });

  // 2. Crear ZIP
  const zip = new JSZip();
  const perPartidaFolder = zip.folder('01_per_partida')!;
  const cronologicFolder = zip.folder('02_cronologic')!;

  const manifestEntries: ManifestEntry[] = [];
  let okCount = 0;
  let missingCount = 0;
  let fetchErrorCount = 0;

  // 3. Processar cada fila (ja ordenada i amb paths calculats)
  for (let i = 0; i < justificationRows.length; i++) {
    const row = justificationRows[i];

    // Reportar progrés
    if (onProgress) {
      onProgress(i + 1, justificationRows.length);
    }

    // Crear manifest entry base
    const manifestEntry: ManifestEntry = {
      order: row.order,
      date: row.dateExpense,
      source: row.source,
      projectCode: projectCode ?? '',
      projectName: projectName,
      budgetCode: row.budgetLineCode,
      budgetName: row.budgetLineName,
      amountAssignedEUR: row.amountAssignedEUR,
      category: row.categoryName ?? '',
      counterparty: row.counterpartyName,
      description: row.concept,
      txId: row.txId,
      docStatus: 'OK',
      docPathPerPartida: row.zipPathPerPartida,
      docPathCronologic: row.zipPathCronologic,
      documentUrl: row.documentUrl ?? '',
    };

    // Verificar si té document
    if (!row.documentUrl) {
      manifestEntry.docStatus = row.source === 'offBank' ? 'MISSING_OFFBANK' : 'MISSING';
      manifestEntry.docPathPerPartida = '';
      manifestEntry.docPathCronologic = '';
      missingCount++;
      manifestEntries.push(manifestEntry);
      continue;
    }

    // Intentar descarregar el document
    try {
      const response = await fetch(row.documentUrl);
      if (!response.ok) {
        manifestEntry.docStatus = 'FETCH_ERROR';
        manifestEntry.docPathPerPartida = '';
        manifestEntry.docPathCronologic = '';
        fetchErrorCount++;
        manifestEntries.push(manifestEntry);
        continue;
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();

      // Extreure path relatiu dins de cada carpeta
      // row.zipPathPerPartida = "01_per_partida/A1_Personal/filename.pdf"
      // row.zipPathCronologic = "02_cronologic/filename.pdf"
      const partidaPath = row.zipPathPerPartida.replace('01_per_partida/', '');
      const cronologicPath = row.zipPathCronologic.replace('02_cronologic/', '');

      // Afegir al ZIP
      perPartidaFolder.file(partidaPath, arrayBuffer);
      cronologicFolder.file(cronologicPath, arrayBuffer);

      okCount++;

    } catch (err) {
      console.error('Error fetching document:', err);
      manifestEntry.docStatus = 'FETCH_ERROR';
      manifestEntry.docPathPerPartida = '';
      manifestEntry.docPathCronologic = '';
      fetchErrorCount++;
    }

    manifestEntries.push(manifestEntry);
  }

  // 4. Generar manifest.csv
  const manifestCsv = generateManifestCsv(manifestEntries);
  zip.file('manifest.csv', manifestCsv);

  // 5. Generar i descarregar ZIP
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
    entriesCount: justificationRows.length,
    okCount,
    missingCount,
    fetchErrorCount,
  };
}
