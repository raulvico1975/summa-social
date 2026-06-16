import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMultiFunderExpenseExportRows,
  buildMultiFunderSummaryRows,
  getFundingBudgetStatus,
  getFundingExpenseStatus,
  sumFundingBudgetAllocations,
  sumFundingExpenseAllocations,
} from '@/lib/project-module-funding';
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
