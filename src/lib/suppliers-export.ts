/**
 * Suppliers Export Utilities
 *
 * Exportació Excel de proveïdors.
 * REGLA: Export = Import (mateixes columnes, mateix ordre que la plantilla oficial)
 */

import * as XLSX from 'xlsx';
import type { Supplier, Category } from '@/lib/data';
import { formatIBANDisplay } from '@/lib/normalize';
import { SUPPLIERS_TEMPLATE_HEADERS } from '@/lib/suppliers/suppliers-template';

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL: EXPORTAR PROVEÏDORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb la llista de proveïdors.
 * Les columnes són idèntiques a la plantilla oficial d'importació.
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

  // Construir files seguint l'ordre de SUPPLIERS_TEMPLATE_HEADERS
  const rows: string[][] = sortedSuppliers.map(sup => [
    sup.name || '',                                 // Nom
    sup.taxId || '',                                // NIF/CIF
    getCategoryName(sup.defaultCategoryId),         // Categoria per defecte
    sup.address || '',                              // Adreça
    sup.zipCode || '',                              // Codi postal
    sup.city || '',                                 // Ciutat
    sup.province || '',                             // Província
    sup.phone || '',                                // Telèfon
    sup.email || '',                                // Email
    sup.iban ? formatIBANDisplay(sup.iban) : '',    // IBAN
  ]);

  // Crear worksheet amb capçaleres + dades
  const data = [
    [...SUPPLIERS_TEMPLATE_HEADERS],
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Ajustar amplades de columna (igual que la plantilla)
  ws['!cols'] = [
    { wch: 30 },  // Nom
    { wch: 12 },  // NIF/CIF
    { wch: 20 },  // Categoria per defecte
    { wch: 25 },  // Adreça
    { wch: 12 },  // Codi postal
    { wch: 15 },  // Ciutat
    { wch: 15 },  // Província
    { wch: 12 },  // Telèfon
    { wch: 25 },  // Email
    { wch: 28 },  // IBAN
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Proveidors');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `proveidors_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}
