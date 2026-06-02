import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSepaCollectionCorrectionFields } from '../../src/lib/sepa/pain008/correction';
import {
  normalizeSepaCollectionRunStatus,
  splitSepaCollectionRunHistorySummaries,
  type SepaCollectionRunHistorySummary,
} from '../../src/lib/sepa/pain008/run-history';
import {
  decideDonorVoidRollback,
  findPreviousActiveSepaRunForContact,
  hasLaterActiveSepaRunForContact,
  type VoidRunCandidate,
} from '../../src/lib/sepa/pain008/void-run';

function makeSummary(
  id: string,
  status: 'exported' | 'voided'
): SepaCollectionRunHistorySummary {
  return {
    id,
    status,
    scheme: 'CORE',
    bankAccountId: 'bank-1',
    collectionDate: '2026-06-01',
    createdAt: '2026-06-01T08:00:00.000Z',
    exportedAt: '2026-06-01T08:00:00.000Z',
    itemCount: 1,
    includedCount: 1,
    excludedCount: 0,
    totalCents: 1000,
    filename: `${id}.xml`,
    storagePath: `runs/${id}.xml`,
    messageId: `MSG-${id}`,
    voidedAt: null,
    voidedByUid: null,
    voidReason: null,
    correctedFromRunId: null,
    correctedByRunId: null,
  };
}

describe('normalizeSepaCollectionRunStatus', () => {
  it('tracta status absent com exported', () => {
    assert.equal(normalizeSepaCollectionRunStatus(undefined), 'exported');
  });

  it('manté exported i voided', () => {
    assert.equal(normalizeSepaCollectionRunStatus('exported'), 'exported');
    assert.equal(normalizeSepaCollectionRunStatus('voided'), 'voided');
  });
});

describe('void run donor rollback', () => {
  it('restaura snapshot previ si existeix', () => {
    const decision = decideDonorVoidRollback({
      runId: 'run-jun',
      runCollectionDate: '2026-06-01',
      includedItem: {
        contactId: 'donor-1',
        amountCents: 1000,
        umr: 'UMR-1',
        sequenceType: 'RCUR',
        previousSepaPain008LastRunAt: '2026-05-05',
        previousSepaPain008LastRunId: 'run-may',
      },
      contact: {
        id: 'donor-1',
        sepaPain008LastRunAt: '2026-06-01',
        sepaPain008LastRunId: 'run-jun',
      },
      previousRun: null,
      hasLaterActiveRun: false,
    });

    assert.deepEqual(decision, {
      action: 'restore',
      sepaPain008LastRunAt: '2026-05-05',
      sepaPain008LastRunId: 'run-may',
      reason: 'snapshot',
    });
  });

  it('restaura legacy mateix mes cap a execució anterior o null', () => {
    const runs: VoidRunCandidate[] = [
      {
        id: 'run-may',
        status: 'exported',
        collectionDate: '2026-05-05',
        included: [{ contactId: 'donor-1', amountCents: 1000, umr: 'UMR-1', sequenceType: 'RCUR' }],
      },
      {
        id: 'run-jun',
        status: 'exported',
        collectionDate: '2026-06-01',
        included: [{ contactId: 'donor-1', amountCents: 1000, umr: 'UMR-1', sequenceType: 'RCUR' }],
      },
    ];
    const previousRun = findPreviousActiveSepaRunForContact(runs, 'donor-1', 'run-jun', '2026-06-01');
    const decision = decideDonorVoidRollback({
      runId: 'run-jun',
      runCollectionDate: '2026-06-01',
      includedItem: { contactId: 'donor-1', amountCents: 1000, umr: 'UMR-1', sequenceType: 'RCUR' },
      contact: {
        id: 'donor-1',
        sepaPain008LastRunAt: '2026-06-01',
        sepaPain008LastRunId: null,
      },
      previousRun,
      hasLaterActiveRun: false,
    });

    assert.deepEqual(decision, {
      action: 'restore',
      sepaPain008LastRunAt: '2026-05-05',
      sepaPain008LastRunId: 'run-may',
      reason: 'legacy-same-month',
    });
  });

  it('no modifica el soci si hi ha una execució posterior activa', () => {
    const runs: VoidRunCandidate[] = [
      {
        id: 'run-jul',
        status: 'exported',
        collectionDate: '2026-07-01',
        included: [{ contactId: 'donor-1', amountCents: 1000, umr: 'UMR-1', sequenceType: 'RCUR' }],
      },
    ];
    const hasLater = hasLaterActiveSepaRunForContact(
      runs,
      { id: 'donor-1', sepaPain008LastRunAt: '2026-07-01', sepaPain008LastRunId: 'run-jul' },
      'run-jun',
      '2026-06-01'
    );
    const decision = decideDonorVoidRollback({
      runId: 'run-jun',
      runCollectionDate: '2026-06-01',
      includedItem: {
        contactId: 'donor-1',
        amountCents: 1000,
        umr: 'UMR-1',
        sequenceType: 'RCUR',
        previousSepaPain008LastRunAt: '2026-05-05',
        previousSepaPain008LastRunId: 'run-may',
      },
      contact: { id: 'donor-1', sepaPain008LastRunAt: '2026-07-01', sepaPain008LastRunId: 'run-jul' },
      previousRun: { id: 'run-may', collectionDate: '2026-05-05' },
      hasLaterActiveRun: hasLater,
    });

    assert.equal(hasLater, true);
    assert.deepEqual(decision, { action: 'skip', reason: 'later-active-run' });
  });
});

describe('historial i regeneració', () => {
  it('separa runs anul·lats del llistat principal', () => {
    const split = splitSepaCollectionRunHistorySummaries([
      makeSummary('run-active', 'exported'),
      makeSummary('run-voided', 'voided'),
    ]);

    assert.deepEqual(split.active.map((run) => run.id), ['run-active']);
    assert.deepEqual(split.voided.map((run) => run.id), ['run-voided']);
  });

  it('desa correctedFromRunId quan la nova remesa ve de regeneració', () => {
    assert.deepEqual(buildSepaCollectionCorrectionFields('run-voided'), {
      correctedFromRunId: 'run-voided',
    });
  });
});
