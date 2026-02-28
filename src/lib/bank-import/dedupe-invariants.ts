import type { ClassifiedRow } from '@/lib/transaction-dedupe';

type ImportTx = ClassifiedRow['tx'];

export interface DedupeSearchRangeInput {
  date: string;
  operationDate?: string | null;
}

function toDateOnly(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnly = trimmed.split('T')[0];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null;
  return dateOnly;
}

/**
 * Contracte d'invariant d'importació:
 * - from = min(date, operationDate)
 * - to = max(date, operationDate)
 * - mai excloure el camp date del moviment.
 */
export function computeDedupeSearchRange(
  txs: DedupeSearchRangeInput[]
): { from: string; to: string } | null {
  const values = txs
    .flatMap((tx) => {
      const date = toDateOnly(tx.date);
      const operationDate = toDateOnly(tx.operationDate);
      const dates: string[] = [];

      if (date) dates.push(date);
      if (operationDate && operationDate !== date) dates.push(operationDate);

      return dates;
    })
    .sort((a, b) => a.localeCompare(b));

  if (values.length === 0) return null;

  return { from: values[0], to: values[values.length - 1] };
}

export interface ImportSelectionResult {
  transactionsToImport: ImportTx[];
  stats: {
    duplicateSkippedCount: number;
    candidateCount: number;
    candidateUserImportedCount: number;
    candidateUserSkippedCount: number;
  };
}

/**
 * Invariant IMP-2:
 * - DUPLICATE_CANDIDATE només s'importa si hi ha opt-in explícit.
 */
export function buildImportSelection(
  classifiedResults: ClassifiedRow[],
  selectedCandidateIndexes: number[]
): ImportSelectionResult {
  const candidates = classifiedResults.filter((c) => c.status === 'DUPLICATE_CANDIDATE');
  const newTxs = classifiedResults.filter((c) => c.status === 'NEW');
  const safeDupes = classifiedResults.filter((c) => c.status === 'DUPLICATE_SAFE');

  const selectedSet = new Set(
    selectedCandidateIndexes.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < candidates.length
    )
  );

  const candidatesToImport = candidates.filter((_, index) => selectedSet.has(index));

  return {
    transactionsToImport: [
      ...newTxs.map((c) => c.tx),
      ...candidatesToImport.map((c) => c.tx),
    ],
    stats: {
      duplicateSkippedCount: safeDupes.length,
      candidateCount: candidates.length,
      candidateUserImportedCount: candidatesToImport.length,
      candidateUserSkippedCount: candidates.length - candidatesToImport.length,
    },
  };
}
