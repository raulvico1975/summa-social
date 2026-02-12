import { describe, it, expect } from 'vitest';
import { computeDonorCollectionStatus } from '../../src/lib/sepa/pain008/donor-collection-status';

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
    expect(statusType('annual', '2025-10-15', '2026-03-01')).toBe('blocked');
  });

  it('due: lastRun oct-2025, collection oct-2026 (first day of due month)', () => {
    expect(statusType('annual', '2025-10-15', '2026-10-01')).toBe('due');
  });

  it('due: lastRun oct-2025, collection oct-2026 (any day, same month)', () => {
    expect(statusType('annual', '2025-10-15', '2026-10-31')).toBe('due');
  });

  it('blocked: lastRun oct-2025, collection sep-2026 (month before due)', () => {
    expect(statusType('annual', '2025-10-15', '2026-09-30')).toBe('blocked');
  });

  it('due: lastRun oct-2025, collection nov-2026 (past due month)', () => {
    expect(statusType('annual', '2025-10-15', '2026-11-01')).toBe('due');
  });
});

// -----------------------------------------------------------------------
// Semiannual (year-month interval: 6 months, day ignored)
// -----------------------------------------------------------------------
describe('semiannual — month-based interval', () => {
  it('blocked: lastRun aug-2025, collection jan-2026 (5 months)', () => {
    expect(statusType('semiannual', '2025-08-01', '2026-01-31')).toBe('blocked');
  });

  it('due: lastRun aug-2025, collection feb-2026 (6 months)', () => {
    expect(statusType('semiannual', '2025-08-01', '2026-02-01')).toBe('due');
  });

  it('due: lastRun sep-2025, collection mar-2026 (6 months)', () => {
    expect(statusType('semiannual', '2025-09-20', '2026-03-01')).toBe('due');
  });

  it('blocked: lastRun sep-2025, collection feb-2026 (5 months)', () => {
    expect(statusType('semiannual', '2025-09-20', '2026-02-28')).toBe('blocked');
  });
});

// -----------------------------------------------------------------------
// Quarterly (year-month interval: 3 months, day ignored)
// -----------------------------------------------------------------------
describe('quarterly — month-based interval', () => {
  it('blocked: lastRun dec-2025, collection feb-2026 (2 months)', () => {
    expect(statusType('quarterly', '2025-12-01', '2026-02-28')).toBe('blocked');
  });

  it('due: lastRun dec-2025, collection mar-2026 (3 months)', () => {
    expect(statusType('quarterly', '2025-12-01', '2026-03-01')).toBe('due');
  });

  it('due: lastRun nov-2025, collection feb-2026 (3 months)', () => {
    expect(statusType('quarterly', '2025-11-30', '2026-02-01')).toBe('due');
  });

  it('due: lastRun dec-2025, collection apr-2026 (4 months)', () => {
    expect(statusType('quarterly', '2025-12-05', '2026-04-01')).toBe('due');
  });
});

// -----------------------------------------------------------------------
// Monthly (year-month interval: 1 month, day ignored)
// -----------------------------------------------------------------------
describe('monthly — month-based interval', () => {
  it('blocked: same month (any days)', () => {
    expect(statusType('monthly', '2026-02-01', '2026-02-28')).toBe('blocked');
  });

  it('due: next month', () => {
    expect(statusType('monthly', '2026-02-28', '2026-03-01')).toBe('due');
  });

  it('due: two months later', () => {
    expect(statusType('monthly', '2026-01-15', '2026-03-01')).toBe('due');
  });

  it('blocked: lastRun later day same month still blocked', () => {
    expect(statusType('monthly', '2026-02-28', '2026-02-01')).toBe('blocked');
  });
});

// -----------------------------------------------------------------------
// Day is ignored: same month regardless of day
// -----------------------------------------------------------------------
describe('day ignored — month boundary matters, not day', () => {
  it('annual: first day of due month is already due', () => {
    // lastRun oct-2025, nextDueMonth = oct-2026
    // collection oct-2026 day 1 → due (same month as nextDue)
    expect(statusType('annual', '2025-10-15', '2026-10-01')).toBe('due');
  });

  it('annual: last day before due month is still blocked', () => {
    expect(statusType('annual', '2025-10-15', '2026-09-30')).toBe('blocked');
  });

  it('quarterly: day within month does not matter', () => {
    // lastRun dec-2025, nextDueMonth = mar-2026
    // Any day in mar-2026 is due
    expect(statusType('quarterly', '2025-12-31', '2026-03-01')).toBe('due');
    expect(statusType('quarterly', '2025-12-01', '2026-03-31')).toBe('due');
    // Any day in feb-2026 is blocked
    expect(statusType('quarterly', '2025-12-15', '2026-02-15')).toBe('blocked');
  });
});

// -----------------------------------------------------------------------
// Edge cases: never collected, no periodicity, manual
// -----------------------------------------------------------------------
describe('edge cases', () => {
  it('due when never collected (lastRun null)', () => {
    expect(statusType('annual', null, '2026-02-10')).toBe('due');
    expect(statusType('quarterly', null, '2026-02-10')).toBe('due');
    expect(statusType('monthly', null, '2026-02-10')).toBe('due');
    expect(statusType('semiannual', null, '2026-02-10')).toBe('due');
  });

  it('noPeriodicity when periodicityQuota is null', () => {
    expect(statusType(null, '2025-10-15', '2026-02-10')).toBe('noPeriodicity');
  });

  it('manual when periodicityQuota is manual', () => {
    expect(statusType('manual', '2025-10-15', '2026-02-10')).toBe('manual');
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
    expect(result.type).toBe('due');
    expect(result.periodicity).toBe('annual');
    expect(result.periodicityMonths).toBe(12);
    expect(result.lastRunLabel).toBeTruthy();
  });

  it('returns null lastRunLabel when never collected', () => {
    const result = computeDonorCollectionStatus(
      { periodicityQuota: 'quarterly', sepaPain008LastRunAt: null },
      '2026-01-15',
    );
    expect(result.type).toBe('due');
    expect(result.lastRunLabel).toBeNull();
    expect(result.periodicityMonths).toBe(3);
  });
});
