// src/lib/project-justification-attachments-zip.ts
// Exportació ZIP de comprovants de justificació de projecte

import JSZip from 'jszip';
import type { UnifiedExpense, ExpenseLink, BudgetLine } from '@/lib/project-module-types';
import { buildJustificationRows } from '@/lib/project-justification-rows';

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
  getIdToken?: () => Promise<string>;
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
  storagePath: string;
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
    'storagePath',
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
    e.storagePath,
  ].map(escapeField).join(','));

  return [headers.join(','), ...rows].join('\n');
}

async function resolveFreshDocumentUrl(params: {
  organizationId: string;
  documentUrl: string;
  storagePath: string | null;
  getIdToken?: () => Promise<string>;
}): Promise<string> {
  if (!params.getIdToken || (!params.storagePath && !params.documentUrl)) {
    return params.documentUrl;
  }

  try {
    const token = await params.getIdToken();
    const search = new URLSearchParams({ orgId: params.organizationId });
    if (params.storagePath) {
      search.set('storagePath', params.storagePath);
    } else {
      search.set('url', params.documentUrl);
    }
    const response = await fetch(`/api/org-documents/open?${search.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const body = await response.json() as { success?: boolean; url?: string };
    if (response.ok && body.success && body.url) {
      return body.url;
    }
  } catch {
    // Fallback al documentUrl original per compatibilitat amb exports antics.
  }

  return params.documentUrl;
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
    const baseManifestEntry: Omit<ManifestEntry, 'docStatus' | 'docPathPerPartida' | 'docPathCronologic' | 'documentUrl' | 'storagePath'> = {
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
    };

    // Verificar si té document
    if (row.documents.length === 0) {
      const manifestEntry: ManifestEntry = {
        ...baseManifestEntry,
        docStatus: row.source === 'offBank' ? 'MISSING_OFFBANK' : 'MISSING',
        docPathPerPartida: '',
        docPathCronologic: '',
        documentUrl: '',
        storagePath: '',
      };
      missingCount++;
      manifestEntries.push(manifestEntry);
      continue;
    }

    for (const document of row.documents) {
      const manifestEntry: ManifestEntry = {
        ...baseManifestEntry,
        docStatus: 'OK',
        docPathPerPartida: document.zipPathPerPartida,
        docPathCronologic: document.zipPathCronologic,
        documentUrl: document.documentUrl,
        storagePath: document.storagePath ?? '',
      };

      // Intentar descarregar el document
      try {
        const downloadUrl = await resolveFreshDocumentUrl({
          organizationId: params.organizationId,
          documentUrl: document.documentUrl,
          storagePath: document.storagePath,
          getIdToken: params.getIdToken,
        });
        const response = await fetch(downloadUrl);
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
        // document.zipPathPerPartida = "01_per_partida/A1_Personal/filename.pdf"
        // document.zipPathCronologic = "02_cronologic/filename.pdf"
        const partidaPath = document.zipPathPerPartida.replace('01_per_partida/', '');
        const cronologicPath = document.zipPathCronologic.replace('02_cronologic/', '');

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
    entriesCount: manifestEntries.length,
    okCount,
    missingCount,
    fetchErrorCount,
  };
}
