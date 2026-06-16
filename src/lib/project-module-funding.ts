import type {
  BudgetLine,
  ExpenseLink,
  ProjectFundingBudgetAllocation,
  ProjectFundingDistributionStatus,
  ProjectFundingExpenseAllocation,
  ProjectFundingSource,
  UnifiedExpense,
} from '@/lib/project-module-types';

export const PROJECT_FUNDING_TOLERANCE_EUR = 0.02;

export interface FundingAmountFilter {
  budgetLineId?: string | null;
  fundingSourceId?: string | null;
  expenseLinkId?: string | null;
}

export interface FundingExpenseStatusInput {
  imputedAmountEUR: number;
  distributedAmountEUR: number;
  toleranceEUR?: number;
}

export interface MultiFunderExpenseExportRow {
  order: number;
  expenseLinkId: string;
  expenseId: string;
  expenseSource: 'bank' | 'offBank';
  dateExpense: string;
  invoiceDate: string | null;
  paymentDate: string | null;
  concept: string;
  counterpartyName: string;
  issuerTaxId: string | null;
  invoiceNumber: string | null;
  supportDocNumber: string | null;
  budgetLineId: string | null;
  budgetLine: string;
  currency: string;
  totalOriginalAmount: number | null;
  fxRate: number | null;
  totalAmountEUR: number;
  imputedAmountEUR: number;
  byFundingSource: Record<string, number>;
  distributedAmountEUR: number;
  differenceEUR: number;
  status: ProjectFundingDistributionStatus;
  notes: string | null;
}

