import {
  DEFAULT_BANK_HEADER_SYNONYMS,
  findColumnIndexByKeywords,
  findHeaderRow,
  normalizeCell,
  type HeaderRowDetection,
} from './findHeaderRow';

const MIN_YEAR = 1900;
const MAX_YEAR = 2100;

type HeaderIndexMap = {
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
  rawRow: Record<string, unknown>;
};

export type ParseConfig = {
  scanLimit?: number;
  minEssentialMatches?: number;
  headerRowIndex?: number;
};

export type ParseBankStatementResult = {
  headerDetection: HeaderRowDetection;
  headerRowIndex: number;
  header: string[];
  rows: ParsedBankStatementRow[];
};

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

const buildHeaderIndexMap = (header: string[]): HeaderIndexMap => {
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

const validateRequiredColumns = (indices: HeaderIndexMap): string[] => {
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
  const indices = buildHeaderIndexMap(header);
  const missingColumns = validateRequiredColumns(indices);
  if (missingColumns.length > 0) {
    throw new BankStatementParseError('MISSING_REQUIRED_COLUMNS', { missingColumns });
  }

  const parsedRows: ParsedBankStatementRow[] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < normalizedRows.length; rowIndex++) {
    const row = normalizedRows[rowIndex];
    if (isRowEmpty(row)) continue;

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

    if (!derivedOperationDate || !effectiveDate) {
      throw new BankStatementParseError('OPERATION_DATE_REQUIRED', {
        rowIndex: rowIndex + 1,
      });
    }

    const description = buildDescription(
      descriptionRaw,
      getCellByIndex(row, indices.category),
      getCellByIndex(row, indices.subcategory),
      getCellByIndex(row, indices.comment)
    );
    if (!description) {
      throw new BankStatementParseError('INVALID_ROW', {
        rowIndex: rowIndex + 1,
        reason: 'missing_description',
      });
    }

    let amount = parseSignedNumber(amountRaw);
    if (amount === null) {
      const debit = parseSignedNumber(debitRaw);
      const credit = parseSignedNumber(creditRaw);
      if (debit === null && credit === null) {
        throw new BankStatementParseError('INVALID_ROW', {
          rowIndex: rowIndex + 1,
          reason: 'missing_amount',
        });
      }
      amount = (credit === null ? 0 : Math.abs(credit)) - (debit === null ? 0 : Math.abs(debit));
    }

    const balanceParsed = parseSignedNumber(getCellByIndex(row, indices.balanceAfter));
    const parsedRow: ParsedBankStatementRow = {
      rowIndex: rowIndex + 1,
      date: effectiveDate,
      operationDate: derivedOperationDate,
      valueDate,
      description,
      amount,
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
    throw new BankStatementParseError('NO_VALID_TRANSACTIONS');
  }

  return {
    headerDetection,
    headerRowIndex,
    header,
    rows: parsedRows,
  };
}
