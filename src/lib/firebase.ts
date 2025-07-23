
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  projectId: "summa-social",
  appId: "1:469685881071:web:97483f2003df7c2407731a",
  storageBucket: "summa-social.firebasestorage.app",
  apiKey: "AIzaSyAi_dEPmqHpbEdZH04pCnRRS85AlJ9Pe5g",
  authDomain: "summa-social.firebaseapp.com",
  messagingSenderId: "469685881071",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
