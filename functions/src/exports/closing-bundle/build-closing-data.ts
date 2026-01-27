/**
 * Lògica de dades per al Paquet de Tancament
 * - Queries Firestore
 * - Detecció d'incidències
 * - Ordenació determinista
 */

import * as admin from 'firebase-admin';
import {
  ClosingTransaction,
  ClosingIncident,
  ClosingManifestRow,
  ClosingDocumentInfo,
  DocumentDiagnostic,
  MAX_DOCUMENTS,
  MAX_TOTAL_SIZE_MB,
} from './closing-types';
import {
  extractStorageRef,
  buildDocumentFileName,
  inferExtension,
} from './normalize-filename';

const db = admin.firestore();

/**
 * Extreu la URL/path del document d'una transacció.
 * Suporta múltiples formats històrics:
 * - document: string (URL o path directe)
 * - documentUrl: string (camp legacy)
 * - document: { url: string } (objecte historic)
 * - document: { storagePath: string } (si existeix)
 */
export function getDocumentUrlFromTx(tx: {
  document?: unknown;
  documentUrl?: string | null;
}): string | null {
  // 1. Camp document com a string
  if (typeof tx.document === 'string' && tx.document.length > 0) {
    return tx.document;
  }

  // 2. Camp documentUrl (legacy)
  if (typeof tx.documentUrl === 'string' && tx.documentUrl.length > 0) {
    return tx.documentUrl;
  }

  // 3. Camp document com a objecte
  if (tx.document && typeof tx.document === 'object') {
    const obj = tx.document as Record<string, unknown>;

    // 3a. Objecte amb .url
    if (typeof obj.url === 'string' && obj.url.length > 0) {
      return obj.url;
    }

    // 3b. Objecte amb .storagePath (si existeix)
    if (typeof obj.storagePath === 'string' && obj.storagePath.length > 0) {
      return obj.storagePath;
    }
  }

  return null;
}

/**
 * Versió interna per dades de Firestore (abans de parsejar a ClosingTransaction).
 */
function getDocumentUrlFromTxData(data: FirebaseFirestore.DocumentData): string | null {
  return getDocumentUrlFromTx({
    document: data.document,
    documentUrl: data.documentUrl,
  });
}

/**
 * Diagnostica l'estat d'un document per a una transacció.
 * Retorna informació completa per a la pestanya Debug.
 *
 * NOTA: El status 'OK' aquí significa "ready per descarregar".
 * L'estat final (OK/NOT_FOUND/DOWNLOAD_ERROR) es determina després de la descàrrega.
 */
export function diagnoseTxDocument(
  tx: ClosingTransaction,
  configuredBucket: string | null
): DocumentDiagnostic {
  const rawValue = tx.document;

  // Sense document
  if (!rawValue) {
    return {
      txId: tx.id,
      rawDocumentValue: null,
      extractedPath: null,
      bucketConfigured: configuredBucket,
      bucketInUrl: null,
      status: 'NO_DOCUMENT',
      kind: null,
    };
  }

  const ref = extractStorageRef(rawValue);

  // No parsejable
  if (!ref.path) {
    return {
      txId: tx.id,
      rawDocumentValue: rawValue,
      extractedPath: null,
      bucketConfigured: configuredBucket,
      bucketInUrl: ref.bucket,
      status: 'URL_NOT_PARSEABLE',
      kind: ref.kind,
    };
  }

  // Bucket mismatch (no intentar descarregar)
  if (ref.bucket && configuredBucket && ref.bucket !== configuredBucket) {
    return {
      txId: tx.id,
      rawDocumentValue: rawValue,
      extractedPath: ref.path,
      bucketConfigured: configuredBucket,
      bucketInUrl: ref.bucket,
      status: 'BUCKET_MISMATCH',
      kind: ref.kind,
    };
  }

  // Ready per descarregar
  return {
    txId: tx.id,
    rawDocumentValue: rawValue,
    extractedPath: ref.path,
    bucketConfigured: configuredBucket,
    bucketInUrl: ref.bucket,
    status: 'OK', // provisional, s'actualitza després de download
    kind: ref.kind,
  };
}

/**
 * Prepara diagnòstics per a totes les transaccions.
 * Sempre genera una fila Debug per cada transacció (no perd docs silenciosament).
 */
