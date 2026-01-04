/**
 * Employees Export Utilities
 *
 * Exportació Excel de la llista de treballadors.
 * Format: columnes amb noms en català per a usuaris.
 */

import * as XLSX from 'xlsx';
import type { Employee } from '@/lib/data';
import { formatIBANDisplay } from '@/lib/normalize';

// ═══════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════

interface EmployeeExportRow {
  NIF: string;
  Nom: string;
  Email: string;
  Telèfon: string;
  IBAN: string;
  'Data alta': string;
  'Codi postal': string;
  Notes: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    // Format: DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return '';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ PRINCIPAL: EXPORTAR TREBALLADORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega un fitxer Excel amb la llista de treballadors
 */
export function exportEmployeesToExcel(employees: Employee[], filename?: string): void {
  // Ordenar per nom
  const sortedEmployees = [...employees].sort((a, b) =>
    a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' })
  );

  // Convertir a files d'exportació
  const rows: EmployeeExportRow[] = sortedEmployees.map(emp => ({
    NIF: emp.taxId || '',
    Nom: emp.name,
    Email: emp.email || '',
    Telèfon: emp.phone || '',
    IBAN: emp.iban ? formatIBANDisplay(emp.iban) : '',
    'Data alta': formatDate(emp.startDate),
    'Codi postal': emp.zipCode || '',
    Notes: emp.notes || '',
  }));

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(rows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 12 },  // NIF
    { wch: 30 },  // Nom
    { wch: 28 },  // Email
    { wch: 14 },  // Telèfon
    { wch: 28 },  // IBAN
    { wch: 12 },  // Data alta
    { wch: 10 },  // Codi postal
    { wch: 35 },  // Notes
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Treballadors');

  // Generar nom de fitxer
  const date = new Date().toISOString().split('T')[0];
  const finalFilename = filename || `treballadors_${date}.xlsx`;

  // Descarregar
  XLSX.writeFile(wb, finalFilename);
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓ: DESCARREGAR PLANTILLA BUIDA
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Genera i descarrega una plantilla Excel buida per importar treballadors
 */
export function downloadEmployeesTemplate(): void {
  // Fila d'exemple per mostrar el format esperat
  const exampleRows: EmployeeExportRow[] = [
    {
      NIF: '12345678A',
      Nom: 'Maria García López',
      Email: 'maria@exemple.com',
      Telèfon: '600 123 456',
      IBAN: 'ES12 3456 7890 1234 5678 9012',
      'Data alta': '01/01/2024',
      'Codi postal': '08001',
      Notes: 'Departament administració',
    },
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet
  const ws = XLSX.utils.json_to_sheet(exampleRows);

  // Ajustar amplades de columna
  const colWidths = [
    { wch: 12 },  // NIF
    { wch: 30 },  // Nom
    { wch: 28 },  // Email
    { wch: 14 },  // Telèfon
    { wch: 28 },  // IBAN
    { wch: 12 },  // Data alta
    { wch: 10 },  // Codi postal
    { wch: 35 },  // Notes
  ];
  ws['!cols'] = colWidths;

  // Afegir worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Treballadors');

  // Descarregar
  XLSX.writeFile(wb, 'plantilla_treballadors.xlsx');
}
