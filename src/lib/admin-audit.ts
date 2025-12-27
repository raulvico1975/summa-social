/**
 * Audit Log per accions de SuperAdmin
 * Model: /adminAuditLogs/{docId}
 *
 * Només registra accions ja existents:
 * - CREATE_ORG
 * - SUSPEND_ORG
 * - REACTIVATE_ORG
 * - RESET_PASSWORD_SENT
 */

import { collection, addDoc, serverTimestamp, query, orderBy, limit, getDocs, type Firestore } from 'firebase/firestore';

export type AdminAuditAction =
  | 'CREATE_ORG'
  | 'SUSPEND_ORG'
  | 'REACTIVATE_ORG'
  | 'RESET_PASSWORD_SENT';

export interface AdminAuditLog {
  id: string;
  action: AdminAuditAction;
  target?: string;           // orgId, orgSlug o email
  performedBy: string;       // uid
  timestamp: Date;
}

/**
 * Registra una acció de SuperAdmin.
 * Best-effort: no bloqueja la UI si falla.
 */
export async function logAdminAction(
  firestore: Firestore,
  action: AdminAuditAction,
  performedBy: string,
  target?: string
): Promise<void> {
  try {
    await addDoc(collection(firestore, 'adminAuditLogs'), {
      action,
      target: target || null,
      performedBy,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    // Best-effort: log a consola però no bloquejar
    console.error('[AdminAudit] Failed to log action:', action, error);
  }
}

/**
 * Obté els últims N logs d'audit.
 */
export async function getRecentAuditLogs(
  firestore: Firestore,
  count: number = 20
): Promise<AdminAuditLog[]> {
  const q = query(
    collection(firestore, 'adminAuditLogs'),
    orderBy('timestamp', 'desc'),
    limit(count)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    action: doc.data().action as AdminAuditAction,
    target: doc.data().target || undefined,
    performedBy: doc.data().performedBy,
    timestamp: doc.data().timestamp?.toDate() || new Date(),
  }));
}

/**
 * Format llegible per a cada acció
 */
export function formatAuditAction(action: AdminAuditAction): string {
  switch (action) {
    case 'CREATE_ORG':
      return 'Org creada';
    case 'SUSPEND_ORG':
      return 'Org suspesa';
    case 'REACTIVATE_ORG':
      return 'Org reactivada';
    case 'RESET_PASSWORD_SENT':
      return 'Reset enviat';
    default:
      return action;
  }
}
