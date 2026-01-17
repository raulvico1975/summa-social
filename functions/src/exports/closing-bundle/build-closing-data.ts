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
  DocumentStatus,
  MAX_DOCUMENTS,
  MAX_TOTAL_SIZE_MB,
} from './closing-types';
import {
  extractStoragePathFromUrl,
  buildDocumentFileName,
  inferExtension,
} from './normalize-filename';

const db = admin.firestore();

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

    transactions.push({
      id: doc.id,
      date: data.date ?? '',
      amount: data.amount ?? 0,
      description: data.description ?? data.note ?? '',
      category: data.category ?? null,
      categoryName: data.categoryName ?? data.category ?? null,
      contactId: data.contactId ?? null,
      contactName: data.contactName ?? null,
      document: data.document ?? null,
      transactionType: data.transactionType ?? null,
      isRemittance: data.isRemittance === true,
      remittanceStatus: data.remittanceStatus ?? null,
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
 */
export function prepareDocuments(
  transactions: ClosingTransaction[]
): { docs: ClosingDocumentInfo[]; txWithDoc: Map<string, ClosingDocumentInfo> } {
  const docs: ClosingDocumentInfo[] = [];
  const txWithDoc = new Map<string, ClosingDocumentInfo>();

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    if (!tx.document) continue;

    const storagePath = extractStoragePathFromUrl(tx.document);
    if (!storagePath) continue;

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
 * Construeix les files del manifest Excel.
 */
export function buildManifestRows(
  transactions: ClosingTransaction[],
  txWithDoc: Map<string, ClosingDocumentInfo>,
  failedDownloads: Set<string>
): ClosingManifestRow[] {
  return transactions.map((tx, index) => {
    const ordre = index + 1;
    const docInfo = txWithDoc.get(tx.id);

    let estat: DocumentStatus = 'FALTA';
    let documentName = '—';

    if (docInfo) {
      if (failedDownloads.has(tx.id)) {
        estat = 'FALLA_DESCARREGA';
        documentName = docInfo.fileName;
      } else {
        estat = 'OK';
        documentName = docInfo.fileName;
      }
    }

    return {
      ordre,
      data: tx.date,
      import: tx.amount,
      moneda: 'EUR',
      concepte: tx.description,
      categoria: tx.categoryName || '',
      contacte: tx.contactName || '',
      txId: tx.id,
      document: documentName,
      estat,
    };
  });
}

/**
 * Genera el text del resum.
 */
export function buildSummaryText(params: {
  orgSlug: string;
  dateFrom: string;
  dateTo: string;
  totalTransactions: number;
  totalIncome: number;
  totalExpense: number;
  totalWithDoc: number;
  totalDownloaded: number;
  totalFailed: number;
  totalIncidents: number;
}): string {
  const {
    orgSlug,
    dateFrom,
    dateTo,
    totalTransactions,
    totalIncome,
    totalExpense,
    totalWithDoc,
    totalDownloaded,
    totalFailed,
    totalIncidents,
  } = params;

  const saldo = totalIncome + totalExpense;

  return `PAQUET DE TANCAMENT - SUMMA SOCIAL
=====================================

Organització: ${orgSlug}
Període: ${dateFrom} a ${dateTo}
Generat: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}

RESUM DE MOVIMENTS
------------------
Total moviments: ${totalTransactions}
Total ingressos: ${totalIncome.toFixed(2)} EUR
Total despeses: ${totalExpense.toFixed(2)} EUR
Saldo: ${saldo.toFixed(2)} EUR

DOCUMENTS
---------
Moviments amb document: ${totalWithDoc}
Documents descarregats: ${totalDownloaded}
Documents fallits: ${totalFailed}

INCIDÈNCIES
-----------
Total incidències: ${totalIncidents}

NOTA
----
Els documents inclosos corresponen als adjunts vinculats a moviments.
Els noms dels fitxers segueixen el format: ORDRE_DATA_IMPORT_CONCEPTE_TXID.ext
La columna "Ordre" del manifest.xlsx correspon al prefix del nom del PDF.
`;
}
