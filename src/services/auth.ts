
'use server';

import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword as firebaseSignIn } from 'firebase/auth';
import { cookies } from 'next/headers';
import { getFirebaseAuth } from 'next-firebase-auth-edge';

const {createSessionCookie, verifySessionCookie} = getFirebaseAuth({
    apiKey: "AIzaSyAi_dEPmqHpbEdZH04pCnRRS85AlJ9Pe5g",
    cookieName: 'auth-token',
    cookieSignatureKeys: ['secret-key-1', 'secret-key-2'],
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: {},
});


export async function signInWithEmailAndPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  try {
    const userCredential = await firebaseSignIn(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const session = await createSessionCookie(idToken, {});

    cookies().set('auth-token', session, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 24 * 1000, // 12 days in milliseconds
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function signOut() {
    cookies().delete('auth-token');
}

export async function getSession() {
  const cookie = cookies().get('auth-token');
  if (cookie) {
    try {
      const claims = await verifySessionCookie(cookie.value);
      return claims;
    } catch (error) {
      return null;
    }
  }
  return null;
}
