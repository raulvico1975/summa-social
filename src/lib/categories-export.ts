/**
 * Categories Export Utilities
 *
 * Exportació Excel de categories i plantilla per importació massiva.
 * Format: columnes amb noms en català per a usuaris.
 */

import * as XLSX from 'xlsx';
import type { Category } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface CategoryExportRow {
  Nom: string;
  Tipus: string;
  Ordre: number | string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Converteix el tipus intern a format visible per usuaris
 */
function formatTypeDisplay(type: string): string {
  switch (type) {
    case 'income': return 'income';
    case 'expense': return 'expense';
    default: return type;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL: EXPORTAR CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb la llista de categories
 *
 * @param categories - Llista de categories a exportar
 * @param categoryTranslations - Traduccions de categories (nameKey → nom visible)
 * @param filename - Nom del fitxer (opcional)
 */
export function exportCategoriesToExcel(
  categories: Category[],
  categoryTranslations?: Record<string, string>,
  filename?: string
): void {
  // Ordenar per tipus (expense primer), després per ordre, després per nom
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === 'expense' ? -1 : 1;
    }
    // Ordenar per order (si existeix)
    const orderA = a.order ?? 999999;
    const orderB = b.order ?? 999999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    // Finalment per nom
    const nameA = categoryTranslations?.[a.name] || a.name;
    const nameB = categoryTranslations?.[b.name] || b.name;
    return nameA.localeCompare(nameB, 'ca', { sensitivity: 'base' });
  });

  // Convertir a files d'exportació
  const rows: CategoryExportRow[] = sortedCategories.map(cat => ({
    Nom: categoryTranslations?.[cat.name] || cat.name,
    Tipus: formatTypeDisplay(cat.type),
    Ordre: cat.order ?? '',
  }));

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 35 },  // Nom
    { wch: 12 },  // Tipus
    { wch: 8 },   // Ordre
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Categories');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `categories_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ: DESCARREGAR PLANTILLA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega una plantilla Excel per importar categories
 * Inclou 6 files d'exemple (3 expense, 3 income)
 */
export function downloadCategoriesTemplate(): void {
  // Files d'exemple per mostrar el format esperat
  const exampleRows: CategoryExportRow[] = [
    // Expense categories
    { Nom: 'Material oficina', Tipus: 'expense', Ordre: 10 },
    { Nom: 'Serveis professionals', Tipus: 'expense', Ordre: 20 },
    { Nom: 'Subministraments', Tipus: 'expense', Ordre: 30 },
    // Income categories
    { Nom: 'Donacions', Tipus: 'income', Ordre: 10 },
    { Nom: 'Quotes de socis', Tipus: 'income', Ordre: 20 },
    { Nom: 'Subvencions', Tipus: 'income', Ordre: 30 },
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exampleRows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 35 },  // Nom
    { wch: 12 },  // Tipus
    { wch: 8 },   // Ordre
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Categories');

  // Descarregar
  XLSX.writeFile(wb, 'plantilla_categories.xlsx');
}
