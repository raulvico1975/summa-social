/**
 * Guard únic per verificar SuperAdmin
 *
 * Llegeix NOMÉS el doc systemSuperAdmins/{uid}.
 * No depèn de cap altra peça del sistema.
 */

import { doc, getDoc, type Firestore } from 'firebase/firestore';

/**
 * Comprova si un UID és SuperAdmin
 *
 * @param firestore - Instància de Firestore
 * @param uid - UID de l'usuari a verificar
 * @returns true si és SuperAdmin, false en qualsevol altre cas
 */
export async function checkIsSuperAdmin(
  firestore: Firestore,
  uid: string | null | undefined
): Promise<boolean> {
  if (!uid) return false;

  try {
    const superAdminRef = doc(firestore, 'systemSuperAdmins', uid);
    const superAdminDoc = await getDoc(superAdminRef);
    return superAdminDoc.exists();
  } catch (error) {
    // Qualsevol error (permisos, xarxa, etc.) → no és superadmin
    console.warn('[is-superadmin] Error verificant:', error);
    return false;
  }
}
