/**
 * Firebase Config
 *
 * Llegeix TOTES les credencials de variables d'entorn.
 * - Prod: definides a .env.local
 * - Demo: definides a .env.demo (carregat via scripts/run-demo-dev.mjs)
 *
 * En mode DEMO, si falta qualsevol camp crític → error i s'atura.
 * En altres modes, validació menys estricta per compatibilitat.
 */

const isDemoEnv = process.env.APP_ENV === 'demo';

// Camps requerits
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

// Validació estricta en mode DEMO
if (isDemoEnv) {
  const missing: string[] = [];
  if (!apiKey) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!authDomain) missing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!projectId) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!storageBucket) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!messagingSenderId) missing.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!appId) missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');

  if (missing.length > 0) {
    throw new Error(
      `[DEMO] Variables Firebase requerides no definides: ${missing.join(', ')}\n` +
      'Revisa .env.demo i assegura que totes les credencials del projecte demo estan configurades.'
    );
  }
}

// Validació normal (prod) - requerim com a mínim projectId i apiKey
if (!isDemoEnv && (!projectId || !apiKey)) {
  throw new Error(
    'Variables Firebase requerides no definides: NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_API_KEY\n' +
    'Revisa .env.local i assegura que les credencials estan configurades.'
  );
}

export const firebaseConfig = {
  projectId: projectId!,
  appId: appId || '',
  apiKey: apiKey!,
  authDomain: authDomain || `${projectId}.firebaseapp.com`,
  storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
  messagingSenderId: messagingSenderId || '',
};
