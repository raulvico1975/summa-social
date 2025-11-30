import 'dotenv/config';
import admin from 'firebase-admin';

const PROJECT_ID = 'summa-social';

/**
 * Funció per inicialitzar de manera segura l'SDK d'administració de Firebase.
 * Comprova si ja hi ha una aplicació inicialitzada per evitar errors.
 * Si no n'hi ha, intenta la inicialització automàtica (per a producció)
 * i fa un fallback a la manual (per a local).
 */
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    // Aquest mètode funciona bé en producció a Firebase App Hosting
    console.log("Intentant inicialització automàtica de l'Admin SDK...");
    return admin.initializeApp();
  } catch (error: any) {
    console.warn(
      'La inicialització automàtica ha fallat. Intentant inicialització manual (esperat en local).',
      error.message
    );
    try {
      // Aquest mètode és el fallback per a entorns locals
      return admin.initializeApp({
        projectId: PROJECT_ID,
      });
    } catch (manualError: any) {
      throw new Error(
        `Error crític: No s'ha pogut inicialitzar l'Admin SDK ni automàticament ni manualment. Missatge: ${manualError.message}`
      );
    }
  }
}

// Inicialitzem l'aplicació una sola vegada en carregar el mòdul.
const adminApp = initializeAdminApp();

// Exportem instàncies dels serveis ja inicialitzats.
export const authAdmin = admin.auth(adminApp);
export const firestoreAdmin = admin.firestore(adminApp);
