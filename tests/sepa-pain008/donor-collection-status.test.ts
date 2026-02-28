import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  computeDonorCollectionStatus,
  PERIODICITY_MONTHS,
} from '../../src/lib/sepa/pain008/donor-collection-status';

// Helper: shorthand to get just the status type
function statusType(
  periodicity: string | null,
  lastRun: string | null,
  collectionDate: string,
): string {
  return computeDonorCollectionStatus(
    { periodicityQuota: periodicity, sepaPain008LastRunAt: lastRun },
    collectionDate,
  ).type;
}

// -----------------------------------------------------------------------
// Annual (year-month interval: 12 months, day ignored)
// -----------------------------------------------------------------------
describe('annual — month-based interval', () => {
  it('blocked: lastRun oct-2025, collection mar-2026 (only 5 months)', () => {
    assert.equal(statusType('annual', '2025-10-15', '2026-03-01'), 'blocked');
  });

  it('due: lastRun oct-2025, collection oct-2026 (first day of due month)', () => {
    assert.equal(statusType('annual', '2025-10-15', '2026-10-01'), 'due');
  });

  it('due: lastRun oct-2025, collection oct-2026 (any day, same month)', () => {
    assert.equal(statusType('annual', '2025-10-15', '2026-10-31'), 'due');
  });

  it('blocked: lastRun oct-2025, collection sep-2026 (month before due)', () => {
    assert.equal(statusType('annual', '2025-10-15', '2026-09-30'), 'blocked');
  });

  it('due: lastRun oct-2025, collection nov-2026 (past due month)', () => {
    assert.equal(statusType('annual', '2025-10-15', '2026-11-01'), 'due');
  });
});

// -----------------------------------------------------------------------
// Semiannual (year-month interval: 6 months, day ignored)
// -----------------------------------------------------------------------
describe('semiannual — month-based interval', () => {
  it('blocked: lastRun aug-2025, collection jan-2026 (5 months)', () => {
    assert.equal(statusType('semiannual', '2025-08-01', '2026-01-31'), 'blocked');
  });

  it('due: lastRun aug-2025, collection feb-2026 (6 months)', () => {
    assert.equal(statusType('semiannual', '2025-08-01', '2026-02-01'), 'due');
  });

  it('due: lastRun sep-2025, collection mar-2026 (6 months)', () => {
    assert.equal(statusType('semiannual', '2025-09-20', '2026-03-01'), 'due');
  });

  it('blocked: lastRun sep-2025, collection feb-2026 (5 months)', () => {
    assert.equal(statusType('semiannual', '2025-09-20', '2026-02-28'), 'blocked');
  });
});

// -----------------------------------------------------------------------
// Quarterly (year-month interval: 3 months, day ignored)
// -----------------------------------------------------------------------
describe('quarterly — month-based interval', () => {
  it('blocked: lastRun dec-2025, collection feb-2026 (2 months)', () => {
    assert.equal(statusType('quarterly', '2025-12-01', '2026-02-28'), 'blocked');
  });

  it('due: lastRun dec-2025, collection mar-2026 (3 months)', () => {
    assert.equal(statusType('quarterly', '2025-12-01', '2026-03-01'), 'due');
  });

  it('due: lastRun nov-2025, collection feb-2026 (3 months)', () => {
    assert.equal(statusType('quarterly', '2025-11-30', '2026-02-01'), 'due');
  });

  it('due: lastRun dec-2025, collection apr-2026 (4 months)', () => {
    assert.equal(statusType('quarterly', '2025-12-05', '2026-04-01'), 'due');
  });
});

// -----------------------------------------------------------------------
// Monthly (year-month interval: 1 month, day ignored)
// -----------------------------------------------------------------------
describe('monthly — month-based interval', () => {
  it('blocked: same month (any days)', () => {
    assert.equal(statusType('monthly', '2026-02-01', '2026-02-28'), 'blocked');
  });

  it('due: next month', () => {
    assert.equal(statusType('monthly', '2026-02-28', '2026-03-01'), 'due');
  });

  it('due: two months later', () => {
    assert.equal(statusType('monthly', '2026-01-15', '2026-03-01'), 'due');
  });

  it('blocked: lastRun later day same month still blocked', () => {
    assert.equal(statusType('monthly', '2026-02-28', '2026-02-01'), 'blocked');
  });
});

