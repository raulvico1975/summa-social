export const DEFAULT_HEADER_SCAN_LIMIT = 120;
const DEFAULT_MIN_ESSENTIAL_MATCHES = 3;
const DEFAULT_MAX_CANDIDATES = 5;

export type HeaderField =
  | 'operationDate'
  | 'valueDate'
  | 'genericDate'
  | 'description'
  | 'amount'
  | 'balanceAfter'
  | 'debit'
  | 'credit'
  | 'reference'
  | 'category'
  | 'subcategory'
  | 'comment';

type EssentialCategory = 'date' | 'description' | 'amount';

export const DEFAULT_BANK_HEADER_SYNONYMS: Record<HeaderField, string[]> = {
  operationDate: [
    'd operativa',
    'd. operativa',
    'fecha operacion',
    'fecha operación',
    'data operacio',
    'data operació',
    'f operacion',
    'f. operacion',
    'f operación',
    'f. operación',
    'f ejecucion',
    'f. ejecucion',
    'f ejecución',
    'f. ejecución',
  ],
  valueDate: [
    'd valor',
    'd. valor',
    'fecha valor',
    'f valor',
    'f. valor',
  ],
  genericDate: ['fecha', 'data', 'date'],
  description: ['concepte', 'concepto', 'descripcion', 'descripción', 'detalle', 'detall'],
  amount: ['import', 'importe', 'importe eur', 'importe €', 'amount', 'cantidad'],
  balanceAfter: ['saldo', 'saldo eur', 'saldo €', 'balance'],
  debit: ['debe', 'càrrec', 'cargo', 'debit'],
  credit: ['haber', 'abonament', 'abono', 'credit'],
  reference: ['referencia', 'referencia 1', 'referencia 2', 'ref'],
  category: ['categoria', 'categoría'],
  subcategory: ['subcategoria', 'subcategoría'],
  comment: ['comentario', 'comentari', 'comment'],
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
  essentialMatched: number;
  matchedFields: HeaderField[];
  matchedByField: Partial<Record<HeaderField, number>>;
  essentialFlags: Record<EssentialCategory, boolean>;
  lowConfidence: boolean;
};

type EvaluateOptions = {
  synonyms: Record<HeaderField, string[]>;
  minEssentialMatches: number;
};

const evaluateRow = (row: unknown[], index: number, options: EvaluateOptions): RowEvaluation => {
  const cells = row.map(normalizeCell).filter(Boolean);
  const matchedByField: Partial<Record<HeaderField, number>> = {};
  const matchedFields: HeaderField[] = [];

  for (const [field, keywords] of Object.entries(options.synonyms) as [HeaderField, string[]][]) {
    const matches = getCategoryMatchCount(cells, keywords);
    if (matches > 0) {
      matchedByField[field] = matches;
      matchedFields.push(field);
    }
  }

  const essentialFlags: Record<EssentialCategory, boolean> = {
    date: Boolean(
      matchedByField.operationDate
      || matchedByField.valueDate
      || matchedByField.genericDate
    ),
    description: Boolean(matchedByField.description),
    amount: Boolean(matchedByField.amount || matchedByField.debit || matchedByField.credit),
  };

  const essentialMatched = Object.values(essentialFlags).filter(Boolean).length;
  const score = matchedFields.length;
  const lowConfidence = essentialMatched < options.minEssentialMatches;

  return {
    index,
    score,
    essentialMatched,
    matchedFields,
    matchedByField,
    essentialFlags,
    lowConfidence,
  };
};

export type HeaderCandidate = {
  index: number;
  score: number;
  essentialMatched: number;
  matchedFields: HeaderField[];
  matchedByField: Partial<Record<HeaderField, number>>;
  lowConfidence: boolean;
};

export type HeaderRowDetection = {
  index: number | null;
  score: number;
  lowConfidence: boolean;
  topCandidates: HeaderCandidate[];
  reasons: string[];
};

type FindHeaderRowOptions = {
  scanLimit?: number;
  minEssentialMatches?: number;
  maxCandidates?: number;
  synonyms?: Partial<Record<HeaderField, string[]>>;
};

export function findHeaderRow(rows: unknown[][], options: FindHeaderRowOptions = {}): HeaderRowDetection {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      index: null,
      score: 0,
      lowConfidence: true,
      topCandidates: [],
      reasons: ['No rows available'],
    };
  }

  const scanLimit = Math.min(rows.length, options.scanLimit ?? DEFAULT_HEADER_SCAN_LIMIT);
  const minEssentialMatches = options.minEssentialMatches ?? DEFAULT_MIN_ESSENTIAL_MATCHES;
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  const synonyms = {
    ...DEFAULT_BANK_HEADER_SYNONYMS,
    ...options.synonyms,
  };

  const evaluatedRows: RowEvaluation[] = [];
  for (let i = 0; i < scanLimit; i++) {
    const row = Array.isArray(rows[i]) ? rows[i] : [];
    const evaluated = evaluateRow(row, i, { synonyms, minEssentialMatches });
    if (evaluated.score > 0) {
      evaluatedRows.push(evaluated);
    }
  }

  if (evaluatedRows.length === 0) {
    return {
      index: null,
      score: 0,
      lowConfidence: true,
      topCandidates: [],
      reasons: ['No candidate row matched header synonyms'],
    };
  }

  const sortedCandidates = evaluatedRows
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.essentialMatched !== a.essentialMatched) return b.essentialMatched - a.essentialMatched;
      return b.index - a.index;
    });
  const bestCandidate = sortedCandidates[0];
  const topCandidates: HeaderCandidate[] = sortedCandidates.slice(0, maxCandidates).map((candidate) => ({
    index: candidate.index,
    score: candidate.score,
    essentialMatched: candidate.essentialMatched,
    matchedFields: candidate.matchedFields,
    matchedByField: candidate.matchedByField,
    lowConfidence: candidate.lowConfidence,
  }));

  return {
    index: bestCandidate.index,
    score: bestCandidate.score,
    lowConfidence: bestCandidate.lowConfidence,
    topCandidates,
    reasons: [
      `Matched fields: ${bestCandidate.matchedFields.join(', ')}`,
      `Essential matched: ${bestCandidate.essentialMatched}/${minEssentialMatches}`,
      `Low confidence: ${bestCandidate.lowConfidence ? 'yes' : 'no'}`,
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
