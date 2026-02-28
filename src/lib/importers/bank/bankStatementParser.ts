import {
  DEFAULT_BANK_HEADER_SYNONYMS,
  findColumnIndexByKeywords,
  findHeaderRow,
  normalizeCell,
  type HeaderRowDetection,
} from './findHeaderRow';

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;
const BALANCE_MISMATCH_TOLERANCE = 0.02;
const BALANCE_ORDER_SAMPLE_SIZE = 10;
const BALANCE_ORDER_MIN_CONFIDENCE = 0.6;
const DEFAULT_SAMPLE_SIZE = 5;

export type ColumnMapping = {
  operationDate: number;
  valueDate: number;
  genericDate: number;
  description: number;
  amount: number;
  balanceAfter: number;
  debit: number;
  credit: number;
  category: number;
  subcategory: number;
  comment: number;
};

export type ManualMappingField =
  | 'operationDate'
  | 'valueDate'
  | 'description'
  | 'amount'
  | 'balanceAfter';
export type RequiredMappingField = 'operationDate' | 'description' | 'amount';

export type ColumnMappingOverride = Partial<Record<ManualMappingField, number>>;

export type ParseWarningCode =
  | 'operationDateDerived'
  | 'debitCreditFallback'
  | 'balanceMismatch';

export type BankStatementParseErrorCode =
  | 'HEADER_NOT_FOUND'
  | 'MISSING_REQUIRED_COLUMNS'
  | 'OPERATION_DATE_REQUIRED'
  | 'INVALID_ROW'
  | 'NO_VALID_TRANSACTIONS';

export class BankStatementParseError extends Error {
  constructor(
    public readonly code: BankStatementParseErrorCode,
    public readonly details: Record<string, unknown> = {},
    message?: string
  ) {
    super(message ?? code);
    this.name = 'BankStatementParseError';
  }
}

export type ParsedBankStatementRow = {
  rowIndex: number;
  date: string;
  operationDate: string;
  valueDate: string | null;
  description: string;
  amount: number;
  balanceAfter?: number;
  warnings: ParseWarningCode[];
  rawRow: Record<string, unknown>;
};

export type ParseRiskSignals = {
  lowConfidence: boolean;
  missingRequiredFields: RequiredMappingField[];
  operationDateDerived: boolean;
  hasDebitCredit: boolean;
  datesInvalid: number;
  amountInvalid: number;
  balanceMismatchCount: number;
};

export type ParseSummary = {
  sourceRowsCount: number;
  dataRowsCount: number;
  parsedRowsCount: number;
  dateRange: { from: string; to: string } | null;
  totals: {
    income: number;
    expense: number;
    net: number;
  };
  balances: {
    initial: number;
    final: number;
  } | null;
  warnings: Pick<ParseRiskSignals, 'datesInvalid' | 'amountInvalid' | 'balanceMismatchCount'>;
};

export type ParseConfig = {
  scanLimit?: number;
  minEssentialMatches?: number;
  headerRowIndex?: number;
  columnMappingOverride?: ColumnMappingOverride;
  sampleSize?: number;
};

export type ParseBankStatementResult = {
  headerDetection: HeaderRowDetection;
  headerRowIndex: number;
  header: string[];
  columnMapping: ColumnMapping;
  riskSignals: ParseRiskSignals;
  summary: ParseSummary;
  sampleRows: ParsedBankStatementRow[];
  rows: ParsedBankStatementRow[];
};

type BalanceRowOrder = 'asc' | 'desc' | 'unknown';

const hasValue = (value: unknown): boolean => {
  return value !== null && value !== undefined && String(value).trim() !== '';
};

const getCellByIndex = (row: unknown[], index: number): unknown => {
  if (index < 0) return null;
  return row[index] ?? null;
};

const toStringValue = (value: unknown): string => {
  return String(value ?? '').trim();
};

const toDateTimeIso = (dateOnly: string): string => {
  return `${dateOnly}T00:00:00.000Z`;
};

const isValidDateParts = (year: number, month: number, day: number): boolean => {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  if (year < MIN_YEAR || year > MAX_YEAR) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const test = new Date(Date.UTC(year, month - 1, day));
  return (
    test.getUTCFullYear() === year
    && test.getUTCMonth() + 1 === month
    && test.getUTCDate() === day
  );
};

