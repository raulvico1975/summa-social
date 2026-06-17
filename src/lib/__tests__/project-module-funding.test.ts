import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import { buildProjectMultiFunderJustificationXlsx } from '@/lib/project-justification-export';
import {
  buildMultiFunderExpenseExportRows,
  buildMultiFunderSummaryRows,
  formatEuropeanAmountInput,
  getFundingBudgetStatus,
  getFundingExpenseStatus,
  getProjectImputedAmountForExpense,
  parseEuropeanAmountInput,
  sumFundingBudgetAllocations,
  sumFundingExpenseAllocations,
} from '@/lib/project-module-funding';
import { computeSafeFxAssignmentAmountEUR } from '@/lib/project-module/fx';
import type {
  BudgetLine,
  ExpenseLink,
  ProjectFundingBudgetAllocation,
  ProjectFundingExpenseAllocation,
  ProjectFundingSource,
  UnifiedExpense,
} from '@/lib/project-module-types';

const sources: ProjectFundingSource[] = [
  {
    id: 'src-a',
    name: 'Financador A',
    type: 'public',
    approvedAmountEUR: 1000,
    receivedAmountEUR: null,
    notes: null,
    order: 1,
    archivedAt: null,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z',
  },
  {
    id: 'src-b',
    name: 'Financador B',
    type: 'private',
    approvedAmountEUR: 500,
    receivedAmountEUR: null,
    notes: null,
    order: 2,
    archivedAt: null,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z',
  },
  {
    id: 'src-archived',
    name: 'Arxivada',
    type: 'other',
    approvedAmountEUR: null,
    receivedAmountEUR: null,
    notes: null,
    order: 3,
    archivedAt: '2026-06-16T00:00:00.000Z',
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z',
  },
];

const budgetLines: BudgetLine[] = [
  {
    id: 'line-personal',
    name: 'Personal',
    code: '1',
    budgetedAmountEUR: 1000,
    order: 1,
    createdBy: 'u1',
    createdAt: '2026-06-16T00:00:00.000Z' as never,
    updatedAt: '2026-06-16T00:00:00.000Z' as never,
  },
  {
    id: 'line-formacio',
    name: 'Formacio',
    code: '2',
    budgetedAmountEUR: 500,
    order: 2,
    createdBy: 'u1',
    createdAt: '2026-06-16T00:00:00.000Z' as never,
    updatedAt: '2026-06-16T00:00:00.000Z' as never,
  },
];

const expenseLinks: ExpenseLink[] = [
  {
    id: 'tx-1',
    orgId: 'org-1',
    assignments: [{
      projectId: 'project-1',
      projectName: 'Projecte',
      amountEUR: -1000,
      budgetLineId: 'line-personal',
      budgetLineName: 'Personal',
    }],
    projectIds: ['project-1'],
    budgetLineIds: ['line-personal'],
    note: null,
    justification: {
      invoiceNumber: 'F-1',
      issuerTaxId: 'B00000000',
      invoiceDate: '2026-01-10',
      paymentDate: '2026-01-12',
      supportDocNumber: 'J-1',
    },
    createdBy: 'u1',
    createdAt: '2026-06-16T00:00:00.000Z' as never,
    updatedAt: '2026-06-16T00:00:00.000Z' as never,
  },
];

const expenses = new Map<string, UnifiedExpense>([
  ['tx-1', {
    txId: 'tx-1',
    source: 'bank',
    date: '2026-01-10',
    description: 'Factura formacio',
    amountEUR: -1000,
    categoryName: 'Formacio',
    counterpartyName: 'Proveedor SL',
    documentUrl: null,
  }],
]);

test('sums budget allocations by source and budget line', () => {
  const allocations: ProjectFundingBudgetAllocation[] = [
    buildBudgetAllocation('a1', 'line-personal', 'src-a', 600),
    buildBudgetAllocation('a2', 'line-personal', 'src-b', 400),
    buildBudgetAllocation('a3', 'line-formacio', 'src-a', 250),
  ];

  assert.equal(sumFundingBudgetAllocations(allocations, { budgetLineId: 'line-personal' }), 1000);
  assert.equal(sumFundingBudgetAllocations(allocations, { fundingSourceId: 'src-a' }), 850);
  assert.equal(getFundingBudgetStatus(1000, 1000), 'balanced');
});

test('parses and formats European amount inputs safely', () => {
  assert.equal(parseEuropeanAmountInput('2.600,86'), 2600.86);
  assert.equal(parseEuropeanAmountInput('2600,86'), 2600.86);
  assert.equal(parseEuropeanAmountInput('2600.86'), 2600.86);
  assert.equal(parseEuropeanAmountInput('2.600'), 2600);
  assert.equal(parseEuropeanAmountInput('0'), 0);
  assert.equal(parseEuropeanAmountInput(''), null);
  assert.equal(parseEuropeanAmountInput('', { required: true }), 0);
  assert.equal(formatEuropeanAmountInput(2600.86), '2.600,86');
  assert.throws(() => parseEuropeanAmountInput('12abc'));
  assert.throws(() => parseEuropeanAmountInput('-12'));
});

