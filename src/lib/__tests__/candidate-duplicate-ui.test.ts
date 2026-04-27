import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { ClassifiedRow } from '../transaction-dedupe';
import { getCandidateDuplicateUi } from '../candidate-duplicate-ui';

function makeCandidate(overrides: Partial<ClassifiedRow> = {}): ClassifiedRow {
  return {
    tx: {
      date: '2026-04-16T00:00:00.000Z',
      operationDate: '2026-04-16',
      description: 'COMISION DEVOL. RECIBOS',
      amount: -1.21,
      balanceAfter: 10274.04,
      category: null,
      document: null,
      contactId: null,
      bankAccountId: 'acc-1',
      source: 'bank',
      transactionType: 'normal',
    },
    status: 'DUPLICATE_CANDIDATE',
    reason: 'HEURISTIC_NEAR_DATE',
    matchedExistingIds: ['tx-existing'],
    matchedExisting: [{
      id: 'tx-existing',
      date: '2026-04-13T00:00:00.000Z',
      description: 'COMISION DEVOL. RECIBOS',
      amount: -1.21,
      operationDate: '2026-04-13',
      balanceAfter: 16546.5,
    }],
    rawRow: {},
    userDecision: null,
    ...overrides,
  };
}

describe('candidate duplicate UI mapping', () => {
  it('returns exact recent-days reason for 3-day match', () => {
    const ui = getCandidateDuplicateUi(makeCandidate());

    assert.equal(ui.statusFallback, 'Possible duplicat');
    assert.equal(ui.reasonKey, 'importers.transaction.summary.possibleDuplicate.reason.recentDays');
    assert.deepEqual(ui.reasonParams, { days: '3' });
    assert.equal(
      ui.tooltipKey,
      'importers.transaction.summary.possibleDuplicate.tooltip.balanceMismatch'
    );
  });

  it('falls back to generic recent reason when exact day diff is unavailable', () => {
    const ui = getCandidateDuplicateUi(makeCandidate({
      tx: {
        ...makeCandidate().tx,
        operationDate: undefined,
        date: '',
      },
      matchedExisting: [{
        ...makeCandidate().matchedExisting[0],
        operationDate: undefined,
        date: '',
      }],
    }));

    assert.equal(ui.reasonKey, 'importers.transaction.summary.possibleDuplicate.reason.recentGeneric');
    assert.deepEqual(ui.reasonParams, { days: '3' });
  });

  it('does not expose internal terminology in visible fallback copy', () => {
    const nearDateUi = getCandidateDuplicateUi(makeCandidate());
    const genericUi = getCandidateDuplicateUi(makeCandidate({ reason: 'HEURISTIC_BASE_KEY' }));
    const visibleCopy = [
      nearDateUi.statusFallback,
      nearDateUi.reasonFallback,
      nearDateUi.tooltipFallback,
      genericUi.reasonFallback,
      genericUi.tooltipFallback,
    ].join(' ').toLowerCase();

    assert.equal(visibleCopy.includes('heuristic'), false);
    assert.equal(visibleCopy.includes('heurística'), false);
    assert.equal(visibleCopy.includes('near-date'), false);
    assert.equal(visibleCopy.includes('candidate'), false);
  });
});
