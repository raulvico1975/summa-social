/**
 * Pure function to compute whether a donor is due for SEPA collection
 * based on their periodicity and last collection date.
 *
 * Rules:
 *  - periodicityQuota null/undefined → noPeriodicity
 *  - periodicityQuota === 'manual'  → manual
 *  - No lastRun                     → due (never collected = always due)
 *  - monthly: natural month comparison (same month = blocked, different = due)
 *  - quarterly/semiannual/annual: interval-based from sepaPain008LastRunAt
 *    → nextDue = addMonths(lastRunAt, N) where N = 3/6/12
 *    → due if collectionDate >= nextDue, blocked otherwise
 */

export type CollectionStatusType =
  | 'due'
  | 'blocked'
  | 'manual'
  | 'noPeriodicity';

export interface DonorCollectionStatus {
  type: CollectionStatusType;
  /** Formatted label for last collection, e.g. "gen. 2025", or null if never collected */
  lastRunLabel: string | null;
  /** Raw periodicity value from donor, or null */
  periodicity: string | null;
  /** Months between collections (1, 3, 6, 12), or null for manual/noPeriodicity */
  periodicityMonths: number | null;
}

export const PERIODICITY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Parse YYYY-MM-DD to a Date at midnight UTC */
function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Format YYYY-MM-DD as short month + year in Catalan locale, e.g. "gen. 2025" */
function formatDateLabel(dateStr: string): string | null {
  if (!dateStr) return null;
  try {
    const d = parseDate(dateStr); // UTC-safe
    return d.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric', timeZone: 'UTC' });
  } catch {
    return null;
  }
}

/**
 * Get a natural month key: "YYYY-MM". Used only for monthly periodicity.
 */
function getMonthKey(dateStr: string): string {
  const d = parseDate(dateStr);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

/**
 * Add N months to a YYYY-MM-DD date, clamping the day if needed.
 * E.g. addMonthsUTC("2025-01-31", 1) → Date for 2025-02-28 (not Mar 3).
 * No external dependencies.
 */
function addMonthsUTC(dateStr: string, n: number): Date {
  const d = parseDate(dateStr);
  const originalDay = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + n);
  // If day changed, JS overflowed into the next month → clamp to last day
  if (d.getUTCDate() !== originalDay) {
    d.setUTCDate(0); // last day of the intended month
  }
  return d;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

export function computeDonorCollectionStatus(
  donor: {
    periodicityQuota?: string | null;
    sepaPain008LastRunAt?: string | null;
  },
  collectionDate: string, // YYYY-MM-DD
): DonorCollectionStatus {
  const periodicity = donor.periodicityQuota ?? null;

  // No periodicity set → noPeriodicity
  if (!periodicity) {
    return {
      type: 'noPeriodicity',
      lastRunLabel: formatDateLabel(donor.sepaPain008LastRunAt ?? ''),
      periodicity: null,
      periodicityMonths: null,
    };
  }

  // Manual → manual
  if (periodicity === 'manual') {
    return {
      type: 'manual',
      lastRunLabel: formatDateLabel(donor.sepaPain008LastRunAt ?? ''),
      periodicity: 'manual',
      periodicityMonths: null,
    };
  }

  const months = PERIODICITY_MONTHS[periodicity];
  if (!months) {
    // Unknown periodicity value → treat as noPeriodicity
    return {
      type: 'noPeriodicity',
      lastRunLabel: formatDateLabel(donor.sepaPain008LastRunAt ?? ''),
      periodicity,
      periodicityMonths: null,
    };
  }

  const lastRunLabel = formatDateLabel(donor.sepaPain008LastRunAt ?? '');

  // Never collected → due
  if (!donor.sepaPain008LastRunAt) {
    return {
      type: 'due',
      lastRunLabel: null,
      periodicity,
      periodicityMonths: months,
    };
  }

  // Monthly: natural month comparison (avoids drift, matches user expectation)
  if (months === 1) {
    const lastMonth = getMonthKey(donor.sepaPain008LastRunAt);
    const currentMonth = getMonthKey(collectionDate);
    return {
      type: currentMonth === lastMonth ? 'blocked' : 'due',
      lastRunLabel,
      periodicity,
      periodicityMonths: months,
    };
  }

  // Quarterly / Semiannual / Annual: interval anchored to last run
  const nextDue = addMonthsUTC(donor.sepaPain008LastRunAt, months);
  const collection = parseDate(collectionDate);
  return {
    type: collection >= nextDue ? 'due' : 'blocked',
    lastRunLabel,
    periodicity,
    periodicityMonths: months,
  };
}