export function prepareDiagnostics(
  transactions: ClosingTransaction[],
  configuredBucket: string | null
): Map<string, DocumentDiagnostic> {
  const diagnostics = new Map<string, DocumentDiagnostic>();

  for (const tx of transactions) {
    diagnostics.set(tx.id, diagnoseTxDocument(tx, configuredBucket));
  }

  return diagnostics;
}

/**
 * Carrega les transaccions del període per a una organització.
 */
export async function loadTransactions(
  orgId: string,
  dateFrom: string,
  dateTo: string
): Promise<ClosingTransaction[]> {
  const txRef = db.collection(`organizations/${orgId}/transactions`);

  const snapshot = await txRef
    .where('date', '>=', dateFrom)
    .where('date', '<=', dateTo)
    .orderBy('date', 'asc')
    .get();

  const transactions: ClosingTransaction[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Excloure si té deletedAt
    if (data.deletedAt) continue;

    // Llegir camps per filtre ledger
    const parentTransactionId = data.parentTransactionId ?? null;
    const isRemittanceItem = data.isRemittanceItem === true;
    const source = data.source ?? null;
    const transactionType = data.transactionType ?? null;

    // LEDGER-ONLY: excloure fills i desglossos
    // Només volem moviments bancaris reals (pares), no les filles desglossades
    if (parentTransactionId) continue;
    if (isRemittanceItem) continue;
    if (source === 'remittance') continue;
    if (transactionType === 'donation') continue; // Stripe donation child
    if (transactionType === 'fee') continue;      // Stripe fee child

    // Lectura robusta de l'URL del document (pot estar a diferents camps)
    const documentUrl = getDocumentUrlFromTxData(data);

    transactions.push({
      id: doc.id,
      date: data.date ?? '',
      amount: data.amount ?? 0,
      description: data.description ?? data.note ?? '',
      category: data.category ?? null,
      categoryName: data.categoryName ?? data.category ?? null,
      contactId: data.contactId ?? null,
      contactName: data.contactName ?? null,
      document: documentUrl,
      transactionType,
      isRemittance: data.isRemittance === true,
      remittanceStatus: data.remittanceStatus ?? null,
      source,
      parentTransactionId,
      isRemittanceItem,
    });
  }

  return transactions;
}

/**
 * Ordena les transaccions de forma determinista.
 * 1. date ASC
 * 2. Math.abs(amount) ASC
 * 3. id ASC (desempat)
 */
export function sortTransactions(transactions: ClosingTransaction[]): ClosingTransaction[] {
  return [...transactions].sort((a, b) => {
    // 1. Per data
    if (a.date !== b.date) {
      return a.date.localeCompare(b.date);
    }

    // 2. Per import absolut
    const absA = Math.abs(a.amount);
    const absB = Math.abs(b.amount);
    if (absA !== absB) {
      return absA - absB;
    }

    // 3. Per ID (desempat)
    return a.id.localeCompare(b.id);
  });
}

/**
 * Detecta incidències en les transaccions.
 */
export function detectIncidents(transactions: ClosingTransaction[]): ClosingIncident[] {
  const incidents: ClosingIncident[] = [];

  for (const tx of transactions) {
    const isExpense = tx.amount < 0;

    // FALTA_DOCUMENT: despesa sense document
    if (isExpense && !tx.document) {
      incidents.push({
        txId: tx.id,
        type: 'FALTA_DOCUMENT',
        severity: 'alta',
        message: 'Despesa sense document adjunt',
      });
    }

    // SENSE_CATEGORIA: moviment sense categoria
    if (!tx.category) {
      incidents.push({
        txId: tx.id,
        type: 'SENSE_CATEGORIA',
        severity: 'mitjana',
        message: 'Moviment sense categoria assignada',
      });
    }

    // SENSE_CONTACTE: despesa sense contacte (opcional, severitat baixa)
    if (isExpense && !tx.contactId) {
      incidents.push({
        txId: tx.id,
        type: 'SENSE_CONTACTE',
        severity: 'baixa',
        message: 'Despesa sense contacte assignat',
      });
    }

    // DEVOLUCIO_PENDENT: devolució sense conciliar
    if (tx.transactionType === 'return' && !tx.contactId) {
      incidents.push({
        txId: tx.id,
        type: 'DEVOLUCIO_PENDENT',
        severity: 'alta',
        message: 'Devolució pendent de conciliar',
      });
    }

    // REMESA_PARCIAL: remesa amb devolucions parcials
    if (tx.isRemittance && tx.remittanceStatus === 'partial') {
      incidents.push({
        txId: tx.id,
        type: 'REMESA_PARCIAL',
        severity: 'alta',
        message: 'Remesa amb devolucions parcials',
      });
    }
  }

  return incidents;
}

