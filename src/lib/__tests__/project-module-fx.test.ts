import test from 'node:test';
import assert from 'node:assert/strict';

import {
  computeFxAmountEUR,
  computeSafeFxAssignmentAmountEUR,
  normalizeFxRateToEurPerLocal,
} from '@/lib/project-module/fx';
import { generateOffBankExpenses } from '@/scripts/demo/demo-generators';

test('converts XOF assignments using EUR per local unit', () => {
  const amount = computeFxAmountEUR(232739, 20, 1 / 655.957);

  assert.ok(amount !== null);
  assert.ok(Math.abs(amount - -70.96) < 0.01);
});

test('does not count stale FX assignment amounts when no TC is resolvable', () => {
  const safeAmount = computeSafeFxAssignmentAmountEUR({
    expense: {
      source: 'offBank',
      amountEUR: null,
      originalCurrency: 'XOF',
      originalAmount: 232739,
      fxRate: null,
      pendingConversion: true,
    },
    assignment: {
      amountEUR: -30533355.2446,
      localPct: 20,
    },
    projectTC: null,
  });

  assert.equal(safeAmount, null);
  const executed = safeAmount != null ? Math.abs(safeAmount) : 0;
  assert.equal(executed, 0);
});

test('normalizes legacy local-per-EUR rates only with amount evidence', () => {
  const normalized = normalizeFxRateToEurPerLocal(655.957, {
    originalAmount: 232739,
    amountEUR: 354.81,
  });

  assert.ok(normalized !== null);
  assert.ok(Math.abs(normalized - (1 / 655.957)) < 0.000000001);
  assert.equal(normalizeFxRateToEurPerLocal(655.957), null);
});

test('pending FX remains pending even when expense amountEUR exists without TC evidence', () => {
  const safeAmount = computeSafeFxAssignmentAmountEUR({
    expense: {
      source: 'offBank',
      amountEUR: -354.81,
      originalCurrency: 'XOF',
      originalAmount: 232739,
      fxRate: null,
      pendingConversion: false,
    },
    assignment: {
      amountEUR: -354.81,
      localPct: 100,
    },
    projectTC: null,
  });

  assert.equal(safeAmount, null);
});

test('demo off-bank expenses store runtime fxRate as EUR per local unit', () => {
  const expenses = generateOffBankExpenses('demo-org');
  const fxExpenses = expenses.filter((expense) => expense.originalCurrency && expense.fxRate);

  assert.ok(fxExpenses.length > 0);
  for (const expense of fxExpenses) {
    assert.ok(expense.fxRate! > 0);
    assert.ok(expense.fxRate! < 1);
  }

  const xofExpense = fxExpenses.find((expense) => expense.originalCurrency === 'XOF');
  assert.ok(xofExpense);
  assert.ok(Math.abs(xofExpense.fxRate! - (1 / 655.957)) < 0.000000001);
});
