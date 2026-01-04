/**
 * Bank Accounts Export Utilities
 *
 * Exportació Excel de comptes bancaris.
 * Format: columnes amb noms en català per a usuaris.
 */

import * as XLSX from 'xlsx';
import type { BankAccount } from '@/lib/data';
import { formatIBANDisplay } from '@/lib/normalize';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface BankAccountExportRow {
  Nom: string;
  IBAN: string;
  Banc: string;
  'Per defecte': string;
  Actiu: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL: EXPORTAR COMPTES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb els comptes bancaris
 */
export function exportBankAccountsToExcel(accounts: BankAccount[], filename?: string): void {
  // Ordenar: default primer, després per nom
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' });
  });

  // Convertir a files d'exportació
  const rows: BankAccountExportRow[] = sortedAccounts.map(acc => ({
    Nom: acc.name,
    IBAN: acc.iban ? formatIBANDisplay(acc.iban) : '',
    Banc: acc.bankName || '',
    'Per defecte': acc.isDefault ? 'Sí' : 'No',
    Actiu: acc.isActive === false ? 'No' : 'Sí',
  }));

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 25 },  // Nom
    { wch: 30 },  // IBAN
    { wch: 20 },  // Banc
    { wch: 12 },  // Per defecte
    { wch: 8 },   // Actiu
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Comptes bancaris');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `comptes_bancaris_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ: DESCARREGAR PLANTILLA BUIDA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega una plantilla Excel buida per importar comptes bancaris
 */
export function downloadBankAccountsTemplate(): void {
  // Files d'exemple per mostrar el format esperat
  const exampleRows: BankAccountExportRow[] = [
    {
      Nom: 'Compte principal',
      IBAN: 'ES12 3456 7890 1234 5678 9012',
      Banc: 'CaixaBank',
      'Per defecte': 'Sí',
      Actiu: 'Sí',
    },
    {
      Nom: 'Compte donacions',
      IBAN: 'ES98 7654 3210 9876 5432 1098',
      Banc: 'BBVA',
      'Per defecte': 'No',
      Actiu: 'Sí',
    },
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exampleRows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 25 },  // Nom
    { wch: 30 },  // IBAN
    { wch: 20 },  // Banc
    { wch: 12 },  // Per defecte
    { wch: 8 },   // Actiu
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Comptes bancaris');

  // Descarregar
  XLSX.writeFile(wb, 'plantilla_comptes_bancaris.xlsx');
}
