// src/lib/donors-export.ts
// Exportació Excel de la llista de donants

import * as XLSX from 'xlsx';
import type { Donor } from '@/lib/data';
import { formatIBANDisplay } from '@/lib/normalize';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface DonorExportRow {
  Nom: string;
  NIF: string;
  'Quota mensual': string;
  IBAN: string;
  Estat: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatCurrency(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return '';
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function getStatusLabel(donor: Donor): string {
  if (donor.status === 'inactive') {
    return 'Baixa';
  }
  if (donor.status === 'pending_return') {
    return 'Pendent devolució';
  }
  return 'Alta';
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb la llista de donants
 */
export function exportDonorsToExcel(donors: Donor[], filename?: string): void {
  // Ordenar per nom
  const sortedDonors = [...donors].sort((a, b) =>
    a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' })
  );

  // Convertir a files d'exportació
  const rows: DonorExportRow[] = sortedDonors.map(donor => ({
    Nom: donor.name,
    NIF: donor.taxId || '',
    'Quota mensual': formatCurrency(donor.monthlyAmount),
    IBAN: donor.iban ? formatIBANDisplay(donor.iban) : '',
    Estat: getStatusLabel(donor),
  }));

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 35 },  // Nom
    { wch: 12 },  // NIF
    { wch: 14 },  // Quota mensual
    { wch: 28 },  // IBAN
    { wch: 18 },  // Estat
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Donants');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `donants_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}