const formatDateParts = (year: number, month: number, day: number): string => {
  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

export function parseDateToIsoDate(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const serial = Math.trunc(value);
    if (serial <= 0) return null;
    const utcMs = Math.round((serial - 25569) * 86400000);
    const excelDate = new Date(utcMs);
    const year = excelDate.getUTCFullYear();
    const month = excelDate.getUTCMonth() + 1;
    const day = excelDate.getUTCDate();
    if (!isValidDateParts(year, month, day)) return null;
    return formatDateParts(year, month, day);
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = value.getMonth() + 1;
    const day = value.getDate();
    if (!isValidDateParts(year, month, day)) return null;
    return formatDateParts(year, month, day);
  }

  const raw = String(value).trim();
  if (!raw) return null;

  const isoMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/);
  if (isoMatch) {
    const year = Number.parseInt(isoMatch[1], 10);
    const month = Number.parseInt(isoMatch[2], 10);
    const day = Number.parseInt(isoMatch[3], 10);
    if (!isValidDateParts(year, month, day)) return null;
    return formatDateParts(year, month, day);
  }

  const euMatch = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (euMatch) {
    const day = Number.parseInt(euMatch[1], 10);
    const month = Number.parseInt(euMatch[2], 10);
    let year = Number.parseInt(euMatch[3], 10);
    if (year < 100) year += 2000;
    if (!isValidDateParts(year, month, day)) return null;
    return formatDateParts(year, month, day);
  }

  return null;
}

const normalizeSingleSeparatorNumber = (value: string, separator: ',' | '.'): string => {
  const lastIndex = value.lastIndexOf(separator);
  const fractionLength = value.length - lastIndex - 1;

  if (lastIndex === -1) return value;

  if (fractionLength > 0 && fractionLength <= 2) {
    const integerPart = value.slice(0, lastIndex).split(separator).join('');
    const decimalPart = value.slice(lastIndex + 1).split(separator).join('');
    return `${integerPart}.${decimalPart}`;
  }

  return value.split(separator).join('');
};

export function parseSignedNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  let raw = String(value).trim();
  if (!raw) return null;

  let forceNegative = false;
  if (raw.startsWith('(') && raw.endsWith(')')) {
    forceNegative = true;
    raw = raw.slice(1, -1);
  }

  raw = raw
    .replace(/\s+/g, '')
    .replace(/[€$£]/g, '')
    .replace(/[^\d,.\-+]/g, '');

  if (!/\d/.test(raw)) return null;

  let sign = 1;
  if (raw.startsWith('+')) {
    raw = raw.slice(1);
  } else if (raw.startsWith('-')) {
    sign = -1;
    raw = raw.slice(1);
  }

  raw = raw.replace(/[+-]/g, '');
  if (!raw) return null;

  const commaCount = (raw.match(/,/g) || []).length;
  const dotCount = (raw.match(/\./g) || []).length;
  let normalized = raw;

  if (commaCount > 0 && dotCount > 0) {
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    const decimalSep = lastComma > lastDot ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    normalized = raw.split(thousandSep).join('');
    if (decimalSep === ',') {
      normalized = normalized.replace(',', '.');
    }
  } else if (commaCount > 0) {
    normalized = normalizeSingleSeparatorNumber(raw, ',');
  } else if (dotCount > 0) {
    normalized = normalizeSingleSeparatorNumber(raw, '.');
  }

  if (!normalized || normalized === '.') return null;
  const parsed = Number.parseFloat(normalized);
  if (!Number.isFinite(parsed)) return null;

  const finalSign = forceNegative ? -1 : sign;
  return parsed * finalSign;
}

const isRowEmpty = (row: unknown[]): boolean => {
  return row.every((cell) => normalizeCell(cell) === '');
};

const buildHeaderIndexMap = (header: string[]): ColumnMapping => {
  return {
    operationDate: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.operationDate),
    valueDate: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.valueDate),
    genericDate: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.genericDate),
    description: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.description),
    amount: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.amount),
    balanceAfter: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.balanceAfter),
    debit: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.debit),
    credit: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.credit),
    category: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.category),
    subcategory: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.subcategory),
    comment: findColumnIndexByKeywords(header, DEFAULT_BANK_HEADER_SYNONYMS.comment),
  };
};

