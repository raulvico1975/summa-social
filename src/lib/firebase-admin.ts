
import admin from 'firebase-admin';

// This service account is automatically provided by Firebase App Hosting.
// It allows the admin SDK to authenticate and act on behalf of the project.
// No manual configuration or environment variables are needed in this environment.

if (!admin.apps.length) {
    // In the App Hosting environment, initializeApp() with no arguments
    // automatically uses the service account credentials of the backend.
    admin.initializeApp();
}

export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();
