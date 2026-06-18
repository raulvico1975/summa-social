import test from 'node:test';
import assert from 'node:assert/strict';

import { buildJustificationRows } from '@/lib/project-justification-rows';
import type { BudgetLine, ExpenseLink, UnifiedExpense } from '@/lib/project-module-types';

const budgetLines = [
  {
    id: 'line-1',
    name: 'Personal local',
    code: 'A1',
    budgetedAmountEUR: 1000,
    order: 1,
  } as BudgetLine,
];

function buildExpense(overrides: Partial<UnifiedExpense> = {}): UnifiedExpense {
  return {
    txId: 'tx-1',
    source: 'bank',
    date: '2026-06-08',
    description: 'Factura serveis',
    amountEUR: -100,
    categoryName: 'Serveis',
    counterpartyName: 'Proveidor Exemple',
    documentUrl: null,
    ...overrides,
  };
}

function buildExpenseLink(overrides: Partial<ExpenseLink> = {}): ExpenseLink {
  return {
    id: 'tx-1',
    orgId: 'org-1',
    assignments: [
      {
        projectId: 'project-1',
        projectName: 'Projecte',
        budgetLineId: 'line-1',
        budgetLineName: 'Personal local',
        amountEUR: -50,
      },
    ],
    projectIds: ['project-1'],
    budgetLineIds: ['line-1'],
    note: null,
    createdBy: 'user-1',
    createdAt: null as never,
    updatedAt: null as never,
    ...overrides,
  };
}

test('keeps one economic justification row while exposing every attached document', () => {
  const expense = buildExpense({
    attachments: [
      {
        url: 'https://storage.local/factura.pdf',
        name: 'factura.pdf',
        contentType: 'application/pdf',
        size: 100,
        uploadedAt: '2026-06-08',
      },
      {
        url: 'https://storage.local/rebut.jpg',
        name: 'rebut.jpg',
        contentType: 'image/jpeg',
        size: 200,
        uploadedAt: '2026-06-08',
      },
    ],
  });

  const rows = buildJustificationRows({
    projectId: 'project-1',
    projectCode: 'P1',
    budgetLines,
    expenseLinks: [buildExpenseLink()],
    expenses: new Map([[expense.txId, expense]]),
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].amountAssignedEUR, 50);
  assert.equal(rows[0].documents.length, 2);
  assert.equal(rows[0].documentUrl, 'https://storage.local/factura.pdf');
  assert.equal(rows[0].documents[0].documentUrl, 'https://storage.local/factura.pdf');
  assert.equal(rows[0].documents[1].documentUrl, 'https://storage.local/rebut.jpg');
  assert.match(rows[0].documents[0].zipPathCronologic, /^02_cronologic\/001_2026\.06\.08_/);
  assert.match(rows[0].documents[1].zipPathCronologic, /_doc02\.jpg$/);
});

test('falls back to the legacy single document URL when there are no attachments', () => {
  const expense = buildExpense({
    documentUrl: 'https://storage.local/legacy.pdf',
    attachments: null,
  });

  const rows = buildJustificationRows({
    projectId: 'project-1',
    projectCode: 'P1',
    budgetLines,
    expenseLinks: [buildExpenseLink()],
    expenses: new Map([[expense.txId, expense]]),
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].documents.length, 1);
  assert.equal(rows[0].documentUrl, 'https://storage.local/legacy.pdf');
});

test('keeps internal storagePath documents visible even without a public URL', () => {
  const storagePath = 'organizations/org-1/offBankExpenses/e1/factura.pdf';
  const expense = buildExpense({
    attachments: [
      {
        url: storagePath,
        storagePath,
        name: 'factura.pdf',
        contentType: 'application/pdf',
        size: 100,
        uploadedAt: '2026-06-08',
      },
    ],
  });

  const rows = buildJustificationRows({
    projectId: 'project-1',
    projectCode: 'P1',
    budgetLines,
    expenseLinks: [buildExpenseLink()],
    expenses: new Map([[expense.txId, expense]]),
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].documents.length, 1);
  assert.equal(rows[0].documentUrl, storagePath);
  assert.equal(rows[0].documents[0].documentUrl, storagePath);
  assert.equal(rows[0].documents[0].storagePath, storagePath);
});

test('carries persisted AI document review from attachments into justification documents', () => {
  const storagePath = 'organizations/org-1/offBankExpenses/e1/factura.pdf';
  const expense = buildExpense({
    attachments: [
      {
        url: storagePath,
        storagePath,
        name: 'factura.pdf',
        contentType: 'application/pdf',
        size: 100,
        uploadedAt: '2026-06-08',
        aiDocumentReview: {
          docType: 'invoice',
          confidence: 0.91,
          fields: {
            amount: { value: 50, confidence: 0.9, evidence: 'TOTAL 50,00' },
          },
          provider: 'openai',
          model: 'gpt-5-mini',
          processedAt: '2026-06-18T10:00:00.000Z',
          errors: [],
        },
      },
    ],
  });

  const rows = buildJustificationRows({
    projectId: 'project-1',
    projectCode: 'P1',
    budgetLines,
    expenseLinks: [buildExpenseLink()],
    expenses: new Map([[expense.txId, expense]]),
  });

  assert.equal(rows[0].documents[0].aiDocumentReview?.docType, 'invoice');
  assert.equal(rows[0].documents[0].aiDocumentReview?.fields?.amount?.value, 50);
});

test('deduplicates repeated document URLs before building ZIP paths', () => {
  const expense = buildExpense({
    attachments: [
      {
        url: 'https://storage.local/factura.pdf',
        name: 'factura.pdf',
        contentType: 'application/pdf',
        size: 100,
        uploadedAt: '2026-06-08',
      },
      {
        url: 'https://storage.local/factura.pdf',
        name: 'factura-copy.pdf',
        contentType: 'application/pdf',
        size: 100,
        uploadedAt: '2026-06-08',
      },
    ],
  });

  const rows = buildJustificationRows({
    projectId: 'project-1',
    projectCode: 'P1',
    budgetLines,
    expenseLinks: [buildExpenseLink()],
    expenses: new Map([[expense.txId, expense]]),
  });

  assert.equal(rows[0].documents.length, 1);
});
