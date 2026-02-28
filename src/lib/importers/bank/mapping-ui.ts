export type BankMappingFieldId = 'operationDate' | 'description' | 'amount' | 'balanceAfter';

export type BankMappingColumnOption = {
  index: number;
  sample: string | null;
};

export type BankMappingFieldDefinition = {
  id: BankMappingFieldId;
  required: boolean;
};

export const BANK_MAPPING_FIELD_DEFINITIONS: BankMappingFieldDefinition[] = [
  { id: 'operationDate', required: true },
  { id: 'description', required: true },
  { id: 'amount', required: true },
  { id: 'balanceAfter', required: false },
];

const PREVIEW_DEFAULT_LIMIT = 8;
const SAMPLE_MAX_LENGTH = 60;

const normalizeCell = (value: unknown): string => String(value ?? '').trim();

const isRowEmpty = (row: unknown[]): boolean => row.every((cell) => normalizeCell(cell) === '');

export function buildBankMappingColumnOptions(
  rows: unknown[][],
  headerRowIndex: number,
  header: string[]
): BankMappingColumnOption[] {
  return header.map((_, index) => {
    let sample: string | null = null;

    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      if (!Array.isArray(row)) continue;
      const normalized = normalizeCell(row[index]);
      if (!normalized) continue;
      sample = normalized.length > SAMPLE_MAX_LENGTH ? `${normalized.slice(0, SAMPLE_MAX_LENGTH)}…` : normalized;
      break;
    }

    return { index, sample };
  });
}

export function buildBankMappingPreviewRows(
  rows: unknown[][],
  headerRowIndex: number,
  previewLimit = PREVIEW_DEFAULT_LIMIT
): string[][] {
  const previewRows: string[][] = [];

  for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex++) {
    if (previewRows.length >= previewLimit) break;

    const row = rows[rowIndex];
    if (!Array.isArray(row) || isRowEmpty(row)) continue;
    previewRows.push(row.map((cell) => String(cell ?? '')));
  }

  return previewRows;
}

export function getBankMappingColumnCount(
  header: string[],
  previewRows: string[][]
): number {
  let maxColumns = header.length;
  for (const row of previewRows) {
    if (row.length > maxColumns) {
      maxColumns = row.length;
    }
  }
  return maxColumns;
}