/**
 * Prepara la llista de documents a descarregar.
 * Retorna info de cada document amb el seu nom final.
 * Usa extractStorageRef per suportar tots els formats.
 */
export function prepareDocuments(
  transactions: ClosingTransaction[],
  diagnostics: Map<string, DocumentDiagnostic>
): { docs: ClosingDocumentInfo[]; txWithDoc: Map<string, ClosingDocumentInfo> } {
  const docs: ClosingDocumentInfo[] = [];
  const txWithDoc = new Map<string, ClosingDocumentInfo>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const diagnostic = diagnostics.get(tx.id);

    // Només incloure si té path extret i no és BUCKET_MISMATCH/URL_NOT_PARSEABLE/NO_DOCUMENT
    if (!diagnostic || !diagnostic.extractedPath) continue;
    if (diagnostic.status !== 'OK') continue;

    const storagePath = diagnostic.extractedPath;
    const ordre = i + 1;
    const extension = inferExtension(null, storagePath);
    const fileName = buildDocumentFileName({
      ordre,
      date: tx.date,
      amount: tx.amount,
      concept: tx.description,
      txId: tx.id,
      extension,
    });

    const docInfo: ClosingDocumentInfo = {
      txId: tx.id,
      ordre,
      storagePath,
      fileName,
      contentType: null,
      size: null,
    };

    docs.push(docInfo);
    txWithDoc.set(tx.id, docInfo);
  }

  return { docs, txWithDoc };
}

/**
 * Valida els límits abans de començar la descàrrega.
 * Retorna null si ok, o un error message si supera límits.
 */
export async function validateLimits(
  docs: ClosingDocumentInfo[]
): Promise<{ error: string | null; totalSizeMB: number }> {
  if (docs.length > MAX_DOCUMENTS) {
    return {
      error: `El període té ${docs.length} documents. Màxim: ${MAX_DOCUMENTS}. Prova amb un període més curt.`,
      totalSizeMB: 0,
    };
  }

  // Calcular mida total amb metadata
  const bucket = admin.storage().bucket();
  let totalSize = 0;

  for (const doc of docs) {
    try {
      const file = bucket.file(doc.storagePath);
      const [metadata] = await file.getMetadata();
      const size = parseInt(metadata.size as string, 10) || 0;
      doc.size = size;
      doc.contentType = (metadata.contentType as string) || null;
      totalSize += size;
    } catch {
      // Si no podem obtenir metadata, assumim 0 i continuem
      doc.size = 0;
    }
  }

  const totalSizeMB = totalSize / (1024 * 1024);

  if (totalSizeMB > MAX_TOTAL_SIZE_MB) {
    return {
      error: `La mida total dels documents (${totalSizeMB.toFixed(1)} MB) supera el màxim de ${MAX_TOTAL_SIZE_MB} MB. Prova amb un període més curt.`,
      totalSizeMB,
    };
  }

  return { error: null, totalSizeMB };
}

/**
 * Construeix les files del manifest Excel (pestanya usuari).
 * Usa camps observables: teDocument (Sí/No) + nomDocument (nom al ZIP o buit).
 */
export function buildManifestRows(
  transactions: ClosingTransaction[],
  txWithDoc: Map<string, ClosingDocumentInfo>,
  downloadedTxIds: Set<string>
): ClosingManifestRow[] {
  return transactions.map((tx, index) => {
    const ordre = index + 1;
    const docInfo = txWithDoc.get(tx.id);
    const wasDownloaded = downloadedTxIds.has(tx.id);

    return {
      ordre,
      data: tx.date,
      import: tx.amount,
      moneda: 'EUR',
      concepte: tx.description,
      categoria: tx.categoryName || '',
      contacte: tx.contactName || '',
      txId: tx.id,
      teDocument: !!tx.document,
      nomDocument: wasDownloaded && docInfo ? docInfo.fileName : '',
    };
  });
}

/**
 * Comptadors per status de documents (per al resum).
 */
