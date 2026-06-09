export type BankStatementImportFileType = 'csv' | 'excel';

export function resolveBankStatementImportFileType(fileName: string): BankStatementImportFileType | null {
  const normalizedName = fileName.trim().toLowerCase();

  if (normalizedName.endsWith('.csv')) {
    return 'csv';
  }

  if (normalizedName.endsWith('.xlsx') || normalizedName.endsWith('.xls')) {
    return 'excel';
  }

  return null;
}