test('gets only the imputed amount for the current project', () => {
  const sharedLink: ExpenseLink = {
    ...expenseLinks[0],
    assignments: [
      {
        projectId: 'project-1',
        projectName: 'Projecte 1',
        amountEUR: -15,
        budgetLineId: 'line-personal',
        budgetLineName: 'Personal',
      },
      {
        projectId: 'project-2',
        projectName: 'Projecte 2',
        amountEUR: -100,
        budgetLineId: 'line-formacio',
        budgetLineName: 'Formacio',
      },
    ],
    projectIds: ['project-1', 'project-2'],
    budgetLineIds: ['line-personal', 'line-formacio'],
  };

  assert.equal(getProjectImputedAmountForExpense(sharedLink, 'project-1'), 15);
  assert.equal(getProjectImputedAmountForExpense(sharedLink, 'project-2'), 100);
});

test('uses resolved imputed amounts and does not fall back to stale FX amounts', () => {
  const fxLink: ExpenseLink = {
    ...expenseLinks[0],
    id: 'off_fx-1',
    assignments: [
      {
        projectId: 'project-1',
        projectName: 'Projecte 1',
        amountEUR: -30000000,
        budgetLineId: 'line-personal',
        budgetLineName: 'Personal',
        localPct: 100,
      },
    ],
    projectIds: ['project-1'],
    budgetLineIds: ['line-personal'],
  };
  const fxExpense: UnifiedExpense = {
    txId: 'off_fx-1',
    source: 'offBank',
    date: '2026-06-16',
    description: 'Despesa terreny',
    amountEUR: 0,
    categoryName: null,
    counterpartyName: 'Proveedor terreny',
    documentUrl: null,
    originalCurrency: 'XOF',
    originalAmount: 232739,
    pendingConversion: true,
  };

  assert.equal(
    getProjectImputedAmountForExpense(fxLink, 'project-1', {
      expense: fxExpense,
      resolveAssignmentAmountEUR: () => null,
    }),
    0
  );

  const rows = buildMultiFunderExpenseExportRows({
    projectId: 'project-1',
    fundingSources: sources,
    budgetLines,
    expenseLinks: [fxLink],
    expenses: new Map([['off_fx-1', fxExpense]]),
    expenseAllocations: [],
    resolveAssignmentAmountEUR: () => -355,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].imputedAmountEUR, 355);

  const safeRows = buildMultiFunderExpenseExportRows({
    projectId: 'project-1',
    fundingSources: sources,
    budgetLines,
    expenseLinks: [fxLink],
    expenses: new Map([['off_fx-1', fxExpense]]),
    expenseAllocations: [],
    resolveAssignmentAmountEUR: ({ expense, assignment }) => expense
      ? computeSafeFxAssignmentAmountEUR({ expense, assignment, projectTC: 1 / 655.957 })
      : assignment.amountEUR,
  });

  assert.equal(safeRows.length, 1);
  assert.equal(safeRows[0].imputedAmountEUR, 354.81);
});

test('builds multi-funder Excel with detail and summary sheets using safe FX amounts', async () => {
  const fxLink: ExpenseLink = {
    ...expenseLinks[0],
    id: 'off_fx-1',
    assignments: [
      {
        projectId: 'project-1',
        projectName: 'Projecte 1',
        amountEUR: -30000000,
        budgetLineId: 'line-personal',
        budgetLineName: 'Personal',
        localPct: 100,
      },
    ],
    projectIds: ['project-1'],
    budgetLineIds: ['line-personal'],
  };
  const fxExpense: UnifiedExpense = {
    txId: 'off_fx-1',
    source: 'offBank',
    date: '2026-06-16',
    description: 'Despesa terreny',
    amountEUR: 0,
    categoryName: null,
    counterpartyName: 'Proveedor terreny',
    documentUrl: null,
    originalCurrency: 'XOF',
    originalAmount: 232739,
    pendingConversion: true,
  };

  const result = buildProjectMultiFunderJustificationXlsx({
    projectId: 'project-1',
    projectCode: 'P-1',
    projectName: 'Projecte 1',
    budgetLines,
    expenseLinks: [fxLink],
    expenses: new Map([['off_fx-1', fxExpense]]),
    fundingSources: sources,
    budgetAllocations: [buildBudgetAllocation('b1', 'line-personal', 'src-a', 354.81)],
    expenseAllocations: [buildExpenseAllocation('d1', 'off_fx-1', 'src-a', 354.81, 'line-personal')],
    resolveAssignmentAmountEUR: ({ expense, assignment }) => expense
      ? computeSafeFxAssignmentAmountEUR({ expense, assignment, projectTC: 1 / 655.957 })
      : assignment.amountEUR,
  });

  const workbook = XLSX.read(await result.blob.arrayBuffer(), { type: 'array' });
  assert.deepEqual(workbook.SheetNames, ['Despeses', 'Resum per partida i financador']);

  const detailRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Despeses'], { header: 1 });
  const summaryRows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets['Resum per partida i financador'], { header: 1 });

  assert.equal(detailRows[1][14], 354.81);
  assert.equal(detailRows[1][15], 354.81);
  assert.equal(detailRows[1][17], 354.81);
  assert.equal(detailRows[1][18], 0);
  assert.equal(summaryRows[1][2], 354.81);
});