const applyColumnMappingOverride = (
  base: ColumnMapping,
  override?: ColumnMappingOverride
): ColumnMapping => {
  if (!override) return base;
  const mapping: ColumnMapping = { ...base };

  (Object.keys(override) as ManualMappingField[]).forEach((field) => {
    const value = override[field];
    if (typeof value === 'number' && Number.isInteger(value)) {
      mapping[field] = value;
    }
  });

  return mapping;
};

const buildRawRow = (header: string[], row: unknown[]): Record<string, unknown> => {
  const rawRow: Record<string, unknown> = {};
  header.forEach((key, index) => {
    rawRow[key] = row[index] ?? '';
  });
  return rawRow;
};

const buildDescription = (
  base: unknown,
  category: unknown,
  subcategory: unknown,
  comment: unknown
): string => {
  const parts = [
    toStringValue(base),
    toStringValue(category),
    toStringValue(subcategory),
    toStringValue(comment),
  ].filter(Boolean);

  return parts.join(' · ');
};

const validateRequiredColumns = (indices: ColumnMapping): string[] => {
  const missing: string[] = [];

  const hasDate = indices.operationDate !== -1 || indices.valueDate !== -1 || indices.genericDate !== -1;
  if (!hasDate) {
    missing.push('Data (D. Operativa / D. Valor / Fecha)');
  }

  if (indices.description === -1 && indices.category === -1 && indices.subcategory === -1 && indices.comment === -1) {
    missing.push('Concepte/Concepto');
  }

  const hasAmount = indices.amount !== -1 || indices.debit !== -1 || indices.credit !== -1;
  if (!hasAmount) {
    missing.push('Importe/Import o Debe/Haber');
  }

  return missing;
};

const getMissingRequiredFields = (indices: ColumnMapping): RequiredMappingField[] => {
  const missing: RequiredMappingField[] = [];
  if (indices.operationDate === -1) {
    missing.push('operationDate');
  }
  if (indices.description === -1 && indices.category === -1 && indices.subcategory === -1 && indices.comment === -1) {
    missing.push('description');
  }
  if (indices.amount === -1 && indices.debit === -1 && indices.credit === -1) {
    missing.push('amount');
  }
  return missing;
};

const hasBalanceColumn = (indices: ColumnMapping): boolean => indices.balanceAfter !== -1;

const toFiniteAmount = (value: number): number => Number.parseFloat(value.toFixed(2));

const computeDateRange = (rows: ParsedBankStatementRow[]): { from: string; to: string } | null => {
  if (rows.length === 0) return null;
  const values = rows.map((row) => row.operationDate).sort();
  return { from: values[0], to: values[values.length - 1] };
};

const detectBalanceRowOrder = (rows: ParsedBankStatementRow[]): BalanceRowOrder => {
  const rowsWithBalance = rows
    .filter((row) => typeof row.balanceAfter === 'number' && Number.isFinite(row.balanceAfter))
    .slice(0, BALANCE_ORDER_SAMPLE_SIZE);

  if (rowsWithBalance.length < 2) return 'unknown';

  let ascVotes = 0;
  let descVotes = 0;

  for (let i = 0; i < rowsWithBalance.length - 1; i++) {
    const currentDate = rowsWithBalance[i].operationDate;
    const nextDate = rowsWithBalance[i + 1].operationDate;
    if (currentDate === nextDate) continue;
    if (currentDate < nextDate) {
      ascVotes += 1;
    } else {
      descVotes += 1;
    }
  }

  const totalVotes = ascVotes + descVotes;
  if (totalVotes === 0) return 'unknown';

  const winnerVotes = Math.max(ascVotes, descVotes);
  if (winnerVotes / totalVotes < BALANCE_ORDER_MIN_CONFIDENCE) return 'unknown';

  if (ascVotes === descVotes) return 'unknown';
  return descVotes > ascVotes ? 'desc' : 'asc';
};

