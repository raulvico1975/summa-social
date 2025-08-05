
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAi_dEPmqHpbEdZH04pCnRRS85AlJ9Pe5g",
  authDomain: "summa-social.firebaseapp.com",
  projectId: "summa-social",
  storageBucket: "summa-social.appspot.com",
  messagingSenderId: "469685881071",
  appId: "1:469685881071:web:97483f2003df7c2407731a"
};


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const storage = getStorage(app);

export { app, auth, storage };
