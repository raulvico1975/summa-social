// src/lib/pending-documents/types.ts
// Tipus per a documents pendents de conciliació bancària (factures/nòmines pre-banc)

import type { Timestamp } from 'firebase/firestore';

/**
 * Estat del document pendent.
 * - draft: Pujat però no confirmat (camps poden estar incomplets)
 * - confirmed: Confirmat per l'usuari (camps obligatoris complets)
 * - sepa_generated: Inclòs en una remesa SEPA generada
 * - matched: Conciliat amb un moviment bancari
 * - archived: Arxivat manualment (sense conciliar)
 */
export type PendingDocumentStatus =
  | 'draft'
  | 'confirmed'
  | 'sepa_generated'
  | 'matched'
  | 'archived';

/**
 * Tipus de document pendent.
 */
export type PendingDocumentType = 'invoice' | 'payroll' | 'receipt' | 'unknown';

/**
 * Font d'extracció de dades.
 */
export type ExtractionSource = 'xml' | 'ai' | 'manual';

/**
 * Nivell de confiança de l'extracció.
 */
export type ExtractionConfidence = 'high' | 'medium' | 'low';

/**
 * Informació del fitxer pujat.
 */
export interface PendingDocumentFile {
  storagePath: string;      // Path a Firebase Storage
  filename: string;         // Nom original del fitxer
  contentType: string;      // MIME type (application/pdf, text/xml, etc.)
  sizeBytes: number;        // Mida en bytes
  sha256: string | null;    // Hash per dedupe (calculat al client)
  url?: string;             // URL signada (generada runtime, no persistida)
  finalStoragePath?: string; // Path estable després de match (organizations/{orgId}/documents/{txId}/{filename})
}

/**
 * Evidències de l'extracció (text literal del document).
 */
export interface ExtractionEvidence {
  invoiceNumber?: string;
  invoiceDate?: string;
  amount?: string;
  supplierName?: string;
  supplierTaxId?: string;
}

/**
 * Informació d'extracció automàtica.
 */
export interface PendingDocumentExtraction {
  source: ExtractionSource;
  confidence: ExtractionConfidence;
  evidence?: ExtractionEvidence;  // Text literal d'on s'han extret els camps (només AI)
}

/**
 * Informació de remesa SEPA (quan s'inclou en un pagament).
 */
export interface PendingDocumentSepa {
  remittanceId: string;     // ID de la remesa
  endToEndId: string;       // Identificador únic del pagament
}

/**
 * Font de cada camp (per distingir extret vs manual).
 * Si un camp és 'manual', l'usuari l'ha editat i no s'ha de sobreescriure.
 */
export interface FieldSources {
  invoiceNumber?: 'extracted' | 'manual';
  invoiceDate?: 'extracted' | 'manual';
  amount?: 'extracted' | 'manual';
  supplierId?: 'extracted' | 'manual';
  categoryId?: 'extracted' | 'manual';
}

/**
 * Document pendent de conciliació.
 * S'emmagatzema a: organizations/{orgId}/pendingDocuments/{docId}
 *
 * IMPORTANT: Aquests documents NO afecten saldos, projectes ni fiscalitat
 * fins que es conciliïn amb un moviment bancari real.
 */
export interface PendingDocument {
  id: string;

  // Estat i tipus
  status: PendingDocumentStatus;
  type: PendingDocumentType;

  // Fitxer
  file: PendingDocumentFile;

  // Dades de la factura/nòmina (null si no s'han extret/introduït)
  invoiceNumber: string | null;
  invoiceDate: string | null;     // Format: YYYY-MM-DD
  amount: number | null;          // Import en cèntims o euros? -> euros amb decimals

  // Referències
  supplierId: string | null;      // ID del proveïdor/treballador
  categoryId: string | null;      // ID de la categoria suggerida

  // Extracció automàtica
  extracted: PendingDocumentExtraction | null;

  // Font de cada camp (per distingir extret vs manual)
  fieldSources?: FieldSources | null;

  // SEPA (quan s'inclou en una remesa de pagament)
  sepa: PendingDocumentSepa | null;

  // Conciliació
  matchedTransactionId: string | null;
  suggestedTransactionIds?: string[];  // Suggeriments de match (màx 3)
  ignoredTransactionIds?: string[];    // Suggeriments descartats manualment

  // Liquidació (només per receipts)
  reportId: string | null;  // ID de la liquidació a què pertany

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  confirmedAt: Timestamp | null;

  // Arxivat
  archivedAt?: Timestamp | null;
  previousStatus?: PendingDocumentStatus | null;  // Estat abans d'arxivar (per restaurar)
}

/**
 * Input per crear un document pendent en estat draft.
 * Només requereix el fitxer; la resta s'omple després.
 */
export interface CreatePendingDocumentInput {
  type: PendingDocumentType;
  file: PendingDocumentFile;
}

/**
 * Patch per actualitzar un document pendent.
 */
export interface UpdatePendingDocumentInput {
  status?: PendingDocumentStatus;
  type?: PendingDocumentType;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  amount?: number | null;
  supplierId?: string | null;
  categoryId?: string | null;
  extracted?: PendingDocumentExtraction | null;
  fieldSources?: FieldSources | null;
  sepa?: PendingDocumentSepa | null;
  matchedTransactionId?: string | null;
  suggestedTransactionIds?: string[];
  ignoredTransactionIds?: string[];
  reportId?: string | null;
  confirmedAt?: Timestamp | null;
  archivedAt?: Timestamp | null;
  previousStatus?: PendingDocumentStatus | null;
}
