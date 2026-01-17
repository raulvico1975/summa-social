/**
 * Cloud Function: exportClosingBundleZip
 *
 * Genera un ZIP amb el paquet de tancament per streaming.
 * - POST amb Authorization: Bearer <FirebaseIdToken>
 * - Body: { orgId, dateFrom, dateTo }
 * - Resposta: ZIP stream o JSON error
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions/v1';
import archiver from 'archiver';
import type { Response } from 'express';

import { ClosingBundleRequest, ClosingBundleError } from './closing-bundle/closing-types';
import {
  loadTransactions,
  sortTransactions,
  detectIncidents,
  prepareDocuments,
  validateLimits,
  buildManifestRows,
  buildSummaryText,
} from './closing-bundle/build-closing-data';
import { buildManifestXlsx } from './closing-bundle/build-closing-xlsx';
import { inferExtension, buildDocumentFileName } from './closing-bundle/normalize-filename';

const db = admin.firestore();

/**
 * Envia una resposta d'error JSON.
 */
function sendError(res: Response, status: number, error: ClosingBundleError): void {
  res.status(status).json(error);
}

/**
 * Valida el format de data YYYY-MM-DD.
 */
function isValidDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export const exportClosingBundleZip = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 360, // 6 minuts
    memory: '1GB',
  })
  .https.onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');

    // OPTIONS preflight
    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    // Només POST
    if (req.method !== 'POST') {
      res.status(405).json({ code: 'INVALID_REQUEST', message: 'Mètode no permès' });
      return;
    }

    // 1. Extreure token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendError(res, 401, { code: 'UNAUTHENTICATED', message: 'Token no proporcionat' });
      return;
    }

    const idToken = authHeader.slice(7);

    // 2. Verificar token
    let uid: string;
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (err) {
      functions.logger.warn('[closingBundleZip] Token invàlid', err);
      sendError(res, 401, { code: 'UNAUTHENTICATED', message: 'Token invàlid' });
      return;
    }

    // 3. Parsejar body
    let body: ClosingBundleRequest;
    try {
      body = req.body as ClosingBundleRequest;
    } catch {
      sendError(res, 400, { code: 'INVALID_REQUEST', message: 'Body invàlid' });
      return;
    }

    const { orgId, dateFrom, dateTo } = body;

    // Validar camps
    if (!orgId || typeof orgId !== 'string') {
      sendError(res, 400, { code: 'INVALID_REQUEST', message: 'orgId és obligatori' });
      return;
    }

    if (!dateFrom || !isValidDate(dateFrom)) {
      sendError(res, 400, { code: 'INVALID_REQUEST', message: 'dateFrom invàlid (format YYYY-MM-DD)' });
      return;
    }

    if (!dateTo || !isValidDate(dateTo)) {
      sendError(res, 400, { code: 'INVALID_REQUEST', message: 'dateTo invàlid (format YYYY-MM-DD)' });
      return;
    }

    // 4. Verificar rol de l'usuari
    try {
      const memberRef = db.doc(`organizations/${orgId}/members/${uid}`);
      const memberSnap = await memberRef.get();

      if (!memberSnap.exists) {
        sendError(res, 403, { code: 'UNAUTHORIZED', message: 'No ets membre d\'aquesta organització' });
        return;
      }

      const memberData = memberSnap.data();
      const role = memberData?.role as string | undefined;

      if (role !== 'admin' && role !== 'superadmin') {
        sendError(res, 403, { code: 'UNAUTHORIZED', message: 'No tens permisos per generar aquest paquet' });
        return;
      }
    } catch (err) {
      functions.logger.error('[closingBundleZip] Error verificant rol', err);
      sendError(res, 500, { code: 'INTERNAL_ERROR', message: 'Error verificant permisos' });
      return;
    }

    // 5. Obtenir orgSlug
    let orgSlug = orgId;
    try {
      const orgSnap = await db.doc(`organizations/${orgId}`).get();
      if (orgSnap.exists) {
        orgSlug = (orgSnap.data()?.slug as string) || orgId;
      }
    } catch {
      // Usar orgId com a fallback
    }

    functions.logger.info('[closingBundleZip] Iniciant generació', { orgId, dateFrom, dateTo, uid });

    try {
      // 6. Carregar transaccions
      const rawTransactions = await loadTransactions(orgId, dateFrom, dateTo);

      if (rawTransactions.length === 0) {
        sendError(res, 400, { code: 'NO_TRANSACTIONS', message: 'No hi ha moviments en aquest període' });
        return;
      }

      // 7. Ordenar
      const transactions = sortTransactions(rawTransactions);

      // 8. Detectar incidències
      const incidents = detectIncidents(transactions);

      // 9. Preparar documents
      const { docs, txWithDoc } = prepareDocuments(transactions);

      // 10. Validar límits
      const { error: limitError } = await validateLimits(docs);
      if (limitError) {
        sendError(res, 400, { code: 'LIMIT_EXCEEDED', message: limitError });
        return;
      }

      // 11. Iniciar streaming del ZIP
      const fileName = `summa_tancament_${orgSlug}_${dateFrom}_${dateTo}.zip`;

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

      const archive = archiver('zip', { zlib: { level: 9 } });

      archive.on('error', (err) => {
        functions.logger.error('[closingBundleZip] Error archiver', err);
        // Si ja hem començat a enviar, no podem enviar error JSON
      });

      archive.pipe(res);

      // 12. Descarregar documents i afegir al ZIP
      const bucket = admin.storage().bucket();
      const failedDownloads = new Set<string>();
      let downloadedCount = 0;

      for (const docInfo of docs) {
        try {
          const file = bucket.file(docInfo.storagePath);
          const [buffer] = await file.download();

          // Actualitzar extensió si tenim contentType
          let finalFileName = docInfo.fileName;
          if (docInfo.contentType) {
            const ext = inferExtension(docInfo.contentType, docInfo.storagePath);
            // Reconstruir nom amb extensió correcta
            finalFileName = buildDocumentFileName({
              ordre: docInfo.ordre,
              date: transactions.find((t) => t.id === docInfo.txId)?.date || '',
              amount: transactions.find((t) => t.id === docInfo.txId)?.amount || 0,
              concept: transactions.find((t) => t.id === docInfo.txId)?.description || '',
              txId: docInfo.txId,
              extension: ext,
            });
          }

          archive.append(buffer, { name: `documents/${finalFileName}` });
          downloadedCount++;

          // Actualitzar docInfo per al manifest
          docInfo.fileName = finalFileName;
        } catch (err) {
          functions.logger.warn('[closingBundleZip] Error descarregant document', {
            txId: docInfo.txId,
            storagePath: docInfo.storagePath,
            error: err instanceof Error ? err.message : 'Unknown',
          });
          failedDownloads.add(docInfo.txId);
        }
      }

      // 13. Construir manifest
      const manifestRows = buildManifestRows(transactions, txWithDoc, failedDownloads);
      const manifestBuffer = buildManifestXlsx(manifestRows);
      archive.append(manifestBuffer, { name: 'manifest.xlsx' });

      // 14. Calcular estadístiques
      const totalIncome = transactions.filter((t) => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = transactions.filter((t) => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);

      // 15. Construir resum
      const summaryText = buildSummaryText({
        orgSlug,
        dateFrom,
        dateTo,
        totalTransactions: transactions.length,
        totalIncome,
        totalExpense,
        totalWithDoc: docs.length,
        totalDownloaded: downloadedCount,
        totalFailed: failedDownloads.size,
        totalIncidents: incidents.length,
      });

      archive.append(summaryText, { name: 'resum.txt' });

      // 16. Finalitzar ZIP
      await archive.finalize();

      functions.logger.info('[closingBundleZip] Generat amb èxit', {
        orgId,
        transactions: transactions.length,
        documents: downloadedCount,
        failed: failedDownloads.size,
        incidents: incidents.length,
      });
    } catch (err) {
      functions.logger.error('[closingBundleZip] Error intern', err);

      // Si no hem enviat headers encara
      if (!res.headersSent) {
        sendError(res, 500, { code: 'INTERNAL_ERROR', message: 'Error intern generant el paquet' });
      }
    }
  });
