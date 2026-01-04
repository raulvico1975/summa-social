/**
 * Helper server-side per a gestió de BackupIntegration
 *
 * Ús exclusiu en API routes o funcions server-side.
 * Requereix Firebase Admin SDK inicialitzat.
 */

import type { Firestore } from 'firebase-admin/firestore';
import {
  type BackupIntegration,
  INITIAL_BACKUP_INTEGRATION,
} from './types';

/**
 * Obté o inicialitza el document d'integració de backup per a una organització.
 *
 * Si el document no existeix, el crea amb l'estat inicial (disconnected).
 * Garanteix que el document sempre existeix amb l'estructura correcta.
 *
 * @param db - Instància de Firestore Admin
 * @param orgId - ID de l'organització
 * @returns BackupIntegration
 */
export async function getOrInitBackupIntegration(
  db: Firestore,
  orgId: string
): Promise<BackupIntegration> {
  const docRef = db.doc(`organizations/${orgId}/integrations/backup`);
  const snap = await docRef.get();

  if (snap.exists) {
    return snap.data() as BackupIntegration;
  }

  // Crear document amb estat inicial
  await docRef.set(INITIAL_BACKUP_INTEGRATION);

  return INITIAL_BACKUP_INTEGRATION;
}

/**
 * Actualitza el document d'integració de backup.
 *
 * @param db - Instància de Firestore Admin
 * @param orgId - ID de l'organització
 * @param data - Camps a actualitzar (partial)
 */
export async function updateBackupIntegration(
  db: Firestore,
  orgId: string,
  data: Partial<BackupIntegration>
): Promise<void> {
  const docRef = db.doc(`organizations/${orgId}/integrations/backup`);
  await docRef.update(data);
}