export interface MultiFunderSummaryRow {
  budgetLineId: string;
  budgetLine: string;
  budgetedAmountEUR: number;
  executedAmountEUR: number;
  differenceEUR: number;
  byFundingSource: Record<string, {
    budgetedAmountEUR: number;
    executedAmountEUR: number;
    differenceEUR: number;
  }>;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function isActiveFundingSource(source: ProjectFundingSource): boolean {
  return source.archivedAt === null;
}

function matchesFilter(allocation: FundingAmountFilter, filter: FundingAmountFilter): boolean {
  if (filter.budgetLineId !== undefined && allocation.budgetLineId !== filter.budgetLineId) return false;
  if (filter.fundingSourceId !== undefined && allocation.fundingSourceId !== filter.fundingSourceId) return false;
  if (filter.expenseLinkId !== undefined && allocation.expenseLinkId !== filter.expenseLinkId) return false;
  return true;
}

export function sumFundingBudgetAllocations(
  allocations: ProjectFundingBudgetAllocation[],
  filter: FundingAmountFilter = {}
): number {
  return roundCurrency(
    allocations
      .filter((allocation) => matchesFilter(allocation, filter))
      .reduce((sum, allocation) => sum + allocation.amountEUR, 0)
  );
}

export function sumFundingExpenseAllocations(
  allocations: ProjectFundingExpenseAllocation[],
  filter: FundingAmountFilter = {}
): number {
  return roundCurrency(
    allocations
      .filter((allocation) => matchesFilter(allocation, filter))
      .reduce((sum, allocation) => sum + allocation.amountEUR, 0)
  );
}

export function getFundingBudgetStatus(
  budgetedAmountEUR: number,
  allocatedAmountEUR: number,
  toleranceEUR = PROJECT_FUNDING_TOLERANCE_EUR
): ProjectFundingDistributionStatus {
  const diff = roundCurrency(allocatedAmountEUR - budgetedAmountEUR);
  if (allocatedAmountEUR === 0) return 'undistributed';
  if (diff > toleranceEUR) return 'overassigned';
  if (Math.abs(diff) <= toleranceEUR) return 'balanced';
  return 'review';
}

export function getFundingExpenseStatus({
  imputedAmountEUR,
  distributedAmountEUR,
  toleranceEUR = PROJECT_FUNDING_TOLERANCE_EUR,
}: FundingExpenseStatusInput): ProjectFundingDistributionStatus {
  const diff = roundCurrency(distributedAmountEUR - imputedAmountEUR);
  if (distributedAmountEUR === 0) return 'undistributed';
  if (diff > toleranceEUR) return 'overassigned';
  if (Math.abs(diff) <= toleranceEUR) return 'balanced';
  if (distributedAmountEUR < imputedAmountEUR) return 'partial';
  return 'review';
}

export function getProjectImputedAmountForExpense(link: ExpenseLink, projectId: string): number {
  return roundCurrency(
    link.assignments
      .filter((assignment) => assignment.projectId === projectId)
      .reduce((sum, assignment) => sum + (assignment.amountEUR != null ? Math.abs(assignment.amountEUR) : 0), 0)
  );
}

export function getProjectBudgetLineForExpense(link: ExpenseLink, projectId: string): string | null {
  const assignment = link.assignments.find((item) => item.projectId === projectId && item.budgetLineId);
  return assignment?.budgetLineId ?? null;
}

function buildBudgetLineLabel(line: BudgetLine | null): string {
  if (!line) return '';
  return line.code ? `${line.code} - ${line.name}` : line.name;
}

function sourceColumns(activeSources: ProjectFundingSource[]): Record<string, number> {
  return Object.fromEntries(activeSources.filter(isActiveFundingSource).map((source) => [source.id, 0]));
}

export function buildMultiFunderExpenseExportRows(params: {
  projectId: string;
  fundingSources: ProjectFundingSource[];
  budgetLines: BudgetLine[];
  expenseLinks: ExpenseLink[];
  expenses: Map<string, UnifiedExpense>;
  expenseAllocations: ProjectFundingExpenseAllocation[];
}): MultiFunderExpenseExportRow[] {
  const { projectId, fundingSources, budgetLines, expenseLinks, expenses, expenseAllocations } = params;
  const activeSources = fundingSources.filter(isActiveFundingSource).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const activeSourceIds = new Set(activeSources.map((source) => source.id));
  const budgetLineMap = new Map(budgetLines.map((line) => [line.id, line]));

  return expenseLinks
    .map((link) => {
      const expense = expenses.get(link.id);
      if (!expense) return null;

      const imputedAmountEUR = getProjectImputedAmountForExpense(link, projectId);
      if (imputedAmountEUR <= 0) return null;

      const mainBudgetLineId = getProjectBudgetLineForExpense(link, projectId);
      const allocationsForExpense = expenseAllocations.filter((allocation) => allocation.expenseLinkId === link.id);
      const byFundingSource = sourceColumns(activeSources);
      let notes: string | null = null;

      for (const allocation of allocationsForExpense) {
        if (!activeSourceIds.has(allocation.fundingSourceId)) continue;
        byFundingSource[allocation.fundingSourceId] = roundCurrency(
          (byFundingSource[allocation.fundingSourceId] ?? 0) + allocation.amountEUR
        );
        if (!notes && allocation.notes) notes = allocation.notes;
      }

      const distributedAmountEUR = sumFundingExpenseAllocations(allocationsForExpense, {});
      const differenceEUR = roundCurrency(imputedAmountEUR - distributedAmountEUR);
      const budgetLine = budgetLineMap.get(mainBudgetLineId ?? '') ?? null;

      return {
        order: 0,
        expenseLinkId: link.id,
        expenseId: link.id.startsWith('off_') ? link.id.slice(4) : link.id,
        expenseSource: expense.source,
        dateExpense: expense.date,
        invoiceDate: expense.invoiceDate ?? link.justification?.invoiceDate ?? null,
        paymentDate: expense.paymentDate ?? link.justification?.paymentDate ?? null,
        concept: expense.description ?? '',
        counterpartyName: expense.counterpartyName ?? '',
        issuerTaxId: expense.issuerTaxId ?? link.justification?.issuerTaxId ?? null,
        invoiceNumber: expense.invoiceNumber ?? link.justification?.invoiceNumber ?? null,
        supportDocNumber: expense.supportDocNumber ?? link.justification?.supportDocNumber ?? null,
        budgetLineId: mainBudgetLineId,
        budgetLine: buildBudgetLineLabel(budgetLine),
        currency: expense.originalCurrency ?? expense.currency ?? 'EUR',
        totalOriginalAmount: expense.originalAmount ?? expense.amountOriginal ?? null,
        fxRate: expense.fxRate ?? expense.fxRateUsed ?? null,
        totalAmountEUR: Math.abs(expense.amountEUR),
        imputedAmountEUR,
        byFundingSource,
        distributedAmountEUR,
        differenceEUR,
        status: getFundingExpenseStatus({ imputedAmountEUR, distributedAmountEUR }),
        notes,
      };
    })
    .filter((row): row is Omit<MultiFunderExpenseExportRow, 'order'> & { order: number } => row !== null)
    .sort((a, b) => a.dateExpense.localeCompare(b.dateExpense) || a.expenseLinkId.localeCompare(b.expenseLinkId))
    .map((row, index) => ({ ...row, order: index + 1 }));
}

export function buildMultiFunderSummaryRows(params: {
  fundingSources: ProjectFundingSource[];
  budgetLines: BudgetLine[];
  budgetAllocations: ProjectFundingBudgetAllocation[];
  expenseRows: MultiFunderExpenseExportRow[];
}): MultiFunderSummaryRow[] {
  const { fundingSources, budgetLines, budgetAllocations, expenseRows } = params;
  const activeSources = fundingSources.filter(isActiveFundingSource).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  return budgetLines.map((line) => {
    const rowsForLine = expenseRows.filter((row) => row.budgetLineId === line.id);
    const executedAmountEUR = roundCurrency(rowsForLine.reduce((sum, row) => sum + row.imputedAmountEUR, 0));
    const byFundingSource: MultiFunderSummaryRow['byFundingSource'] = {};

    for (const source of activeSources) {
      const budgetedAmountEUR = sumFundingBudgetAllocations(budgetAllocations, {
        budgetLineId: line.id,
        fundingSourceId: source.id,
      });
      const executedForSource = roundCurrency(rowsForLine.reduce(
        (sum, row) => sum + (row.byFundingSource[source.id] ?? 0),
        0
      ));
      byFundingSource[source.id] = {
        budgetedAmountEUR,
        executedAmountEUR: executedForSource,
        differenceEUR: roundCurrency(budgetedAmountEUR - executedForSource),
      };
    }

    return {
      budgetLineId: line.id,
      budgetLine: buildBudgetLineLabel(line),
      budgetedAmountEUR: line.budgetedAmountEUR,
      executedAmountEUR,
      differenceEUR: roundCurrency(line.budgetedAmountEUR - executedAmountEUR),
      byFundingSource,
    };
  });
}
