import { normalizeCell } from './findHeaderRow';
import {
  BankStatementParseError,
  parseBankStatementRows,
  type ParseBankStatementResult,
} from './bankStatementParser';

const CASH_CONTROL_SHEET_NAME = 'control caixa';

export type BankStatementSheet = {
  name: string;
  rows: unknown[][];
};

export type SelectedBankStatementSheet = BankStatementSheet & {
  parsed: ParseBankStatementResult;
};

export class EmptyBankStatementWorkbookError extends Error {
  constructor() {
    super('EMPTY_BANK_STATEMENT_WORKBOOK');
    this.name = 'EmptyBankStatementWorkbookError';
  }
}

const hasValue = (value: unknown): boolean => {
  return value !== null && value !== undefined && String(value).trim() !== '';
};

const hasSheetContent = (rows: unknown[][]): boolean => {
  return rows.some((row) => Array.isArray(row) && row.some(hasValue));
};

const isCashControlSheet = (name: string): boolean => {
  return normalizeCell(name) === CASH_CONTROL_SHEET_NAME;
};

/**
 * Selects exactly one worksheet for a bank/cash import.
 *
 * A valid `Control caixa` sheet wins. Otherwise, the first valid sheet keeps
 * the existing workbook-order behaviour. Worksheets are never combined.
 */
export function selectBankStatementSheet(
  sheets: BankStatementSheet[]
): SelectedBankStatementSheet {
  const normalizedSheets = sheets.map((sheet) => ({
    name: String(sheet.name ?? '').trim(),
    rows: (sheet.rows ?? []).map((row) => (Array.isArray(row) ? row : [])),
  }));
  const nonEmptySheets = normalizedSheets.filter((sheet) => hasSheetContent(sheet.rows));

  if (nonEmptySheets.length === 0) {
    throw new EmptyBankStatementWorkbookError();
  }

  const validSheets: SelectedBankStatementSheet[] = [];
  const parseErrors = new Map<string, unknown>();

  for (const sheet of nonEmptySheets) {
    try {
      const parsed = parseBankStatementRows(sheet.rows);
      if (parsed.rows.length > 0) {
        validSheets.push({ ...sheet, parsed });
      }
    } catch (error) {
      parseErrors.set(sheet.name, error);
    }
  }

  const cashControlSheet = validSheets.find((sheet) => isCashControlSheet(sheet.name));
  if (cashControlSheet) return cashControlSheet;

  const firstValidSheet = validSheets[0];
  if (firstValidSheet) return firstValidSheet;

  const cashControlError = nonEmptySheets
    .filter((sheet) => isCashControlSheet(sheet.name))
    .map((sheet) => parseErrors.get(sheet.name))
    .find((error): error is unknown => Boolean(error));
  if (cashControlError) throw cashControlError;

  const firstParseError = nonEmptySheets
    .map((sheet) => parseErrors.get(sheet.name))
    .find((error): error is unknown => Boolean(error));
  if (firstParseError) throw firstParseError;

  throw new BankStatementParseError('NO_VALID_TRANSACTIONS');
}
