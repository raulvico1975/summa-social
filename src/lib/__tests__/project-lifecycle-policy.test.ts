import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveProjectDeletePolicy } from '@/lib/project-module/project-lifecycle-policy';

test('allows deleting a project with no linked operational data', () => {
  assert.deepEqual(
    resolveProjectDeletePolicy({
      assignmentCount: 0,
      budgetLineCount: 0,
      fxTransferCount: 0,
      transactionCount: 0,
    }),
    {
      canDelete: true,
      blockers: [],
    }
  );
});

test('blocks deleting a project with expense assignments', () => {
  assert.deepEqual(
    resolveProjectDeletePolicy({
      assignmentCount: 1,
      budgetLineCount: 0,
      fxTransferCount: 0,
      transactionCount: 0,
    }),
    {
      canDelete: false,
      blockers: ['assignments'],
    }
  );
});

test('blocks deleting a project with budget lines or FX transfers', () => {
  assert.deepEqual(
    resolveProjectDeletePolicy({
      assignmentCount: 0,
      budgetLineCount: 2,
      fxTransferCount: 1,
      transactionCount: 0,
    }),
    {
      canDelete: false,
      blockers: ['budgetLines', 'fxTransfers'],
    }
  );
});

test('blocks deleting a project with linked legacy transactions', () => {
  assert.deepEqual(
    resolveProjectDeletePolicy({
      assignmentCount: 0,
      budgetLineCount: 0,
      fxTransferCount: 0,
      transactionCount: 1,
    }),
    {
      canDelete: false,
      blockers: ['transactions'],
    }
  );
});
