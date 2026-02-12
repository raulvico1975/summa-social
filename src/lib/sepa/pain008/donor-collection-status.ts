/**
 * Pure function to compute whether a donor is due for SEPA collection
 * based on their periodicity and last collection date.
 *
 * Rules:
 *  - periodicityQuota null/undefined → noPeriodicity
 *  - periodicityQuota === 'manual'  → manual
 *  - No lastRun                     → due (never collected = always due)
 *  - All periodicities: year-month comparison (day is ignored)
 *    → nextDueMonth = addMonths(YYYY-MM(lastRun), N) where N = 1/3/6/12
 *    → due if YYYY-MM(collectionDate) >= nextDueMonth, blocked otherwise
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

type YearMonth = { y: number; m: number }; // m: 1..12

/** Extract year and month (1..12) from YYYY-MM-DD, ignoring the day */
function toYearMonth(isoDate: string): YearMonth {
  const d = parseDate(isoDate);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 };
}

/** Add delta months to a YearMonth */
function addMonthsYM(ym: YearMonth, delta: number): YearMonth {
  const total = ym.y * 12 + (ym.m - 1) + delta;
  return { y: Math.floor(total / 12), m: (total % 12) + 1 };
}

/** Compare two YearMonths: -1 if a<b, 0 if equal, 1 if a>b */
function cmpYM(a: YearMonth, b: YearMonth): number {
  if (a.y !== b.y) return a.y < b.y ? -1 : 1;
  if (a.m !== b.m) return a.m < b.m ? -1 : 1;
  return 0;
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

  // Year-month comparison (day ignored) for all periodicities
  const lastYM = toYearMonth(donor.sepaPain008LastRunAt);
  const colYM = toYearMonth(collectionDate);
  const nextYM = addMonthsYM(lastYM, months);
  return {
    type: cmpYM(colYM, nextYM) >= 0 ? 'due' : 'blocked',
    lastRunLabel,
    periodicity,
    periodicityMonths: months,
  };
}