test('classifies expense distribution states', () => {
  assert.equal(getFundingExpenseStatus({ imputedAmountEUR: 1000, distributedAmountEUR: 0 }), 'undistributed');
  assert.equal(getFundingExpenseStatus({ imputedAmountEUR: 1000, distributedAmountEUR: 400 }), 'partial');
  assert.equal(getFundingExpenseStatus({ imputedAmountEUR: 1000, distributedAmountEUR: 1000.01 }), 'balanced');
  assert.equal(getFundingExpenseStatus({ imputedAmountEUR: 1000, distributedAmountEUR: 1000.05 }), 'overassigned');
});

test('sums expense allocations by source and supports zero amounts', () => {
  const allocations: ProjectFundingExpenseAllocation[] = [
    buildExpenseAllocation('d1', 'tx-1', 'src-a', 0, 'line-personal'),
    buildExpenseAllocation('d2', 'tx-1', 'src-b', 400, 'line-personal'),
  ];

  assert.equal(sumFundingExpenseAllocations(allocations, { expenseLinkId: 'tx-1' }), 400);
  assert.equal(sumFundingExpenseAllocations(allocations, { fundingSourceId: 'src-a' }), 0);
});

test('builds detailed export rows and excludes archived funding source columns', () => {
  const allocations: ProjectFundingExpenseAllocation[] = [
    buildExpenseAllocation('d1', 'tx-1', 'src-a', 500, 'line-personal'),
    buildExpenseAllocation('d2', 'tx-1', 'src-b', 500, 'line-formacio'),
    buildExpenseAllocation('d3', 'tx-1', 'src-archived', 200, 'line-personal'),
  ];

  const rows = buildMultiFunderExpenseExportRows({
    projectId: 'project-1',
    fundingSources: sources,
    budgetLines,
    expenseLinks,
    expenses,
    expenseAllocations: allocations,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].status, 'overassigned');
  assert.equal(rows[0].byFundingSource['src-a'], 500);
  assert.equal(rows[0].byFundingSource['src-b'], 500);
  assert.equal(Object.hasOwn(rows[0].byFundingSource, 'src-archived'), false);
});

test('builds summary rows by budget line and funding source', () => {
  const budgetAllocations: ProjectFundingBudgetAllocation[] = [
    buildBudgetAllocation('b1', 'line-personal', 'src-a', 600),
    buildBudgetAllocation('b2', 'line-personal', 'src-b', 400),
  ];
  const expenseRows = buildMultiFunderExpenseExportRows({
    projectId: 'project-1',
    fundingSources: sources,
    budgetLines,
    expenseLinks,
    expenses,
    expenseAllocations: [
      buildExpenseAllocation('d1', 'tx-1', 'src-a', 500, 'line-personal'),
      buildExpenseAllocation('d2', 'tx-1', 'src-b', 500, 'line-formacio'),
    ],
  });

  const summary = buildMultiFunderSummaryRows({
    fundingSources: sources,
    budgetLines,
    budgetAllocations,
    expenseRows,
  });

  assert.equal(summary[0].byFundingSource['src-a'].budgetedAmountEUR, 600);
  assert.equal(summary[0].byFundingSource['src-a'].executedAmountEUR, 500);
  assert.equal(summary[0].byFundingSource['src-b'].differenceEUR, -100);
});

function buildBudgetAllocation(
  id: string,
  budgetLineId: string,
  fundingSourceId: string,
  amountEUR: number
): ProjectFundingBudgetAllocation {
  return {
    id,
    budgetLineId,
    fundingSourceId,
    amountEUR,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z',
  };
}

function buildExpenseAllocation(
  id: string,
  expenseLinkId: string,
  fundingSourceId: string,
  amountEUR: number,
  budgetLineId: string | null
): ProjectFundingExpenseAllocation {
  return {
    id,
    expenseLinkId,
    expenseId: expenseLinkId,
    expenseSource: 'bank',
    fundingSourceId,
    amountEUR,
    kind: 'cash',
    budgetLineId,
    notes: null,
    createdAt: '2026-06-16T00:00:00.000Z',
    updatedAt: '2026-06-16T00:00:00.000Z',
  };
}
