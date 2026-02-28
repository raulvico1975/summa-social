// src/lib/fiscal/processLocks.ts
// Locks per evitar doble processament concurrent del mateix pare (multiusuari)

import {
  doc,
  runTransaction,
  deleteDoc,
  Timestamp,
  type Firestore,
} from 'firebase/firestore';

// =============================================================================
// TIPUS
// =============================================================================

export type LockOperation =
  | 'returnImport'
  | 'remittanceSplit'
  | 'stripeSplit'
  | 'undoRemittance';

export interface ProcessLock {
  lockedAt: Timestamp;
  expiresAt: Timestamp;
  lockedByUid: string;
  operation: LockOperation;
}

export interface AcquireLockParams {
  firestore: Firestore;
  orgId: string;
  parentTxId: string;
  operation: LockOperation;
  uid: string;
  ttlSeconds?: number;
}

export interface AcquireLockResult {
  ok: boolean;
  reason?: 'locked_by_other' | 'error';
  lockedByUid?: string;
  operation?: LockOperation;
}

export interface ReleaseLockParams {
  firestore: Firestore;
  orgId: string;
  parentTxId: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_TTL_SECONDS = 90;

// =============================================================================
// FUNCIONS
// =============================================================================

/**
 * Helper pur per decidir si un lock continua actiu en un instant donat.
 */
export function isLockActive(expiresAtMillis: number, nowMillis: number): boolean {
  return expiresAtMillis > nowMillis;
}

/**
 * Helper pur per construir el resultat de conflicte de lock.
 */
export function buildLockConflictResult(
  lockedByUid: string,
  operation: LockOperation
): AcquireLockResult {
  return {
    ok: false,
    reason: 'locked_by_other',
    lockedByUid,
    operation,
  };
}

/**
 * Adquireix un lock atòmic per processar una transacció pare.
 *
 * Usa runTransaction() per garantir atomicitat:
 * - Si el lock existeix i NO ha expirat → retorna ok=false
 * - Si el lock no existeix o ha expirat → crea lock nou i retorna ok=true
 *
 * @returns { ok: true } si s'ha adquirit el lock
 * @returns { ok: false, reason: 'locked_by_other', lockedByUid, operation } si ja està bloquejat
 */
export async function acquireProcessLock(
  params: AcquireLockParams
): Promise<AcquireLockResult> {
  const {
    firestore,
    orgId,
    parentTxId,
    operation,
    uid,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  } = params;

  const lockRef = doc(
    firestore,
    'organizations',
    orgId,
    'processLocks',
    parentTxId
  );

  try {
    const result = await runTransaction(firestore, async (transaction) => {
      const lockDoc = await transaction.get(lockRef);
      const now = Timestamp.now();

      if (lockDoc.exists()) {
        const lockData = lockDoc.data() as ProcessLock;

        // Comprovar si el lock ha expirat
        if (isLockActive(lockData.expiresAt.toMillis(), now.toMillis())) {
          // Lock actiu - no podem adquirir
          return buildLockConflictResult(lockData.lockedByUid, lockData.operation);
        }
        // Lock expirat - podem sobreescriure
      }

      // Crear o sobreescriure lock
      const expiresAt = Timestamp.fromMillis(
        now.toMillis() + ttlSeconds * 1000
      );

      const newLock: ProcessLock = {
        lockedAt: now,
        expiresAt,
        lockedByUid: uid,
        operation,
      };

      transaction.set(lockRef, newLock);

      return { ok: true as const };
    });

    return result;
  } catch (error) {
    console.error('[acquireProcessLock] Error:', error);
    return { ok: false, reason: 'error' };
  }
}

/**
 * Allibera un lock.
 *
 * IMPORTANT: Cridar SEMPRE dins un bloc finally per garantir
 * que el lock s'allibera encara que hi hagi errors.
 *
 * @example
 * const lock = await acquireProcessLock({ ... });
 * if (!lock.ok) return;
 * try {
 *   // processar...
 * } finally {
 *   await releaseProcessLock({ ... });
 * }
 */
export async function releaseProcessLock(
  params: ReleaseLockParams
): Promise<void> {
  const { firestore, orgId, parentTxId } = params;

  const lockRef = doc(
    firestore,
    'organizations',
    orgId,
    'processLocks',
    parentTxId
  );

  try {
    await deleteDoc(lockRef);
  } catch (error) {
    // No bloquejar si falla l'alliberament - el TTL ho netejarà
    console.error('[releaseProcessLock] Error releasing lock:', error);
  }
}

/**
 * Helper per crear el missatge de toast quan un lock falla
 */
export function getLockFailureMessage(
  result: AcquireLockResult,
  t?: { lockedByOther?: string; processingError?: string }
): string {
  if (result.reason === 'locked_by_other') {
    return (
      t?.lockedByOther ||
      "Aquesta operació s'està processant per un altre usuari. Espera uns segons i torna-ho a intentar."
    );
  }
  return t?.processingError || 'Error iniciant el processament. Torna-ho a intentar.';
}
