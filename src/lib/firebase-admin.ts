
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

const serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

if (!serviceAccountString && process.env.NODE_ENV !== 'development') {
    console.warn('The FIREBASE_ADMIN_SDK_CONFIG environment variable is not set. Authentication will not work on the server. Please refer to the documentation to set it up.');
}

let serviceAccount: ServiceAccount | undefined;
if (serviceAccountString) {
    try {
        serviceAccount = JSON.parse(serviceAccountString);
    } catch (error) {
        console.error('Failed to parse FIREBASE_ADMIN_SDK_CONFIG. Make sure it is a valid JSON string.');
    }
}

// Define the configuration object
const firebaseAdminConfig = {
    // If a service account is available, use it for credentials.
    ...(serviceAccount && { credential: admin.credential.cert(serviceAccount) }),
    // Explicitly set the projectId to ensure alignment with the client.
    projectId: 'summa-social',
};


if (!admin.apps.length) {
    // Initialize with the unified configuration object.
    admin.initializeApp(firebaseAdminConfig);
}

export const authAdmin = admin.auth();
export const firestoreAdmin = admin.firestore();
