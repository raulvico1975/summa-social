import type { ClassifiedRow } from './transaction-dedupe';

const RECENT_DAYS_WINDOW = 3;

export interface CandidateDuplicateUi {
  statusKey: string;
  statusFallback: string;
  reasonKey: string;
  reasonFallback: string;
  reasonParams: Record<string, string>;
  tooltipKey: string;
  tooltipFallback: string;
  infoLabelKey: string;
  infoLabelFallback: string;
}

function toDateOnly(value: string | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = trimmed.split('T')[0];
  return /^\d{4}-\d{2}-\d{2}$/.test(dateOnly) ? dateOnly : null;
}

function getComparableDate(
  value: Pick<ClassifiedRow['tx'], 'date' | 'operationDate'>
): string | null {
  return toDateOnly(value.operationDate) || toDateOnly(value.date);
}

function getAbsDayDiff(dateA: string, dateB: string): number | null {
  const aMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateA);
  const bMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateB);
  if (!aMatch || !bMatch) return null;

  const aMs = Date.UTC(Number(aMatch[1]), Number(aMatch[2]) - 1, Number(aMatch[3]));
  const bMs = Date.UTC(Number(bMatch[1]), Number(bMatch[2]) - 1, Number(bMatch[3]));
  const diffMs = Math.abs(aMs - bMs);

  return Math.round(diffMs / (24 * 60 * 60 * 1000));
}

function hasBalanceMismatch(candidate: ClassifiedRow): boolean {
  const existingBalance = candidate.matchedExisting[0]?.balanceAfter;
  const incomingBalance = candidate.tx.balanceAfter;

  if (typeof existingBalance !== 'number' || !Number.isFinite(existingBalance)) return false;
  if (typeof incomingBalance !== 'number' || !Number.isFinite(incomingBalance)) return false;

  return Math.round(existingBalance * 100) !== Math.round(incomingBalance * 100);
}

function buildRecentReason(candidate: ClassifiedRow): Pick<CandidateDuplicateUi, 'reasonKey' | 'reasonFallback' | 'reasonParams'> {
  const existing = candidate.matchedExisting[0];
  if (!existing) {
    return {
      reasonKey: 'importers.transaction.summary.possibleDuplicate.reason.recentGeneric',
      reasonFallback: `Mateix import i descripció; hi ha un moviment semblant dins dels últims ${RECENT_DAYS_WINDOW} dies`,
      reasonParams: { days: String(RECENT_DAYS_WINDOW) },
    };
  }

  const incomingDate = getComparableDate(candidate.tx);
  const existingDate = getComparableDate({
    date: existing.date,
    operationDate: existing.operationDate,
  });

  if (!incomingDate || !existingDate) {
    return {
      reasonKey: 'importers.transaction.summary.possibleDuplicate.reason.recentGeneric',
      reasonFallback: `Mateix import i descripció; hi ha un moviment semblant dins dels últims ${RECENT_DAYS_WINDOW} dies`,
      reasonParams: { days: String(RECENT_DAYS_WINDOW) },
    };
  }

  const dayDiff = getAbsDayDiff(incomingDate, existingDate);
  if (dayDiff === null || dayDiff < 1 || dayDiff > RECENT_DAYS_WINDOW) {
    return {
      reasonKey: 'importers.transaction.summary.possibleDuplicate.reason.recentGeneric',
      reasonFallback: `Mateix import i descripció; hi ha un moviment semblant dins dels últims ${RECENT_DAYS_WINDOW} dies`,
      reasonParams: { days: String(RECENT_DAYS_WINDOW) },
    };
  }

  if (dayDiff === 1) {
    return {
      reasonKey: 'importers.transaction.summary.possibleDuplicate.reason.recentOneDay',
      reasonFallback: 'Mateix import i descripció; hi ha un moviment semblant fa 1 dia',
      reasonParams: {},
    };
  }

  return {
    reasonKey: 'importers.transaction.summary.possibleDuplicate.reason.recentDays',
    reasonFallback: 'Mateix import i descripció; hi ha un moviment semblant fa {days} dies',
    reasonParams: { days: String(dayDiff) },
  };
}

export function getCandidateDuplicateUi(candidate: ClassifiedRow): CandidateDuplicateUi {
  const reason = candidate.reason === 'HEURISTIC_NEAR_DATE'
    ? buildRecentReason(candidate)
    : {
      reasonKey: 'importers.transaction.summary.possibleDuplicate.reason.generic',
      reasonFallback: "S'assembla a un moviment existent; revisa'l abans d'importar",
      reasonParams: {},
    };

  const tooltip = hasBalanceMismatch(candidate)
    ? {
      tooltipKey: 'importers.transaction.summary.possibleDuplicate.tooltip.balanceMismatch',
      tooltipFallback: "Com que el saldo no coincideix, no el podem marcar com a duplicat segur. Revisa'l abans de decidir si l'importes.",
    }
    : {
      tooltipKey: 'importers.transaction.summary.possibleDuplicate.tooltip.generic',
      tooltipFallback: "No el podem marcar com a duplicat segur. Revisa'l abans de decidir si l'importes.",
    };

  return {
    statusKey: 'importers.transaction.summary.possibleDuplicate.status',
    statusFallback: 'Possible duplicat',
    infoLabelKey: 'importers.transaction.summary.possibleDuplicate.infoLabel',
    infoLabelFallback: "Més informació sobre aquest possible duplicat",
    ...reason,
    ...tooltip,
  };
}
