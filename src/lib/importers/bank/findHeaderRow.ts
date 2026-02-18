const HEADER_SCAN_LIMIT = 20;
const CORE_MATCH_WEIGHT = 2;
const OPTIONAL_MATCH_WEIGHT = 1;
const MIN_CORE_CATEGORIES = 2;
const MIN_TOTAL_SCORE = 4;

type HeaderCategory = 'date' | 'description' | 'amount' | 'balance' | 'reference';

const HEADER_KEYWORDS: Record<HeaderCategory, string[]> = {
  date: ['data', 'fecha', 'date', 'valor', 'operacion', 'operacion', 'ejecucion', 'ejecucion'],
  description: ['concepte', 'concepto', 'descripcion', 'descripcion', 'descripcio', 'description', 'detalle', 'detall'],
  amount: ['import', 'importe', 'amount', 'cantidad', 'quantitat'],
  balance: ['saldo', 'balance'],
  reference: ['referencia', 'referencia', 'referencia 1', 'referencia 2', 'ref'],
};

const removeAccents = (value: string): string => {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

const normalizeKeyword = (value: string): string => {
  return removeAccents(value)
    .trim()
    .toLowerCase()
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ');
};

const compactToken = (value: string): string => {
  return value.replace(/[^a-z0-9]/g, '');
};

export const normalizeCell = (value: unknown): string => {
  if (typeof value === 'string') {
    return normalizeKeyword(value);
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return normalizeKeyword(String(value));
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return normalizeKeyword(value.toISOString());
  }

  return '';
};

const hasKeywordMatch = (text: string, keyword: string): boolean => {
  if (!text || !keyword) return false;
  if (text.includes(keyword)) return true;
  return compactToken(text).includes(compactToken(keyword));
};

const getCategoryMatchCount = (cells: string[], keywords: string[]): number => {
  const normalizedKeywords = keywords.map(normalizeKeyword);
  const matched = new Set<string>();

  for (const cell of cells) {
    for (const keyword of normalizedKeywords) {
      if (hasKeywordMatch(cell, keyword)) {
        matched.add(keyword);
      }
    }
  }

  return matched.size;
};

type RowEvaluation = {
  index: number;
  score: number;
  coreMatched: number;
  matchedByCategory: Partial<Record<HeaderCategory, number>>;
};

const evaluateRow = (row: unknown[], index: number): RowEvaluation => {
  const cells = row.map(normalizeCell).filter(Boolean);
  const matchedByCategory: Partial<Record<HeaderCategory, number>> = {};
  let score = 0;
  let coreMatched = 0;

  for (const [category, keywords] of Object.entries(HEADER_KEYWORDS) as [HeaderCategory, string[]][]) {
    const matches = getCategoryMatchCount(cells, keywords);
    if (matches <= 0) continue;

    matchedByCategory[category] = matches;

    if (category === 'date' || category === 'description' || category === 'amount') {
      coreMatched += 1;
      score += CORE_MATCH_WEIGHT;
    } else {
      score += OPTIONAL_MATCH_WEIGHT;
    }

    // Bonus conservador si dins la mateixa categoria hi ha 2+ matches
    if (matches > 1) {
      score += 1;
    }
  }

  return { index, score, coreMatched, matchedByCategory };
};

export type HeaderRowDetection = {
  index: number | null;
  score: number;
  reasons: string[];
};

export function findHeaderRow(rows: unknown[][]): HeaderRowDetection {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { index: null, score: 0, reasons: ['No rows available'] };
  }

  let bestCandidate: RowEvaluation | null = null;

  const scanLimit = Math.min(rows.length, HEADER_SCAN_LIMIT);
  for (let i = 0; i < scanLimit; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const evaluated = evaluateRow(row, i);
    const isCandidate = evaluated.coreMatched >= MIN_CORE_CATEGORIES && evaluated.score >= MIN_TOTAL_SCORE;
    if (!isCandidate) continue;

    if (
      !bestCandidate
      || evaluated.score > bestCandidate.score
      || (evaluated.score === bestCandidate.score && evaluated.coreMatched > bestCandidate.coreMatched)
      || (
        evaluated.score === bestCandidate.score
        && evaluated.coreMatched === bestCandidate.coreMatched
        && evaluated.index < bestCandidate.index
      )
    ) {
      bestCandidate = evaluated;
    }
  }

  if (!bestCandidate) {
    return {
      index: null,
      score: 0,
      reasons: [`No candidate met confidence rules (minCore=${MIN_CORE_CATEGORIES}, minScore=${MIN_TOTAL_SCORE})`],
    };
  }

  const categories = (Object.keys(bestCandidate.matchedByCategory) as HeaderCategory[]).join(', ');
  return {
    index: bestCandidate.index,
    score: bestCandidate.score,
    reasons: [
      `Matched categories: ${categories}`,
      `Core categories matched: ${bestCandidate.coreMatched}`,
      `Total score: ${bestCandidate.score}`,
    ],
  };
}

export function findColumnIndexByKeywords(header: unknown[], potentialNames: string[]): number {
  const normalizedHeader = header.map(normalizeCell);
  const normalizedNames = potentialNames.map(normalizeKeyword);

  for (const potentialName of normalizedNames) {
    const index = normalizedHeader.findIndex((cell) => hasKeywordMatch(cell, potentialName));
    if (index !== -1) return index;
  }

  return -1;
}

export function findRawValueByKeywords(rawRow: Record<string, unknown>, potentialNames: string[]): unknown {
  for (const name of potentialNames) {
    const direct = rawRow[name];
    if (direct !== undefined && direct !== null && direct !== '') return direct;
  }

  const entries = Object.entries(rawRow).map(([key, value]) => ({
    key,
    value,
    normalizedKey: normalizeCell(key),
  }));
  const normalizedNames = potentialNames.map(normalizeKeyword);

  for (const name of normalizedNames) {
    const match = entries.find((entry) => hasKeywordMatch(entry.normalizedKey, name));
    if (match && match.value !== undefined && match.value !== null && match.value !== '') {
      return match.value;
    }
  }

  return null;
}
