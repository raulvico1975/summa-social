'use client';

const firebaseConfig = {
  projectId: "summa-social",
  appId: "1:469685881071:web:97483f2003df7c2407731a",
  apiKey: "AIzaSyAi_dEPmqHpbEdZH04pCnRRS85AlJ9Pe5g",
  authDomain: "summa-social.firebaseapp.com",
  storageBucket: "summa-social.firebasestorage.app",
  messagingSenderId: "469685881071"
};
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';


export function initializeFirebase() {
  if (!getApps().length) {
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }
  return getSdks(getApp());
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp),
    storage: getStorage(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';