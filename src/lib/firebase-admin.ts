// src/lib/firebase-admin.ts
import admin from 'firebase-admin';

/**
 * Funció per obtenir els serveis de Firebase Admin (Auth i Firestore).
 * Aquest patró de "lazy initialization" assegura que només inicialitzem
 * l'SDK d'administració una única vegada de manera segura.
 */
function getAdminServices() {
  // Comprova si l'app ja està inicialitzada per evitar errors.
  if (!admin.apps.length) {
    try {
      // Confia en les credencials proporcionades per l'entorn d'execució.
      // Aquesta és la manera estàndard i recomanada per a Firebase App Hosting.
      admin.initializeApp();
    } catch (error: any) {
      // Si la inicialització falla, és un problema greu de configuració de l'entorn.
      console.error("FIREBASE_ADMIN_INIT_ERROR:", error);
      throw new Error(
        `Error crític: La inicialització de l'Admin SDK ha fallat. Missatge: ${error.message}`
      );
    }
  }

  // Retorna les instàncies dels serveis. Ara és segur cridar-les.
  return {
    authAdmin: admin.auth(),
    firestoreAdmin: admin.firestore(),
  };
}

// Exporta les funcions que retornen els serveis ja inicialitzats.
// Això assegura que el codi que les utilitza sempre obté una instància vàlida.
export const { authAdmin, firestoreAdmin } = getAdminServices();
