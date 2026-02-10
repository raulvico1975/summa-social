/**
 * Pure function to compute whether a donor is due for SEPA collection
 * based on their periodicity and last collection date.
 *
 * Rules:
 *  - periodicityQuota null/undefined → noPeriodicity
 *  - periodicityQuota === 'manual'  → manual
 *  - No lastRun                     → due (never collected = always due)
 *  - collectionDate < nextDue       → blocked
 *  - collectionDate === nextDue     → due
 *  - collectionDate > nextDue       → overdue
 */

export type CollectionStatusType =
  | 'due'
  | 'blocked'
  | 'overdue'
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
  /** How many months overdue (only present when type === 'overdue') */
  monthsOverdue?: number;
  /** How many months until due (only present when type === 'blocked') */
  monthsUntilDue?: number;
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

/** Add N calendar months (clamp day to month-end if needed) */
function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  const targetMonth = result.getUTCMonth() + months;
  result.setUTCMonth(targetMonth);
  // If the day overflowed (e.g. Jan 31 + 1 month → Mar 3), clamp to last day
  if (result.getUTCDate() !== date.getUTCDate()) {
    result.setUTCDate(0); // last day of previous month
  }
  return result;
}

/**
 * Whole-month difference (floor).
 * Positive when `to` is after `from`.
 */
function monthsBetween(from: Date, to: Date): number {
  return (
    (to.getUTCFullYear() - from.getUTCFullYear()) * 12 +
    (to.getUTCMonth() - from.getUTCMonth())
  );
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

  const lastRun = parseDate(donor.sepaPain008LastRunAt);
  const collection = parseDate(collectionDate);
  const nextDue = addMonths(lastRun, months);

  // Compare dates (day precision)
  if (collection < nextDue) {
    // Blocked: too early
    const mUntil = monthsBetween(collection, nextDue);
    return {
      type: 'blocked',
      lastRunLabel,
      periodicity,
      periodicityMonths: months,
      monthsUntilDue: Math.max(mUntil, 0),
    };
  }

  if (collection > nextDue) {
    // Overdue
    const mOver = monthsBetween(nextDue, collection);
    return {
      type: 'overdue',
      lastRunLabel,
      periodicity,
      periodicityMonths: months,
      monthsOverdue: Math.max(mOver, 0),
    };
  }

  // Exactly on due date
  return {
    type: 'due',
    lastRunLabel,
    periodicity,
    periodicityMonths: months,
  };
}