// -----------------------------------------------------------------------
// Day is ignored: same month regardless of day
// -----------------------------------------------------------------------
describe('day ignored — month boundary matters, not day', () => {
  it('annual: first day of due month is already due', () => {
    // lastRun oct-2025, nextDueMonth = oct-2026
    // collection oct-2026 day 1 → due (same month as nextDue)
    assert.equal(statusType('annual', '2025-10-15', '2026-10-01'), 'due');
  });

  it('annual: last day before due month is still blocked', () => {
    assert.equal(statusType('annual', '2025-10-15', '2026-09-30'), 'blocked');
  });

  it('quarterly: day within month does not matter', () => {
    // lastRun dec-2025, nextDueMonth = mar-2026
    // Any day in mar-2026 is due
    assert.equal(statusType('quarterly', '2025-12-31', '2026-03-01'), 'due');
    assert.equal(statusType('quarterly', '2025-12-01', '2026-03-31'), 'due');
    // Any day in feb-2026 is blocked
    assert.equal(statusType('quarterly', '2025-12-15', '2026-02-15'), 'blocked');
  });
});

// -----------------------------------------------------------------------
// Edge cases: never collected, no periodicity, manual
// -----------------------------------------------------------------------
describe('edge cases', () => {
  it('due when never collected (lastRun null)', () => {
    assert.equal(statusType('annual', null, '2026-02-10'), 'due');
    assert.equal(statusType('quarterly', null, '2026-02-10'), 'due');
    assert.equal(statusType('monthly', null, '2026-02-10'), 'due');
    assert.equal(statusType('semiannual', null, '2026-02-10'), 'due');
  });

  it('noPeriodicity when periodicityQuota is null', () => {
    assert.equal(statusType(null, '2025-10-15', '2026-02-10'), 'noPeriodicity');
  });

  it('manual when periodicityQuota is manual', () => {
    assert.equal(statusType('manual', '2025-10-15', '2026-02-10'), 'manual');
  });

  it('unknown periodicity behaves as noPeriodicity', () => {
    const result = computeDonorCollectionStatus(
      { periodicityQuota: 'biweekly' as unknown as string, sepaPain008LastRunAt: '2025-10-15' },
      '2026-02-10',
    );
    assert.equal(result.type, 'noPeriodicity');
    assert.equal(result.periodicity, 'biweekly');
    assert.equal(result.periodicityMonths, null);
  });
});

// -----------------------------------------------------------------------
// Full result object shape
// -----------------------------------------------------------------------
describe('result object shape', () => {
  it('returns complete status object for due', () => {
    const result = computeDonorCollectionStatus(
      { periodicityQuota: 'annual', sepaPain008LastRunAt: '2025-01-15' },
      '2026-01-15',
    );
    assert.equal(result.type, 'due');
    assert.equal(result.periodicity, 'annual');
    assert.equal(result.periodicityMonths, 12);
    assert.ok(Boolean(result.lastRunLabel));
  });

  it('returns null lastRunLabel when never collected', () => {
    const result = computeDonorCollectionStatus(
      { periodicityQuota: 'quarterly', sepaPain008LastRunAt: null },
      '2026-01-15',
    );
    assert.equal(result.type, 'due');
    assert.equal(result.lastRunLabel, null);
    assert.equal(result.periodicityMonths, 3);
  });
});

describe('PERIODICITY_MONTHS', () => {
  it('maps each supported periodicity to expected months', () => {
    assert.equal(PERIODICITY_MONTHS.monthly, 1);
    assert.equal(PERIODICITY_MONTHS.quarterly, 3);
    assert.equal(PERIODICITY_MONTHS.semiannual, 6);
    assert.equal(PERIODICITY_MONTHS.annual, 12);
  });
});
