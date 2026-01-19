/**
 * Locks per operacions de remeses
 *
 * Implementa locks amb TTL i heartbeat per evitar:
 * - Processament concurrent del mateix pare
 * - Expiració prematura en operacions llargues
 */

import { Timestamp, type Firestore } from 'firebase-admin/firestore';

// =============================================================================
// CONSTANTS
// =============================================================================

/** TTL del lock en segons (5 minuts) */
export const LOCK_TTL_SECONDS = 300;

/** Interval per renovar el heartbeat del lock (en ms) */
export const HEARTBEAT_INTERVAL_MS = 60_000;

// =============================================================================
// TIPUS
// =============================================================================

export type RemittanceLockOperation =
  | 'remittance_process'
  | 'remittance_undo'
  | 'remittance_repair';

export interface LockState {
  lockRef: FirebaseFirestore.DocumentReference;
  operationId: string;
  heartbeatInterval: NodeJS.Timeout | null;
}

export interface LockError {
  error: string;
  code: string;
}

// =============================================================================
// FUNCIONS
// =============================================================================

/**
 * Adquireix un lock amb heartbeat automàtic
 *
 * @param db - Firestore instance (Admin SDK)
 * @param orgId - ID de l'organització
 * @param parentTxId - ID de la transacció pare (clau del lock)
 * @param uid - UID de l'usuari que adquireix el lock
 * @param operation - Tipus d'operació
 * @returns LockState si s'ha adquirit, LockError si no
 */
export async function acquireLockWithHeartbeat(
  db: Firestore,
  orgId: string,
  parentTxId: string,
  uid: string,
  operation: RemittanceLockOperation
): Promise<LockState | LockError> {
  const lockRef = db.doc(`organizations/${orgId}/processLocks/${parentTxId}`);
  const operationId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  try {
    const acquired = await db.runTransaction(async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      const now = Timestamp.now();

      if (lockDoc.exists) {
        const lockData = lockDoc.data();
        // Comprovar si el lock NO ha expirat
        if (lockData?.expiresAt && lockData.expiresAt.toMillis() > now.toMillis()) {
          return {
            ok: false as const,
            lockedByUid: lockData.lockedByUid as string,
          };
        }
      }

      // Crear lock amb TTL de 5 minuts
      const expiresAt = Timestamp.fromMillis(now.toMillis() + LOCK_TTL_SECONDS * 1000);
      transaction.set(lockRef, {
        lockedAt: now,
        expiresAt,
        lockedByUid: uid,
        operation,
        operationId,
      });

      return { ok: true as const };
    });

    if (!acquired.ok) {
      return {
        error: `Operació bloquejada per un altre usuari (${acquired.lockedByUid})`,
        code: 'LOCKED_BY_OTHER',
      };
    }

    // Iniciar heartbeat per renovar el lock cada minut
    const heartbeatInterval = setInterval(async () => {
      try {
        const newExpiry = Timestamp.fromMillis(Date.now() + LOCK_TTL_SECONDS * 1000);
        await lockRef.update({ expiresAt: newExpiry });
      } catch (e) {
        console.warn('[locks] Heartbeat failed:', e);
      }
    }, HEARTBEAT_INTERVAL_MS);

    return { lockRef, operationId, heartbeatInterval };
  } catch (error) {
    console.error('[locks] Error acquiring lock:', error);
    return { error: 'Error adquirint lock', code: 'LOCK_ERROR' };
  }
}

/**
 * Allibera un lock i atura el heartbeat
 *
 * IMPORTANT: Cridar sempre dins un bloc finally
 */
export async function releaseLock(lockState: LockState): Promise<void> {
  if (lockState.heartbeatInterval) {
    clearInterval(lockState.heartbeatInterval);
  }
  try {
    await lockState.lockRef.delete();
  } catch (error) {
    // No bloquejar si falla l'alliberament - el TTL ho netejarà
    console.warn('[locks] Error releasing lock:', error);
  }
}

/**
 * Type guard per comprovar si és un LockError
 */
export function isLockError(result: LockState | LockError): result is LockError {
  return 'error' in result;
}
