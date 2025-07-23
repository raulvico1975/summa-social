
import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

const serviceAccountString = process.env.FIREBASE_ADMIN_SDK_CONFIG;

if (!serviceAccountString) {
    throw new Error('The FIREBASE_ADMIN_SDK_CONFIG environment variable is not set. Please refer to the documentation to set it up.');
}

let serviceAccount: ServiceAccount;
try {
    serviceAccount = JSON.parse(serviceAccountString);
} catch (error) {
    throw new Error('Failed to parse FIREBASE_ADMIN_SDK_CONFIG. Make sure it is a valid JSON string.');
}


if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.