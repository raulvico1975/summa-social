/**
 * Autoalineació del registre SuperAdmin
 *
 * Quan un usuari allowlisted entra a /admin, aquest helper assegura
 * que existeix el document systemSuperAdmins/{uid} a Firestore.
 *
 * Això permet que:
 * - Si el doc s'ha esborrat accidentalment, es repara sol
 * - Les rules de Firestore sempre tenen el registre correcte
 */

import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

export interface EnsureResult {
  success: boolean;
  existed: boolean;
  error?: string;
}

/**
 * Assegura que existeix el document systemSuperAdmins/{uid}
 *
 * @param firestore - Instància de Firestore
 * @param uid - UID de l'usuari
 * @param email - Email de l'usuari (per guardar al doc)
 * @returns Resultat de l'operació
 */
export async function ensureSuperAdminRegistry(
  firestore: Firestore,
  uid: string,
  email: string
): Promise<EnsureResult> {
  try {
    const superAdminRef = doc(firestore, 'systemSuperAdmins', uid);
    const superAdminDoc = await getDoc(superAdminRef);

    if (superAdminDoc.exists()) {
      // Doc ja existeix, no cal fer res
      return { success: true, existed: true };
    }

    // Doc no existeix, crear-lo
    await setDoc(superAdminRef, {
      email: email.toLowerCase().trim(),
      createdAt: new Date().toISOString(),
      createdBy: uid, // self-bootstrap
      autoCreated: true, // marca que s'ha creat automàticament
    });

    console.log('[ensure-superadmin] Doc creat per:', email);
    return { success: true, existed: false };
  } catch (error) {
    console.error('[ensure-superadmin] Error:', error);
    return {
      success: false,
      existed: false,
      error: (error as Error).message,
    };
  }
}
