import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';
import { acquireProcessLock, releaseProcessLock } from '@/lib/fiscal/processLocks';

interface UndoSplitParams {
  firestore: Firestore;
  orgId: string;
  parentTxId: string;
  userId: string;
}

export interface UndoSplitResult {
  success: boolean;
  archivedChildren: number;
  idempotent: boolean;
  error?: string;
}

/**
 * Desfer desglossament d'import:
 * - Arxiva filles derivades (soft-delete)
 * - Restaura el pare (isSplit=false, linkedTransactionIds eliminat)
 * - Idempotent
 * - Atòmic en un únic batch (pare + filles)
 */
export async function undoSplit(params: UndoSplitParams): Promise<UndoSplitResult> {
  const { firestore, orgId, parentTxId, userId } = params;
  const parentRef = doc(firestore, 'organizations', orgId, 'transactions', parentTxId);
  const transactionsRef = collection(firestore, 'organizations', orgId, 'transactions');

  const lock = await acquireProcessLock({
    firestore,
    orgId,
    parentTxId,
    operation: 'undoSplit',
    uid: userId,
  });

  if (!lock.ok) {
    return {
      success: false,
      archivedChildren: 0,
      idempotent: false,
      error:
        lock.reason === 'locked_by_other'
          ? "Aquesta operació s'està processant per un altre usuari."
          : 'No s\'ha pogut adquirir el lock.',
    };
  }

  try {
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) {
      return {
        success: false,
        archivedChildren: 0,
        idempotent: false,
        error: 'Transacció pare no trobada.',
      };
    }

    const parentData = parentSnap.data() as {
      isSplit?: boolean;
      archivedAt?: string | null;
    };

    // Només busquem per parentTransactionId per evitar dependència d'índex compost.
    const childrenSnap = await getDocs(
      query(transactionsRef, where('parentTransactionId', '==', parentTxId))
    );

    const activeChildren = childrenSnap.docs.filter((childDoc) => {
      const childData = childDoc.data() as { archivedAt?: string | null };
      return !childData.archivedAt;
    });

    // Idempotent: pare no marcat com split i cap filla activa.
    if (parentData.isSplit !== true && activeChildren.length === 0) {
      return {
        success: true,
        archivedChildren: 0,
        idempotent: true,
      };
    }

    // Garantim atomicitat amb un únic batch (50 ops màxim).
    if (activeChildren.length > 49) {
      return {
        success: false,
        archivedChildren: 0,
        idempotent: false,
        error: 'Massa línies per desfer en una sola operació atòmica (màxim 49).',
      };
    }

    const now = new Date().toISOString();
    const batch = writeBatch(firestore);

    for (const childDoc of activeChildren) {
      batch.update(childDoc.ref, {
        archivedAt: now,
        archivedByUid: userId,
        archivedReason: 'undo_split',
        archivedFromAction: 'undo_split',
      });
    }

    batch.update(parentRef, {
      isSplit: false,
      linkedTransactionIds: deleteField(),
    });

    await batch.commit();

    return {
      success: true,
      archivedChildren: activeChildren.length,
      idempotent: activeChildren.length === 0,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error desconegut';
    return {
      success: false,
      archivedChildren: 0,
      idempotent: false,
      error: message,
    };
  } finally {
    await releaseProcessLock({ firestore, orgId, parentTxId });
  }
}