const computeBalanceMismatches = (
  rows: ParsedBankStatementRow[],
  order: BalanceRowOrder
): number => {
  if (order === 'unknown') return 0;

  let mismatchCount = 0;

  for (let i = 1; i < rows.length; i++) {
    const prev = rows[i - 1];
    const current = rows[i];

    if (
      typeof prev.balanceAfter !== 'number'
      || !Number.isFinite(prev.balanceAfter)
      || typeof current.balanceAfter !== 'number'
      || !Number.isFinite(current.balanceAfter)
    ) {
      continue;
    }

    const expectedBalance = order === 'asc'
      ? toFiniteAmount(prev.balanceAfter + current.amount)
      : toFiniteAmount(prev.balanceAfter - prev.amount);

    const delta = Math.abs(expectedBalance - current.balanceAfter);
    if (delta > BALANCE_MISMATCH_TOLERANCE) {
      mismatchCount += 1;
      if (!current.warnings.includes('balanceMismatch')) {
        current.warnings.push('balanceMismatch');
      }
    }
  }

  return mismatchCount;
};

export function shouldOpenManualMapping(result: ParseBankStatementResult): boolean {
  const s = result.riskSignals;
  return (
    s.lowConfidence
    || s.missingRequiredFields.length > 0
    || s.operationDateDerived
    || s.hasDebitCredit
    || s.datesInvalid > 0
    || s.amountInvalid > 0
    || s.balanceMismatchCount > 0
  );
}

