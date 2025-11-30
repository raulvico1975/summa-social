import 'dotenv/config';
import admin from 'firebase-admin';

/**
 * Funció per inicialitzar de manera segura l'SDK d'administració de Firebase.
 * Comprova si ja hi ha una aplicació inicialitzada per evitar errors.
 * Si no n'hi ha, intenta la inicialització automàtica, que és el mètode
 * recomanat per a entorns com Firebase App Hosting.
 */
function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    // Aquest mètode funciona bé en producció a Firebase App Hosting
    // i en entorns que tenen les credencials configurades a nivell de sistema.
    console.log("Intentant inicialització automàtica de l'Admin SDK...");
    return admin.initializeApp();
  } catch (error: any) {
      // Si la inicialització automàtica falla, és un error crític de configuració
      // de l'entorn que no podem resoldre amb un fallback.
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
