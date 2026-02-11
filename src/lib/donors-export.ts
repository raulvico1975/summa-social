// src/lib/donors-export.ts
// Exportació Excel de la llista de donants
// REGLA: Export = Import (mateixes columnes, mateix ordre que la plantilla oficial)

import * as XLSX from 'xlsx';
import type { Donor, Category } from '@/lib/data';
import { formatIBANDisplay } from '@/lib/normalize';
import { DONORS_TEMPLATE_HEADERS } from '@/lib/donors/donors-template';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || amount === 0) return '';
  return amount.toString();
}

function formatDateEU(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

function getStatusLabel(donor: Donor): string {
  if (donor.status === 'inactive') {
    return 'Baixa';
  }
  if (donor.status === 'pending_return') {
    return 'Pendent devolució';
  }
  return 'Actiu';
}

function getDonorTypeLabel(donor: Donor): string {
  return donor.donorType === 'company' ? 'Empresa' : 'Particular';
}

function getMembershipTypeLabel(donor: Donor): string {
  return donor.membershipType === 'recurring' ? 'Soci' : 'Puntual';
}

function getPeriodicityLabel(donor: Donor): string {
  switch (donor.periodicityQuota) {
    case 'monthly': return 'Mensual';
    case 'quarterly': return 'Trimestral';
    case 'semiannual': return 'Semestral';
    case 'annual': return 'Anual';
    case 'manual': return 'Puntual';
    default: return 'Mensual';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb la llista de donants.
 * Les columnes són idèntiques a la plantilla oficial d'importació.
 */
export function exportDonorsToExcel(
  donors: Donor[],
  categories?: Category[],
  filename?: string
): void {
  // Crear mapa de categories per ID
  const categoryMap = new Map<string, string>();
  if (categories) {
    for (const cat of categories) {
      categoryMap.set(cat.id, cat.name);
    }
  }

  // Ordenar per nom
  const sortedDonors = [...donors].sort((a, b) =>
    a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' })
  );

  // Construir files seguint l'ordre de DONORS_TEMPLATE_HEADERS
  const rows: string[][] = sortedDonors.map(donor => {
    const categoryName = donor.defaultCategoryId
      ? categoryMap.get(donor.defaultCategoryId) || ''
      : '';

    return [
      donor.name || '',                             // Nom
      donor.taxId || '',                            // NIF/DNI
      getStatusLabel(donor),                        // Estat
      getDonorTypeLabel(donor),                     // Tipus
      getMembershipTypeLabel(donor),                // Modalitat
      categoryName,                                 // Categoria per defecte
      donor.address || '',                          // Adreça
      donor.zipCode || '',                          // Codi postal
      donor.city || '',                             // Ciutat
      donor.province || '',                         // Província
      donor.phone || '',                            // Telèfon
      donor.email || '',                            // Email
      donor.iban ? formatIBANDisplay(donor.iban) : '', // IBAN
      formatAmount(donor.monthlyAmount),            // Quota mensual
      formatDateEU(donor.memberSince),               // Data d'alta
      getPeriodicityLabel(donor),                    // Periodicitat quota
      donor.donorType === 'company' ? (donor.contactPersonName ?? '') : '', // Nom de contacte
    ];
  });

  // Crear worksheet amb capçaleres + dades
  const data = [
    [...DONORS_TEMPLATE_HEADERS],
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ajustar amplades de columna (igual que la plantilla)
  ws['!cols'] = [
    { wch: 30 },  // Nom
    { wch: 12 },  // NIF/DNI
    { wch: 10 },  // Estat
    { wch: 12 },  // Tipus
    { wch: 12 },  // Modalitat
    { wch: 20 },  // Categoria per defecte
    { wch: 25 },  // Adreça
    { wch: 12 },  // Codi postal
    { wch: 15 },  // Ciutat
    { wch: 15 },  // Província
    { wch: 12 },  // Telèfon
    { wch: 25 },  // Email
    { wch: 28 },  // IBAN
    { wch: 14 },  // Quota mensual
    { wch: 14 },  // Data d'alta
    { wch: 18 },  // Periodicitat quota
    { wch: 25 },  // Nom de contacte
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Donants');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `donants_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}