export function parseBankStatementRows(
  rows: unknown[][],
  config: ParseConfig = {}
): ParseBankStatementResult {
  const normalizedRows = (rows || []).map((row) => (Array.isArray(row) ? row : []));
  const headerDetection = findHeaderRow(normalizedRows, {
    scanLimit: config.scanLimit,
    minEssentialMatches: config.minEssentialMatches,
  });

  const headerRowIndex = config.headerRowIndex ?? headerDetection.index;
  if (headerRowIndex === null || headerRowIndex === undefined || headerRowIndex < 0 || headerRowIndex >= normalizedRows.length) {
    throw new BankStatementParseError('HEADER_NOT_FOUND');
  }

  const header = normalizedRows[headerRowIndex].map((cell) => String(cell ?? '').trim());
  const autoIndices = buildHeaderIndexMap(header);
  const indices = applyColumnMappingOverride(autoIndices, config.columnMappingOverride);
  const missingColumns = validateRequiredColumns(indices);
  if (missingColumns.length > 0) {
    throw new BankStatementParseError('MISSING_REQUIRED_COLUMNS', { missingColumns });
  }

  const riskSignals: ParseRiskSignals = {
    lowConfidence: headerDetection.lowConfidence,
    missingRequiredFields: getMissingRequiredFields(indices),
    operationDateDerived: indices.operationDate === -1 && (indices.valueDate !== -1 || indices.genericDate !== -1),
    hasDebitCredit: indices.debit !== -1 || indices.credit !== -1,
    datesInvalid: 0,
    amountInvalid: 0,
    balanceMismatchCount: 0,
  };

  const parsedRows: ParsedBankStatementRow[] = [];
  let dataRowsCount = 0;
  let totalIncome = 0;
  let totalExpense = 0;
  let initialBalance: number | null = null;
  let finalBalance: number | null = null;
  const sampleSize = config.sampleSize ?? DEFAULT_SAMPLE_SIZE;

  for (let rowIndex = headerRowIndex + 1; rowIndex < normalizedRows.length; rowIndex++) {
    const row = normalizedRows[rowIndex];
    if (isRowEmpty(row)) continue;

    dataRowsCount += 1;
    const rawRow = buildRawRow(header, row);
    const opDateRaw = getCellByIndex(row, indices.operationDate);
    const valueDateRaw = getCellByIndex(row, indices.valueDate);
    const genericDateRaw = getCellByIndex(row, indices.genericDate);
    const descriptionRaw = getCellByIndex(row, indices.description);
    const amountRaw = getCellByIndex(row, indices.amount);
    const debitRaw = getCellByIndex(row, indices.debit);
    const creditRaw = getCellByIndex(row, indices.credit);

    const hasContent = [
      opDateRaw,
      valueDateRaw,
      genericDateRaw,
      descriptionRaw,
      amountRaw,
      debitRaw,
      creditRaw,
    ].some(hasValue);
    if (!hasContent) continue;

    const operationDate = parseDateToIsoDate(opDateRaw);
    const valueDate = parseDateToIsoDate(valueDateRaw);
    const genericDate = parseDateToIsoDate(genericDateRaw);
    const derivedOperationDate = operationDate || valueDate || genericDate;
    const effectiveDate = valueDate || operationDate || genericDate;
    const warnings: ParseWarningCode[] = [];
    const usedDerivedDate = !operationDate && Boolean(valueDate || genericDate);

    if (!derivedOperationDate || !effectiveDate) {
      riskSignals.datesInvalid += 1;
      continue;
    }

    if (usedDerivedDate) {
      riskSignals.operationDateDerived = true;
      warnings.push('operationDateDerived');
    }

    const description = buildDescription(
      descriptionRaw,
      getCellByIndex(row, indices.category),
      getCellByIndex(row, indices.subcategory),
      getCellByIndex(row, indices.comment)
    );
    if (!description) {
      continue;
    }

    let amount = parseSignedNumber(amountRaw);
    if (amount === null) {
      const debit = parseSignedNumber(debitRaw);
      const credit = parseSignedNumber(creditRaw);
      if (debit === null && credit === null) {
        riskSignals.amountInvalid += 1;
        continue;
      }
      riskSignals.hasDebitCredit = true;
      warnings.push('debitCreditFallback');
      amount = (credit === null ? 0 : Math.abs(credit)) - (debit === null ? 0 : Math.abs(debit));
    }

    totalIncome += amount > 0 ? amount : 0;
    totalExpense += amount < 0 ? Math.abs(amount) : 0;

    const balanceParsed = parseSignedNumber(getCellByIndex(row, indices.balanceAfter));
    if (balanceParsed !== null) {
      if (initialBalance === null) initialBalance = balanceParsed;
      finalBalance = balanceParsed;
    }

    const parsedRow: ParsedBankStatementRow = {
      rowIndex: rowIndex + 1,
      date: effectiveDate,
      operationDate: derivedOperationDate,
      valueDate,
      description,
      amount,
      warnings,
      rawRow: {
        ...rawRow,
        _date: toDateTimeIso(effectiveDate),
        _opDate: derivedOperationDate,
      },
    };

    if (balanceParsed !== null) {
      parsedRow.balanceAfter = balanceParsed;
      parsedRow.rawRow._balance = balanceParsed;
    }

    parsedRows.push(parsedRow);
  }

  if (parsedRows.length === 0) {
    if (riskSignals.datesInvalid > 0) {
      throw new BankStatementParseError('OPERATION_DATE_REQUIRED', {
        datesInvalid: riskSignals.datesInvalid,
      });
    }
    if (riskSignals.amountInvalid > 0) {
      throw new BankStatementParseError('INVALID_ROW', {
        amountInvalid: riskSignals.amountInvalid,
      });
    }
    throw new BankStatementParseError('NO_VALID_TRANSACTIONS');
  }

  const balanceOrder = detectBalanceRowOrder(parsedRows);
  riskSignals.balanceMismatchCount = computeBalanceMismatches(parsedRows, balanceOrder);

  const summary: ParseSummary = {
    sourceRowsCount: normalizedRows.length,
    dataRowsCount,
    parsedRowsCount: parsedRows.length,
    dateRange: computeDateRange(parsedRows),
    totals: {
      income: toFiniteAmount(totalIncome),
      expense: toFiniteAmount(totalExpense),
      net: toFiniteAmount(totalIncome - totalExpense),
    },
    balances:
      hasBalanceColumn(indices) && initialBalance !== null && finalBalance !== null
        ? { initial: initialBalance, final: finalBalance }
        : null,
    warnings: {
      datesInvalid: riskSignals.datesInvalid,
      amountInvalid: riskSignals.amountInvalid,
      balanceMismatchCount: riskSignals.balanceMismatchCount,
    },
  };

  return {
    headerDetection,
    headerRowIndex,
    header,
    columnMapping: indices,
    riskSignals,
    summary,
    sampleRows: parsedRows.slice(0, sampleSize),
    rows: parsedRows,
  };
}
