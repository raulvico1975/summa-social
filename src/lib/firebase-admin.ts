import admin from 'firebase-admin';
import 'dotenv/config';

/**
 * Funció per inicialitzar de manera segura l'SDK d'administració de Firebase.
 * Comprova si ja hi ha una aplicació inicialitzada per evitar errors.
 */
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }
  
  try {
    // La configuració amb variables d'entorn (GOOGLE_APPLICATION_CREDENTIALS)
    // és la forma estàndard per a entorns de servidor com Firebase App Hosting.
    return admin.initializeApp();
  } catch (error: any) {
    console.error("FIREBASE_ADMIN_INIT_ERROR:", error);
    throw new Error(
      `Error crític: La inicialització automàtica de l'Admin SDK ha fallat. Assegura't que les credencials estan ben configurades a l'entorn. Missatge: ${error.message}`
    );
  }
}

// Inicialitzem l'aplicació una sola vegada en carregar el mòdul.
const adminApp = initializeAdminApp();

// Exportem instàncies dels serveis ja inicialitzats.
export const authAdmin = admin.auth(adminApp);
export const firestoreAdmin = admin.firestore(adminApp);
