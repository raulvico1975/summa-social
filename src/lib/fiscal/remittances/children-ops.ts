/**
 * Operacions sobre filles de remeses
 *
 * Helpers per:
 * - Obtenir IDs de filles actives (doc o fallback query)
 * - Soft-delete de filles per IDs
 */

import { type Firestore } from 'firebase-admin/firestore';
import { BATCH_SIZE } from './constants';

// =============================================================================
// TIPUS
// =============================================================================

export type ArchiveReason =
  | 'undo_remittance'
  | 'repair_purge'
  | 'rollback_invariant_failure'
  | 'process_rollback';

export type ArchiveAction =
  | 'undo_remittance_in'
  | 'repair_remittance_in'
  | 'process_rollback';

// =============================================================================
// FUNCIONS
// =============================================================================

/**
 * Obté els IDs de filles actives d'una remesa
 *
 * Estratègia:
 * 1. Si hi ha transactionIds[] al doc remittance → usar aquests
 * 2. Fallback: query per parentTransactionId o remittanceId amb archivedAt == null
 *
 * @param db - Firestore instance (Admin SDK)
 * @param orgId - ID de l'organització
 * @param parentTxId - ID de la transacció pare
 * @param remittanceId - ID del document remittance (opcional)
 * @param transactionIdsFromDoc - transactionIds[] del doc remittance (si existeix)
 * @returns Array d'IDs de transaccions actives
 */
export async function getActiveChildTransactionIds(
  db: Firestore,
  orgId: string,
  parentTxId: string,
  remittanceId: string | null,
  transactionIdsFromDoc: string[] | null
): Promise<string[]> {
  // Opció 1: Usar transactionIds del doc si existeix
  if (transactionIdsFromDoc && transactionIdsFromDoc.length > 0) {
    // Verificar que les filles encara estan actives
    const activeIds: string[] = [];

    for (let i = 0; i < transactionIdsFromDoc.length; i += BATCH_SIZE) {
      const chunk = transactionIdsFromDoc.slice(i, i + BATCH_SIZE);

      // Verificar en paral·lel
      const checks = await Promise.all(
        chunk.map(async (txId) => {
          const docRef = db.doc(`organizations/${orgId}/transactions/${txId}`);
          const docSnap = await docRef.get();
          if (docSnap.exists) {
            const data = docSnap.data();
            // Només retornar si archivedAt és null (activa)
            if (data?.archivedAt === null || data?.archivedAt === undefined) {
              return txId;
            }
          }
          return null;
        })
      );

      activeIds.push(...checks.filter((id): id is string => id !== null));
    }

    return activeIds;
  }

  // Opció 2: Fallback query
  console.log('[children-ops] Fallback query for active children');

  const txCollection = db.collection(`organizations/${orgId}/transactions`);

  // Intentar per remittanceId primer (més precís)
  if (remittanceId) {
    const byRemittanceId = await txCollection
      .where('remittanceId', '==', remittanceId)
      .where('archivedAt', '==', null)
      .get();

    if (!byRemittanceId.empty) {
      return byRemittanceId.docs.map((doc) => doc.id);
    }
  }

  // Fallback per parentTransactionId
  const byParentTxId = await txCollection
    .where('parentTransactionId', '==', parentTxId)
    .where('archivedAt', '==', null)
    .get();

  return byParentTxId.docs.map((doc) => doc.id);
}

/**
 * Soft-delete de transaccions per IDs
 *
 * Fa update en chunks de BATCH_SIZE per evitar límits de Firestore.
 * MAI fa hard-delete de transaccions fiscals.
 *
 * @param db - Firestore instance (Admin SDK)
 * @param orgId - ID de l'organització
 * @param transactionIds - IDs de transaccions a arxivar
 * @param uid - UID de l'usuari que fa l'operació
 * @param reason - Motiu de l'arxivat
 * @param action - Acció que ha provocat l'arxivat
 * @returns Nombre de transaccions arxivades
 */
export async function softArchiveTransactionsByIds(
  db: Firestore,
  orgId: string,
  transactionIds: string[],
  uid: string,
  reason: ArchiveReason,
  action: ArchiveAction
): Promise<number> {
  if (transactionIds.length === 0) {
    return 0;
  }

  const now = new Date().toISOString();
  let archivedCount = 0;

  for (let i = 0; i < transactionIds.length; i += BATCH_SIZE) {
    const chunk = transactionIds.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const txId of chunk) {
      const childRef = db.doc(`organizations/${orgId}/transactions/${txId}`);
      batch.update(childRef, {
        archivedAt: now,
        archivedByUid: uid,
        archivedReason: reason,
        archivedFromAction: action,
      });
      archivedCount++;
    }

    await batch.commit();
  }

  return archivedCount;
}

/**
 * Elimina documents de la subcol·lecció pending (hard-delete OK, no són fiscals)
 */
export async function deletePendingItems(
  db: Firestore,
  orgId: string,
  remittanceId: string
): Promise<number> {
  const pendingRef = db.collection(`organizations/${orgId}/remittances/${remittanceId}/pending`);
  const pendingSnap = await pendingRef.get();

  if (pendingSnap.empty) {
    return 0;
  }

  let deletedCount = 0;

  for (let i = 0; i < pendingSnap.docs.length; i += BATCH_SIZE) {
    const chunk = pendingSnap.docs.slice(i, i + BATCH_SIZE);
    const batch = db.batch();

    for (const doc of chunk) {
      batch.delete(doc.ref);
      deletedCount++;
    }

    await batch.commit();
  }

  return deletedCount;
}
