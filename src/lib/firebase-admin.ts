import admin from 'firebase-admin';

const PROJECT_ID = 'summa-social';

// This service account is automatically provided by Firebase App Hosting.
// It allows the admin SDK to authenticate and act on behalf of the project.
// No manual configuration or environment variables are needed in this environment.

if (!admin.apps.length) {
  try {
    // In the App Hosting environment, initializeApp() with no arguments
    // automatically uses the service account credentials of the backend.
    admin.initializeApp();
  } catch (e) {
    console.warn("Could not initialize admin SDK automatically, trying with explicit project ID", e);
    // Fallback for local development or other environments
    admin.initializeApp({
      projectId: PROJECT_ID,
    });
  }
}

export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();