export interface DocumentStatusCounts {
  ok: number;
  noDocument: number;
  urlNotParseable: number;
  bucketMismatch: number;
  notFound: number;
  downloadError: number;
}

/**
 * Genera el README.txt (arrel del ZIP).
 * Explicació breu del contingut del paquet.
 */
export function buildReadmeText(
  orgSlug: string,
  dateFrom: string,
  dateTo: string
): string {
  return `PAQUET DE TANCAMENT - SUMMA SOCIAL
=====================================

Organització: ${orgSlug}
Període: ${dateFrom} a ${dateTo}

CONTINGUT DEL PAQUET
--------------------

📄 moviments.xlsx
   Llistat de tots els moviments del període amb:
   Ordre, Data, Import, Concepte, Categoria, Contacte, Document

📄 resum.txt
   Resum econòmic: totals d'ingressos, despeses i saldo

📁 documents/
   Fitxers adjunts vinculats als moviments
   Format del nom: ORDRE_DATA_IMPORT_CONCEPTE_TXID.ext

📁 debug/
   Informació tècnica per a diagnòstic (només si cal revisar problemes)

NOTA
----
La columna "Ordre" de moviments.xlsx correspon al prefix numèric
del nom dels fitxers a la carpeta documents/.
`;
}

/**
 * Genera el text del resum (arrel del ZIP).
 * Versió humana sense detalls tècnics.
 */
export function buildSummaryText(params: {
  runId: string;
  orgSlug: string;
  dateFrom: string;
  dateTo: string;
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  totalWithDocRef: number;
  totalIncluded: number;
  statusCounts: DocumentStatusCounts;
  totalIncidents: number;
}): string {
  const {
    orgSlug,
    dateFrom,
    dateTo,
    totalTransactions,
    totalIncome,
    totalExpense,
    totalWithDocRef,
    totalIncluded,
    statusCounts,
  } = params;

  const saldo = totalIncome + totalExpense;
  const movimentsSenseDoc = statusCounts.noDocument;

  return `RESUM ECONÒMIC
==============

Organització: ${orgSlug}
Període: ${dateFrom} a ${dateTo}
Generat: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}

MOVIMENTS
---------
Total moviments: ${totalTransactions}
Total ingressos: ${totalIncome.toFixed(2)} EUR
Total despeses: ${totalExpense.toFixed(2)} EUR
Saldo: ${saldo.toFixed(2)} EUR

DOCUMENTS
---------
Moviments amb document adjunt: ${totalWithDocRef}
Documents inclosos al ZIP: ${totalIncluded}
Moviments sense document: ${movimentsSenseDoc}
`;
}

/**
 * Genera el resum_debug.txt (carpeta debug/).
 * Versió tècnica amb breakdown per status.
 */
export function buildDebugSummaryText(params: {
  runId: string;
  orgSlug: string;
  dateFrom: string;
  dateTo: string;
  totalTransactions: number;
  totalWithDocRef: number;
  totalIncluded: number;
  statusCounts: DocumentStatusCounts;
}): string {
  const {
    runId,
    orgSlug,
    dateFrom,
    dateTo,
    totalTransactions,
    totalWithDocRef,
    totalIncluded,
    statusCounts,
  } = params;

  const totalNotIncluded = totalWithDocRef - totalIncluded;

  return `DIAGNÒSTIC TÈCNIC - PAQUET DE TANCAMENT
========================================
Run ID: ${runId}

Organització: ${orgSlug}
Període: ${dateFrom} a ${dateTo}
Generat: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}

TRANSACCIONS
------------
Total transaccions: ${totalTransactions}

DOCUMENTS - BREAKDOWN PER STATUS
--------------------------------
OK (descarregats): ${statusCounts.ok}
NO_DOCUMENT (sense referència): ${statusCounts.noDocument}
URL_NOT_PARSEABLE (URL no reconeguda): ${statusCounts.urlNotParseable}
BUCKET_MISMATCH (bucket diferent): ${statusCounts.bucketMismatch}
NOT_FOUND (fitxer no existeix): ${statusCounts.notFound}
DOWNLOAD_ERROR (error de xarxa): ${statusCounts.downloadError}

RESUM
-----
Moviments amb document referenciat: ${totalWithDocRef}
Documents inclosos al ZIP: ${totalIncluded}
Documents no inclosos: ${totalNotIncluded}

NOTA
----
Consulteu debug.xlsx per al detall complet de cada transacció.
`;
}
