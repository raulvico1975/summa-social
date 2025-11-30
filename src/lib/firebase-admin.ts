import 'dotenv/config'; // Carrega les variables d'entorn des de .env
import admin from 'firebase-admin';

const PROJECT_ID = 'summa-social';

if (!admin.apps.length) {
  try {
    // Aquest mètode funciona bé en producció a Firebase App Hosting
    console.log("Intentant inicialització automàtica de l'Admin SDK...");
    admin.initializeApp();
    console.log("Inicialització automàtica de l'Admin SDK amb èxit.");
  } catch (error) {
    console.warn("La inicialització automàtica ha fallat. Aquest error és esperable en entorns locals. Intentant inicialització manual...", error);
    
    try {
      // Aquest mètode és el fallback per a entorns locals, utilitzant GOOGLE_APPLICATION_CREDENTIALS
      admin.initializeApp({
        projectId: PROJECT_ID,
      });
      console.log("Inicialització manual de l'Admin SDK amb èxit (local).");
    } catch (manualError) {
       console.error("Error crític: No s'ha pogut inicialitzar l'Admin SDK ni automàticament ni manualment.", manualError);
       // En un cas real, aquí podries llançar un error per aturar l'arrencada del servidor si és necessari.
    }
  }
}

export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();
