// src/lib/project-justification-export.ts
// Exportació Excel de justificació de projecte (ACCD / Fons Català)

import * as XLSX from 'xlsx';
import type { BudgetLine, ExpenseLink, Project, ProjectExpenseExport, OffBankExpense, UnifiedExpense } from '@/lib/project-module-types';
import type { Firestore } from 'firebase/firestore';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { buildJustificationRows, type JustificationRow } from '@/lib/project-justification-rows';

// Tipus unificat per despeses (bank o off-bank)
interface UnifiedExpenseData {
  id: string;
  source: 'bank' | 'offBank';
  date: string;
  description: string | null;
  counterpartyName: string | null;
  categoryName: string | null;
  amountEUR: number;
  documentName: string | null;
  // FX
  currency?: string | null;
  amountOriginal?: number | null;
  fxRateUsed?: number | null;
  // Justificació (per offBank)
  invoiceNumber?: string | null;
  issuerTaxId?: string | null;
  invoiceDate?: string | null;
  paymentDate?: string | null;
  supportDocNumber?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface OrganizationData {
  name: string;
  fiscalId: string | null;
}

interface JustificationData {
  project: Project;
  organization: OrganizationData;
  budgetLines: BudgetLine[];
  expenseLinks: ExpenseLink[];
  expenses: Map<string, UnifiedExpenseData>;
}

interface BudgetLineSummary {
  code: string;
  name: string;
  budgeted: number;
  executed: number;
  difference: number;
  deviationPct: number;
  status: 'OK' | 'ALERT';
}

interface ExpenseRow {
  date: string;
  counterpartyName: string;
  concept: string;
  categoryName: string;
  projectName: string;
  budgetLineCode: string;
  budgetLineName: string;
  amountAssigned: number;
  documentRef: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatDateDMY(dateStr: string | null): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('ca-ES', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value) + '%';
}

// ═══════════════════════════════════════════════════════════════════════════
// FETCH DATA
// ═══════════════════════════════════════════════════════════════════════════

async function fetchJustificationData(
  firestore: Firestore,
  organizationId: string,
  projectId: string
): Promise<JustificationData> {
  // 1. Projecte
  const projectRef = doc(
    firestore,
    'organizations',
    organizationId,
    'projectModule',
    '_',
    'projects',
    projectId
  );
  const projectSnap = await getDoc(projectRef);
  if (!projectSnap.exists()) {
    throw new Error('Projecte no trobat');
  }
  const project = { id: projectSnap.id, ...projectSnap.data() } as Project;

  // 2. Organització
  const orgRef = doc(firestore, 'organizations', organizationId);
  const orgSnap = await getDoc(orgRef);
  const orgData = orgSnap.data();
  const organization: OrganizationData = {
    name: orgData?.name ?? 'Organització',
    fiscalId: orgData?.fiscalId ?? orgData?.nif ?? null,
  };

  // 3. Partides de pressupost
  const linesRef = collection(
    firestore,
    'organizations',
    organizationId,
    'projectModule',
    '_',
    'projects',
    projectId,
    'budgetLines'
  );
  const linesSnap = await getDocs(linesRef);
  const budgetLines: BudgetLine[] = linesSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as BudgetLine));

  // Ordenar partides
  budgetLines.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return a.name.localeCompare(b.name);
  });

  // 4. ExpenseLinks d'aquest projecte
  const linksRef = collection(
    firestore,
    'organizations',
    organizationId,
    'projectModule',
    '_',
    'expenseLinks'
  );
  const linksQuery = query(linksRef, where('projectIds', 'array-contains', projectId));
  const linksSnap = await getDocs(linksQuery);
  const expenseLinks: ExpenseLink[] = linksSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  } as ExpenseLink));

  // 5. Carregar despeses relacionades (bank i off-bank)
  const txIds = expenseLinks.map((l) => l.id);
  const expenses = new Map<string, UnifiedExpenseData>();

  const feedRef = collection(
    firestore,
    'organizations',
    organizationId,
    'exports',
    'projectExpenses',
    'items'
  );

  const offBankRef = collection(
    firestore,
    'organizations',
    organizationId,
    'projectModule',
    '_',
    'offBankExpenses'
  );

  for (const txId of txIds) {
    if (txId.startsWith('off_')) {
      // Despesa off-bank
      const offBankId = txId.replace('off_', '');
      const offBankDoc = await getDoc(doc(offBankRef, offBankId));
      if (offBankDoc.exists()) {
        const data = offBankDoc.data() as OffBankExpense;
        expenses.set(txId, {
          id: txId,
          source: 'offBank',
          date: data.date,
          description: data.concept,
          counterpartyName: data.counterpartyName,
          categoryName: data.categoryName,
          amountEUR: typeof data.amountEUR === 'number' ? -Math.abs(data.amountEUR) : 0,
          documentName: null,
          // FX (nou model amb fallback a camps antics)
          currency: data.originalCurrency ?? data.currency ?? null,
          amountOriginal: data.originalAmount ?? data.amountOriginal ?? null,
          fxRateUsed: data.fxRate ?? data.fxRateUsed ?? null,
          // Justificació directa de offBank
          invoiceNumber: data.invoiceNumber ?? null,
          issuerTaxId: data.issuerTaxId ?? null,
          invoiceDate: data.invoiceDate ?? null,
          paymentDate: data.paymentDate ?? null,
          supportDocNumber: data.supportDocNumber ?? null,
        });
      }
    } else {
      // Despesa bank
      const expenseDoc = await getDoc(doc(feedRef, txId));
      if (expenseDoc.exists()) {
        const data = expenseDoc.data() as ProjectExpenseExport;
        // Buscar justificació a l'expenseLink
        const link = expenseLinks.find((l) => l.id === txId);
        expenses.set(txId, {
          id: txId,
          source: 'bank',
          date: data.date,
          description: data.description,
          counterpartyName: data.counterpartyName,
          categoryName: data.categoryName,
          amountEUR: data.amountEUR,
          documentName: data.documents?.[0]?.name ?? null,
          // FX (bank sempre és EUR)
          currency: 'EUR',
          amountOriginal: null,
          fxRateUsed: null,
          // Justificació de l'expenseLink
          invoiceNumber: link?.justification?.invoiceNumber ?? null,
          issuerTaxId: link?.justification?.issuerTaxId ?? null,
          invoiceDate: link?.justification?.invoiceDate ?? null,
          paymentDate: link?.justification?.paymentDate ?? null,
          supportDocNumber: link?.justification?.supportDocNumber ?? null,
        });
      }
    }
  }

  return {
    project,
    organization,
    budgetLines,
    expenseLinks,
    expenses,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// BUILD SHEETS
// ═══════════════════════════════════════════════════════════════════════════

function buildResumSheet(data: JustificationData): XLSX.WorkSheet {
  const { project, budgetLines, expenseLinks } = data;
  const allowedDeviation = project.allowedDeviationPct ?? 10;

  // Calcular execució per partida
  const executionByLine = new Map<string, number>();
  for (const link of expenseLinks) {
    for (const assignment of link.assignments) {
      if (assignment.projectId === project.id && assignment.budgetLineId) {
        const current = executionByLine.get(assignment.budgetLineId) ?? 0;
        executionByLine.set(assignment.budgetLineId, current + Math.abs(assignment.amountEUR));
      }
    }
  }

  // Construir files
  const rows: (string | number)[][] = [];

  // Header
  rows.push([
    'Codi',
    'Partida',
    'Pressupostat',
    'Executat',
    'Diferència',
    'Desviació %',
    'Estat',
  ]);

  let totalBudgeted = 0;
  let totalExecuted = 0;

  for (const line of budgetLines) {
    const executed = executionByLine.get(line.id) ?? 0;
    const difference = executed - line.budgetedAmountEUR;
    const deviationPct = line.budgetedAmountEUR > 0
      ? (difference / line.budgetedAmountEUR) * 100
      : 0;
    const isWithin = Math.abs(deviationPct) <= allowedDeviation;

    totalBudgeted += line.budgetedAmountEUR;
    totalExecuted += executed;

    rows.push([
      line.code ?? '',
      line.name,
      line.budgetedAmountEUR,
      executed,
      difference,
      deviationPct,
      isWithin ? 'OK' : 'ALERTA',
    ]);
  }

  // Fila de totals
  const totalDiff = totalExecuted - totalBudgeted;
  const totalDevPct = totalBudgeted > 0 ? (totalDiff / totalBudgeted) * 100 : 0;
  rows.push([
    '',
    'TOTAL',
    totalBudgeted,
    totalExecuted,
    totalDiff,
    totalDevPct,
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Amplades de columna
  ws['!cols'] = [
    { wch: 10 }, // Codi
    { wch: 30 }, // Partida
    { wch: 15 }, // Pressupostat
    { wch: 15 }, // Executat
    { wch: 15 }, // Diferència
    { wch: 12 }, // Desviació %
    { wch: 10 }, // Estat
  ];

  return ws;
}

function buildDespesesSheet(data: JustificationData): XLSX.WorkSheet {
  const { project, budgetLines, expenseLinks, expenses } = data;

  // Mapa de budgetLineId -> budgetLine per lookup ràpid
  const lineMap = new Map(budgetLines.map((l) => [l.id, l]));

  const rows: (string | number)[][] = [];

  // Header amb noves columnes
  rows.push([
    'Font',
    'Data',
    'Proveïdor/Contrapart',
    'Concepte',
    'Categoria',
    'Projecte',
    'Codi partida',
    'Partida',
    'Moneda',
    'Import original',
    'FX',
    'Import EUR',
    'Núm. factura',
    'NIF emissor',
    'Data factura',
    'Data pagament',
    'Núm. justificant',
    'Document',
  ]);

  // Ordenar expenseLinks per data de despesa
  const sortedLinks = [...expenseLinks].sort((a, b) => {
    const expA = expenses.get(a.id);
    const expB = expenses.get(b.id);
    const dateA = expA?.date ?? '';
    const dateB = expB?.date ?? '';
    return dateA.localeCompare(dateB);
  });

  for (const link of sortedLinks) {
    const expense = expenses.get(link.id);
    if (!expense) continue;

    // Filtrar només assignacions d'aquest projecte
    const relevantAssignments = link.assignments.filter(
      (a) => a.projectId === project.id
    );

    for (const assignment of relevantAssignments) {
      const budgetLine = assignment.budgetLineId
        ? lineMap.get(assignment.budgetLineId)
        : null;

      rows.push([
        expense.source === 'bank' ? 'Bancària' : 'Terreny',
        formatDateDMY(expense.date),
        expense.counterpartyName ?? '',
        expense.description ?? '',
        expense.categoryName ?? '',
        assignment.projectName,
        budgetLine?.code ?? '',
        assignment.budgetLineName ?? '(sense partida)',
        expense.currency ?? 'EUR',
        expense.amountOriginal ?? '',
        expense.fxRateUsed ?? '',
        Math.abs(assignment.amountEUR),
        expense.invoiceNumber ?? '',
        expense.issuerTaxId ?? '',
        expense.invoiceDate ? formatDateDMY(expense.invoiceDate) : '',
        expense.paymentDate ? formatDateDMY(expense.paymentDate) : '',
        expense.supportDocNumber ?? '',
        expense.documentName ?? '',
      ]);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Amplades de columna
  ws['!cols'] = [
    { wch: 10 }, // Font
    { wch: 12 }, // Data
    { wch: 25 }, // Proveïdor
    { wch: 40 }, // Concepte
    { wch: 20 }, // Categoria
    { wch: 20 }, // Projecte
    { wch: 10 }, // Codi partida
    { wch: 25 }, // Partida
    { wch: 8 },  // Moneda
    { wch: 15 }, // Import original
    { wch: 10 }, // FX
    { wch: 15 }, // Import EUR
    { wch: 15 }, // Núm. factura
    { wch: 12 }, // NIF emissor
    { wch: 12 }, // Data factura
    { wch: 12 }, // Data pagament
    { wch: 15 }, // Núm. justificant
    { wch: 30 }, // Document
  ];

  return ws;
}

function buildMetadadesSheet(data: JustificationData): XLSX.WorkSheet {
  const { project, organization } = data;
  const now = new Date();

  const rows: string[][] = [
    ['Metadades de l\'export'],
    [''],
    ['Camp', 'Valor'],
    ['Organització', organization.name],
    ['CIF/NIF', organization.fiscalId ?? ''],
    ['Projecte', project.name],
    ['Codi projecte', project.code ?? ''],
    ['Data inici', formatDateDMY(project.startDate)],
    ['Data fi', formatDateDMY(project.endDate)],
    ['Desviació permesa', `${project.allowedDeviationPct ?? 10}%`],
    [''],
    ['Data export', now.toLocaleDateString('ca-ES')],
    ['Hora export', now.toLocaleTimeString('ca-ES')],
    ['Generat per', 'Summa Social'],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Amplades de columna
  ws['!cols'] = [
    { wch: 20 }, // Camp
    { wch: 40 }, // Valor
  ];

  return ws;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

export interface ExportResult {
  blob: Blob;
  filename: string;
}

export async function buildProjectJustificationXlsx(
  firestore: Firestore,
  organizationId: string,
  projectId: string
): Promise<ExportResult> {
  // 1. Obtenir dades
  const data = await fetchJustificationData(firestore, organizationId, projectId);

  // 2. Crear workbook
  const wb = XLSX.utils.book_new();

  // 3. Afegir fulls
  const wsResum = buildResumSheet(data);
  XLSX.utils.book_append_sheet(wb, wsResum, 'Resum');

  const wsDespeses = buildDespesesSheet(data);
  XLSX.utils.book_append_sheet(wb, wsDespeses, 'Despeses');

  const wsMetadades = buildMetadadesSheet(data);
  XLSX.utils.book_append_sheet(wb, wsMetadades, 'Metadades');

  // 4. Generar fitxer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // 5. Generar nom de fitxer
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const projectCode = data.project.code?.replace(/[^a-zA-Z0-9]/g, '') ?? data.project.id.slice(0, 8);
  const filename = `justificacio_${projectCode}_${dateStr}.xlsx`;

  return { blob, filename };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNDING EXCEL EXPORT (NOVA FUNCIÓ - USA buildJustificationRows)
// ═══════════════════════════════════════════════════════════════════════════

export interface FundingExportParams {
  projectId: string;
  projectCode: string;
  projectName: string;
  budgetLines: BudgetLine[];
  expenseLinks: ExpenseLink[];
  expenses: Map<string, UnifiedExpense>;
}

function formatDateDMYForFunding(dateStr: string | null): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}/${month}/${year}`;
}

/**
 * Construeix l'Excel de justificació per finançadors (format unificat).
 * Utilitza buildJustificationRows com a single source of truth per l'ordre.
 *
 * Columnes:
 * 1. Número d'ordre
 * 2. Data despesa
 * 3. Data de pagament
 * 4. Proveïdor/destinatari
 * 5. Concepte
 * 6. Codi partida
 * 7. Nom partida
 * 8. Import total (EUR)
 * 9. Import imputat (EUR)
 * 10. Nom del comprovant
 * 11. Ruta dins ZIP (cronològic)
 * 12. Observacions (buit)
 */
export function buildProjectJustificationFundingXlsx(
  params: FundingExportParams
): ExportResult {
  const { projectCode, projectName, budgetLines, expenseLinks, expenses, projectId } = params;

  // 1. Obtenir files ordenades
  const rows = buildJustificationRows({
    projectId,
    projectCode: projectCode ?? '',
    budgetLines,
    expenseLinks,
    expenses,
  });

  // 2. Construir full de despeses
  const wsData: (string | number)[][] = [];

  // Header
  wsData.push([
    'Núm. ordre',
    'Data despesa',
    'Data pagament',
    'Proveïdor/destinatari',
    'Concepte',
    'Codi partida',
    'Nom partida',
    'Import total (EUR)',
    'Import imputat (EUR)',
    'Nom del comprovant',
    'Ruta dins ZIP',
    'Observacions',
  ]);

  // Files de dades
  for (const row of rows) {
    wsData.push([
      row.order,
      formatDateDMYForFunding(row.dateExpense),
      formatDateDMYForFunding(row.paymentDate),
      row.counterpartyName,
      row.concept,
      row.budgetLineCode,
      row.budgetLineName,
      row.amountTotalEUR ?? '',
      row.amountAssignedEUR,
      row.documentName,
      row.zipPathCronologic,
      '', // Observacions (buit per defecte)
    ]);
  }

  // Fila de totals
  const totalAssigned = rows.reduce((sum, r) => sum + r.amountAssignedEUR, 0);
  wsData.push([
    '',
    '',
    '',
    '',
    '',
    '',
    'TOTAL',
    '',
    totalAssigned,
    '',
    '',
    '',
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Amplades de columna
  ws['!cols'] = [
    { wch: 10 },  // Núm. ordre
    { wch: 12 },  // Data despesa
    { wch: 12 },  // Data pagament
    { wch: 25 },  // Proveïdor
    { wch: 35 },  // Concepte
    { wch: 12 },  // Codi partida
    { wch: 25 },  // Nom partida
    { wch: 15 },  // Import total
    { wch: 15 },  // Import imputat
    { wch: 40 },  // Nom comprovant
    { wch: 35 },  // Ruta ZIP
    { wch: 20 },  // Observacions
  ];

  // 3. Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Justificació');

  // 4. Generar fitxer
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // 5. Generar nom de fitxer
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const safeProjectCode = (projectCode ?? 'projecte').replace(/[^a-zA-Z0-9]/g, '');
  const filename = `justificacio_financador_${safeProjectCode}_${dateStr}.xlsx`;

  return { blob, filename };
}
