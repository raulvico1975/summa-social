/**
 * Generació del manifest.xlsx per al Paquet de Tancament
 */

import * as XLSX from 'xlsx';
import { ClosingManifestRow } from './closing-types';

export interface DebugRow {
  txId: string;
  documentUrl: string | null;
  storagePath: string | null;
  estat: string;
}

/**
 * Genera el buffer del manifest.xlsx a partir de les files.
 * Inclou dues sheets:
 * - "Manifest": Dades per a l'entitat (sense codis interns)
 * - "Debug": Dades tècniques per diagnòstic
 */
export function buildManifestXlsx(
  rows: ClosingManifestRow[],
  debugRows?: DebugRow[]
): Buffer {
  // Sheet Manifest: Dades per a l'entitat (sense txId)
  const manifestData = rows.map((row) => ({
    Ordre: row.ordre,
    Data: row.data,
    Import: row.import,
    Moneda: row.moneda,
    Concepte: row.concepte,
    Categoria: row.categoria,
    Contacte: row.contacte,
    'Nom PDF': row.nomPdf,
    Estat: row.estat,
  }));

  const wsManifest = XLSX.utils.json_to_sheet(manifestData);

  // Ajustar amplades de columna
  wsManifest['!cols'] = [
    { wch: 6 },   // Ordre
    { wch: 12 },  // Data
    { wch: 12 },  // Import
    { wch: 6 },   // Moneda
    { wch: 50 },  // Concepte
    { wch: 25 },  // Categoria
    { wch: 25 },  // Contacte
    { wch: 60 },  // Nom PDF
    { wch: 18 },  // Estat
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsManifest, 'Manifest');

  // Sheet Debug: Dades tècniques (opcional, per diagnòstic)
  if (debugRows && debugRows.length > 0) {
    const debugData = debugRows.map((row) => ({
      txId: row.txId,
      documentUrl: row.documentUrl || '—',
      storagePath: row.storagePath || '—',
      estat: row.estat,
    }));

    const wsDebug = XLSX.utils.json_to_sheet(debugData);

    wsDebug['!cols'] = [
      { wch: 24 },  // txId
      { wch: 80 },  // documentUrl
      { wch: 80 },  // storagePath
      { wch: 18 },  // estat
    ];

    XLSX.utils.book_append_sheet(wb, wsDebug, 'Debug');
  }

  // Generar buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}
