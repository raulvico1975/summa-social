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
// Annual (interval: 12 months from lastRun)
// -----------------------------------------------------------------------
describe('annual — interval-based', () => {
  it('blocked: lastRun oct-2025, collection feb-2026 (only 4 months)', () => {
    expect(statusType('annual', '2025-10-15', '2026-02-10')).toBe('blocked');
  });

  it('due: lastRun oct-2025, collection oct-2026 (exactly 12 months)', () => {
    expect(statusType('annual', '2025-10-15', '2026-10-15')).toBe('due');
  });

  it('due: lastRun oct-2025, collection nov-2026 (13 months)', () => {
    expect(statusType('annual', '2025-10-15', '2026-11-01')).toBe('due');
  });

  it('blocked: lastRun oct-2025, collection oct-2026 minus 1 day', () => {
    expect(statusType('annual', '2025-10-15', '2026-10-14')).toBe('blocked');
  });
});

// -----------------------------------------------------------------------
// Semiannual (interval: 6 months from lastRun)
// -----------------------------------------------------------------------
describe('semiannual — interval-based', () => {
  it('blocked: lastRun aug-2025, collection jan-2026 (5 months + 30 days)', () => {
    expect(statusType('semiannual', '2025-08-01', '2026-01-31')).toBe('blocked');
  });

  it('due: lastRun aug-2025, collection feb-2026 (exactly 6 months)', () => {
    expect(statusType('semiannual', '2025-08-01', '2026-02-01')).toBe('due');
  });

  it('due: lastRun aug-2025, collection mar-2026', () => {
    expect(statusType('semiannual', '2025-08-01', '2026-03-15')).toBe('due');
  });
});

// -----------------------------------------------------------------------
// Quarterly (interval: 3 months from lastRun)
// -----------------------------------------------------------------------
describe('quarterly — interval-based', () => {
  it('blocked: lastRun dec-2025, collection mar-2026 minus 1 day', () => {
    expect(statusType('quarterly', '2025-12-05', '2026-03-04')).toBe('blocked');
  });

  it('due: lastRun dec-2025, collection mar-2026 (exactly 3 months)', () => {
    expect(statusType('quarterly', '2025-12-05', '2026-03-05')).toBe('due');
  });

  it('due: lastRun dec-2025, collection apr-2026', () => {
    expect(statusType('quarterly', '2025-12-05', '2026-04-01')).toBe('due');
  });
});

// -----------------------------------------------------------------------
// Monthly (natural month — preserved behaviour)
// -----------------------------------------------------------------------
describe('monthly — natural month', () => {
  it('blocked: same month', () => {
    expect(statusType('monthly', '2026-02-01', '2026-02-28')).toBe('blocked');
  });

  it('due: next month', () => {
    expect(statusType('monthly', '2026-02-01', '2026-03-01')).toBe('due');
  });

  it('due: month after next', () => {
    expect(statusType('monthly', '2026-01-15', '2026-03-01')).toBe('due');
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
  });

  it('noPeriodicity when periodicityQuota is null', () => {
    expect(statusType(null, '2025-10-15', '2026-02-10')).toBe('noPeriodicity');
  });

  it('manual when periodicityQuota is manual', () => {
    expect(statusType('manual', '2025-10-15', '2026-02-10')).toBe('manual');
  });
});

// -----------------------------------------------------------------------
// Day clamping (addMonthsUTC correctness)
// -----------------------------------------------------------------------
describe('day clamping for interval calculation', () => {
  it('quarterly from Jan 31 → next due Apr 30 (clamped)', () => {
    // Jan 31 + 3 months = Apr 31 → clamped to Apr 30
    expect(statusType('quarterly', '2026-01-31', '2026-04-29')).toBe('blocked');
    expect(statusType('quarterly', '2026-01-31', '2026-04-30')).toBe('due');
  });

  it('semiannual from Aug 31 → next due Feb 28 (non-leap clamped)', () => {
    // Aug 31 + 6 months = Feb 31 → clamped to Feb 28 (2027 non-leap)
    expect(statusType('semiannual', '2026-08-31', '2027-02-27')).toBe('blocked');
    expect(statusType('semiannual', '2026-08-31', '2027-02-28')).toBe('due');
  });

  it('annual from Feb 29 (leap) → next due Feb 28 (non-leap clamped)', () => {
    // 2024-02-29 + 12 months = 2025-02-29 → clamped to 2025-02-28
    expect(statusType('annual', '2024-02-29', '2025-02-27')).toBe('blocked');
    expect(statusType('annual', '2024-02-29', '2025-02-28')).toBe('due');
  });
});

// -----------------------------------------------------------------------
// Full result object shape
// -----------------------------------------------------------------------
describe('result object shape', () => {
  it('returns complete status object for interval-based due', () => {
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
