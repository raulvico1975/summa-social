/**
 * Suppliers Export Utilities
 *
 * Exportació Excel de proveïdors.
 * Format: columnes amb noms en català per a usuaris.
 */

import * as XLSX from 'xlsx';
import type { Supplier, Category } from '@/lib/data';
import { formatIBANDisplay } from '@/lib/normalize';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface SupplierExportRow {
  Nom: string;
  'NIF/CIF': string;
  'Categoria per defecte': string;
  IBAN: string;
  Email: string;
  Telèfon: string;
  Adreça: string;
  'Codi postal': string;
  Ciutat: string;
  Província: string;
  'Condicions pagament': string;
  Notes: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL: EXPORTAR PROVEÏDORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb la llista de proveïdors
 *
 * @param suppliers - Llista de proveïdors a exportar
 * @param categories - Categories per resoldre defaultCategoryId a nom visible
 * @param categoryTranslations - Traduccions de categories (nameKey → nom visible)
 * @param filename - Nom del fitxer (opcional)
 */
export function exportSuppliersToExcel(
  suppliers: Supplier[],
  categories?: Category[],
  categoryTranslations?: Record<string, string>,
  filename?: string
): void {
  // Ordenar per nom
  const sortedSuppliers = [...suppliers].sort((a, b) =>
    a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' })
  );

  // Helper per obtenir nom de categoria
  const getCategoryName = (categoryId?: string): string => {
    if (!categoryId || !categories) return '';
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return '';
    // Si tenim traduccions i existeix, usar-la
    if (categoryTranslations && categoryTranslations[cat.name]) {
      return categoryTranslations[cat.name];
    }
    return cat.name;
  };

  // Convertir a files d'exportació
  const rows: SupplierExportRow[] = sortedSuppliers.map(sup => ({
    Nom: sup.name,
    'NIF/CIF': sup.taxId || '',
    'Categoria per defecte': getCategoryName(sup.defaultCategoryId),
    IBAN: sup.iban ? formatIBANDisplay(sup.iban) : '',
    Email: sup.email || '',
    Telèfon: sup.phone || '',
    Adreça: sup.address || '',
    'Codi postal': sup.zipCode || '',
    Ciutat: sup.city || '',
    Província: sup.province || '',
    'Condicions pagament': sup.paymentTerms || '',
    Notes: sup.notes || '',
  }));

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 30 },  // Nom
    { wch: 12 },  // NIF/CIF
    { wch: 22 },  // Categoria per defecte
    { wch: 28 },  // IBAN
    { wch: 28 },  // Email
    { wch: 14 },  // Telèfon
    { wch: 35 },  // Adreça
    { wch: 10 },  // Codi postal
    { wch: 15 },  // Ciutat
    { wch: 15 },  // Província
    { wch: 18 },  // Condicions pagament
    { wch: 35 },  // Notes
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Proveïdors');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `proveidors_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ: DESCARREGAR PLANTILLA BUIDA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega una plantilla Excel buida per importar proveïdors
 * Inclou 2 files d'exemple amb dades realistes
 */
export function downloadSuppliersTemplate(): void {
  // Files d'exemple per mostrar el format esperat
  const exampleRows: SupplierExportRow[] = [
    {
      Nom: 'Subministraments Oficina S.L.',
      'NIF/CIF': 'B12345678',
      'Categoria per defecte': 'Material oficina',
      IBAN: 'ES12 3456 7890 1234 5678 9012',
      Email: 'facturacio@subministraments.com',
      Telèfon: '934 123 456',
      Adreça: 'C/ Indústria 45, 2n',
      'Codi postal': '08025',
      Ciutat: 'Barcelona',
      Província: 'Barcelona',
      'Condicions pagament': '30 dies',
      Notes: 'Proveïdor habitual de material oficina',
    },
    {
      Nom: 'Maria López Consultoria',
      'NIF/CIF': '12345678A',
      'Categoria per defecte': 'Serveis professionals',
      IBAN: 'ES98 7654 3210 9876 5432 1098',
      Email: 'maria.lopez@consultoria.cat',
      Telèfon: '678 901 234',
      Adreça: 'Av. Diagonal 200, 5è 3a',
      'Codi postal': '08018',
      Ciutat: 'Barcelona',
      Província: 'Barcelona',
      'Condicions pagament': 'Al comptat',
      Notes: 'Assessoria fiscal i comptable',
    },
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exampleRows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 30 },  // Nom
    { wch: 12 },  // NIF/CIF
    { wch: 22 },  // Categoria per defecte
    { wch: 28 },  // IBAN
    { wch: 28 },  // Email
    { wch: 14 },  // Telèfon
    { wch: 35 },  // Adreça
    { wch: 10 },  // Codi postal
    { wch: 15 },  // Ciutat
    { wch: 15 },  // Província
    { wch: 18 },  // Condicions pagament
    { wch: 35 },  // Notes
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Proveïdors');

  // Descarregar
  XLSX.writeFile(wb, 'plantilla_proveidors.xlsx');
}
