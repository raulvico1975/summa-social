import admin from 'firebase-admin';
import { firebaseConfig } from '@/firebase/config';

// Aquest patró assegura que només inicialitzem l'app una vegada.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      // Utilitzem la configuració del client explícitament.
      // En entorns de servidor segurs com aquest, és una estratègia vàlida
      // quan la detecció automàtica de credencials falla.
      credential: admin.credential.applicationDefault(),
      databaseURL: `https://${firebaseConfig.projectId}.firebaseio.com`,
      projectId: firebaseConfig.projectId,
    });
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();
