/**
 * Generació del manifest.xlsx per al Paquet de Tancament
 */

import * as XLSX from 'xlsx';
import { ClosingManifestRow } from './closing-types';

/**
 * Genera el buffer del manifest.xlsx a partir de les files.
 */
export function buildManifestXlsx(rows: ClosingManifestRow[]): Buffer {
  // Convertir a format per XLSX
  const data = rows.map((row) => ({
    Ordre: row.ordre,
    Data: row.data,
    Import: row.import,
    Moneda: row.moneda,
    Concepte: row.concepte,
    Categoria: row.categoria,
    Contacte: row.contacte,
    txId: row.txId,
    Document: row.document,
    Estat: row.estat,
  }));

  // Crear workbook i worksheet
  const ws = XLSX.utils.json_to_sheet(data);

  // Ajustar amplades de columna
  ws['!cols'] = [
    { wch: 6 },   // Ordre
    { wch: 12 },  // Data
    { wch: 12 },  // Import
    { wch: 6 },   // Moneda
    { wch: 50 },  // Concepte
    { wch: 25 },  // Categoria
    { wch: 25 },  // Contacte
    { wch: 24 },  // txId
    { wch: 60 },  // Document
    { wch: 18 },  // Estat
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Manifest');

  // Generar buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}
