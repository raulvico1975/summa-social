import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDeleteMovementsFamilyPlan,
  executeDeleteMovementsFamilyPlan,
  isBankImportJobDoc,
  isBankImportRunDoc,
} from '../danger-zone/delete-movements-family';

describe('delete movements family plan', () => {
  it('builds a deterministic plan with pending remittance docs and import metadata', () => {
    const plan = buildDeleteMovementsFamilyPlan({
      orgId: 'org-1',
      transactionIds: ['tx-1', 'tx-2', 'tx-2'],
      remittances: [
        { id: 'rem-1', pendingIds: ['p-1', 'p-2', 'p-2'] },
        { id: 'rem-2', pendingIds: [] },
      ],
      importRunIds: ['run-1'],
      importJobIds: ['job-1', 'job-1'],
    });

    assert.deepEqual(plan.transactionPaths, [
      'organizations/org-1/transactions/tx-1',
      'organizations/org-1/transactions/tx-2',
    ]);
    assert.deepEqual(plan.remittancePendingPaths, [
      'organizations/org-1/remittances/rem-1/pending/p-1',
      'organizations/org-1/remittances/rem-1/pending/p-2',
    ]);
    assert.deepEqual(plan.remittancePaths, [
      'organizations/org-1/remittances/rem-1',
      'organizations/org-1/remittances/rem-2',
    ]);
    assert.deepEqual(plan.importRunPaths, [
      'organizations/org-1/importRuns/run-1',
    ]);
    assert.deepEqual(plan.importJobPaths, [
      'organizations/org-1/importJobs/job-1',
    ]);
    assert.equal(plan.totalDeletes, 8);
  });

  it('executes deletion plan and leaves transactions/remittances/import metadata at 0', async () => {
    const orgId = 'org-1';
    const unrelatedPath = `organizations/${orgId}/contacts/c-1`;

    const plan = buildDeleteMovementsFamilyPlan({
      orgId,
      transactionIds: ['tx-1', 'tx-2'],
      remittances: [
        { id: 'rem-1', pendingIds: ['p-1'] },
      ],
      importRunIds: ['run-1'],
      importJobIds: ['job-1'],
    });

    const docs = new Set<string>([
      ...plan.transactionPaths,
      ...plan.remittancePendingPaths,
      ...plan.remittancePaths,
      ...plan.importRunPaths,
      ...plan.importJobPaths,
      unrelatedPath,
    ]);

    await executeDeleteMovementsFamilyPlan(
      plan,
      {
        deleteBatch: async (paths) => {
          for (const path of paths) docs.delete(path);
        },
      },
      2
    );

    const countPrefix = (prefix: string): number =>
      Array.from(docs).filter((path) => path.startsWith(prefix)).length;

    assert.equal(countPrefix(`organizations/${orgId}/transactions/`), 0);
    assert.equal(countPrefix(`organizations/${orgId}/remittances/`), 0);
    assert.equal(countPrefix(`organizations/${orgId}/importRuns/`), 0);
    assert.equal(countPrefix(`organizations/${orgId}/importJobs/`), 0);
    assert.equal(docs.has(unrelatedPath), true);
  });
});

describe('bank import metadata guards', () => {
  it('detects bank import runs', () => {
    assert.equal(isBankImportRunDoc({ type: 'bankTransactions' }), true);
    assert.equal(isBankImportRunDoc({ bankAccountId: 'acc-1' }), true);
    assert.equal(isBankImportRunDoc({ type: 'contacts' }), false);
  });

  it('detects bank import jobs', () => {
    assert.equal(isBankImportJobDoc({ type: 'bankTransactions' }), true);
    assert.equal(isBankImportJobDoc({ inputHash: 'abc' }), true);
    assert.equal(isBankImportJobDoc({ type: 'contacts' }), false);
  });
});
