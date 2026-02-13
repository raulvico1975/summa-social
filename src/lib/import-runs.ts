/**
 * Històric d'importacions
 *
 * Col·lecció: organizations/{orgId}/importRuns/{runId}
 */

import { Timestamp } from 'firebase/firestore';

export interface ImportRun {
  /** ID únic del run */
  id: string;

  /** Tipus d'importació */
  type: 'bankTransactions' | 'contacts' | 'categories' | 'other';

  /** Font de l'import */
  source: 'csv' | 'xlsx' | 'manual' | 'api';

  /** Nom del fitxer (si n'hi ha) */
  fileName: string | null;

  /** Data mínima de les transaccions importades (YYYY-MM-DD) */
  dateMin: string;

  /** Data màxima de les transaccions importades (YYYY-MM-DD) */
  dateMax: string;

  /** Total de files processades */
  totalRows: number;

  /** Nombre de transaccions creades */
  createdCount: number;

  /** Nombre de duplicats omesos */
  duplicateSkippedCount: number;

  /** Data de creació del run */
  createdAt: Timestamp;

  /** UID de l'usuari que ha fet l'import */
  createdBy: string;

  /** ID del compte bancari (només per bankTransactions) */
  bankAccountId?: string | null;

  /** Nombre de candidats a duplicat presentats a l'usuari */
  candidateCount?: number;

  /** Nombre de candidats que l'usuari ha decidit importar */
  candidateUserImportedCount?: number;

  /** Nombre de candidats que l'usuari ha decidit ometre */
  candidateUserSkippedCount?: number;
}

/**
 * Crea un document importRun després d'una importació exitosa
 */
export function createImportRunDoc(params: {
  type: ImportRun['type'];
  source: ImportRun['source'];
  fileName: string | null;
  dateMin: string;
  dateMax: string;
  totalRows: number;
  createdCount: number;
  duplicateSkippedCount: number;
  createdBy: string;
  bankAccountId?: string | null;
  candidateCount?: number;
  candidateUserImportedCount?: number;
  candidateUserSkippedCount?: number;
}): Omit<ImportRun, 'id' | 'createdAt'> {
  return {
    type: params.type,
    source: params.source,
    fileName: params.fileName,
    dateMin: params.dateMin,
    dateMax: params.dateMax,
    totalRows: params.totalRows,
    createdCount: params.createdCount,
    duplicateSkippedCount: params.duplicateSkippedCount,
    createdBy: params.createdBy,
    bankAccountId: params.bankAccountId,
    ...(params.candidateCount !== undefined && { candidateCount: params.candidateCount }),
    ...(params.candidateUserImportedCount !== undefined && { candidateUserImportedCount: params.candidateUserImportedCount }),
    ...(params.candidateUserSkippedCount !== undefined && { candidateUserSkippedCount: params.candidateUserSkippedCount }),
  };
}
