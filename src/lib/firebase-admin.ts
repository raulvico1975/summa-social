
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

const serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

if (!serviceAccountString) {
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

if (!admin.apps.length) {
    admin.initializeApp({
        credential: serviceAccount ? admin.credential.cert(serviceAccount) : undefined,
    });
}

export const authAdmin = admin.auth();
