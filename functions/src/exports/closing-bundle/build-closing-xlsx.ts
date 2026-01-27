/**
 * Generació del manifest.xlsx per al Paquet de Tancament
 */

import * as XLSX from 'xlsx';
import { ClosingManifestRow, DocumentDiagnosticStatus } from './closing-types';

/**
 * Fila de debug amb informació completa de diagnòstic.
 */
export interface DebugRow {
  txId: string;
  rawDocumentValue: string | null;
  extractedPath: string | null;
  bucketConfigured: string | null;
  bucketInUrl: string | null;
  status: DocumentDiagnosticStatus;
  kind: string | null;
}

/**
 * Genera el buffer del manifest.xlsx a partir de les files.
 * Inclou dues sheets:
 * - "Manifest": Dades per a l'entitat (camps observables, sense judici)
 * - "Debug": Dades tècniques completes per diagnòstic
 */
export function buildManifestXlsx(
  rows: ClosingManifestRow[],
  debugRows?: DebugRow[]
): Buffer {
  // Sheet Manifest: Dades per a l'entitat
  // Camps observables: Té document (Sí/No) + Nom document (buit si no inclòs)
  const manifestData = rows.map((row) => ({
    Ordre: row.ordre,
    Data: row.data,
    Import: row.import,
    Moneda: row.moneda,
    Concepte: row.concepte,
    Categoria: row.categoria,
    Contacte: row.contacte,
    'Té document': row.teDocument ? 'Sí' : 'No',
    'Nom document': row.nomDocument || '',
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
    { wch: 12 },  // Té document
    { wch: 60 },  // Nom document
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsManifest, 'Manifest');

  // Sheet Debug: Dades tècniques completes
  if (debugRows && debugRows.length > 0) {
    const debugData = debugRows.map((row) => ({
      txId: row.txId,
      rawDocumentValue: row.rawDocumentValue || '—',
      extractedPath: row.extractedPath || '—',
      bucketConfigured: row.bucketConfigured || '—',
      bucketInUrl: row.bucketInUrl || '—',
      status: row.status,
      kind: row.kind || '—',
    }));

    const wsDebug = XLSX.utils.json_to_sheet(debugData);

    wsDebug['!cols'] = [
      { wch: 24 },  // txId
      { wch: 80 },  // rawDocumentValue
      { wch: 60 },  // extractedPath
      { wch: 30 },  // bucketConfigured
      { wch: 30 },  // bucketInUrl
      { wch: 18 },  // status
      { wch: 10 },  // kind
    ];

    XLSX.utils.book_append_sheet(wb, wsDebug, 'Debug');
  }

  // Generar buffer
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  return buffer;
}
