/**
 * Pure function to compute whether a donor is due for SEPA collection
 * based on their periodicity and last collection date.
 *
 * Rules (natural periods):
 *  - periodicityQuota null/undefined → noPeriodicity
 *  - periodicityQuota === 'manual'  → manual
 *  - No lastRun                     → due (never collected = always due)
 *  - Same period as lastRun         → blocked (already collected this period)
 *  - Different (later) period       → due
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
 * Get a natural period key for a given date and periodicity.
 * Lexicographic comparison works because year comes first.
 *
 *  monthly    → "2026-02"
 *  quarterly  → "2026-Q1" (jan-mar), "2026-Q2" (apr-jun), etc.
 *  semiannual → "2026-H1" (jan-jun), "2026-H2" (jul-dec)
 *  annual     → "2026"
 */
function getPeriodKey(dateStr: string, months: number): string {
  const d = parseDate(dateStr);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth() + 1; // 1-12

  if (months === 1) return `${y}-${String(m).padStart(2, '0')}`;
  if (months === 3) return `${y}-Q${Math.ceil(m / 3)}`;
  if (months === 6) return `${y}-H${m <= 6 ? 1 : 2}`;
  if (months === 12) return `${y}`;
  return `${y}-${String(m).padStart(2, '0')}`; // fallback: monthly
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

  // Compare natural periods
  const lastPeriod = getPeriodKey(donor.sepaPain008LastRunAt, months);
  const currentPeriod = getPeriodKey(collectionDate, months);

  if (currentPeriod === lastPeriod) {
    // Already collected in this period
    return {
      type: 'blocked',
      lastRunLabel,
      periodicity,
      periodicityMonths: months,
    };
  }

  // Different period (currentPeriod > lastPeriod) → due
  return {
    type: 'due',
    lastRunLabel,
    periodicity,
    periodicityMonths: months,
  };
}
