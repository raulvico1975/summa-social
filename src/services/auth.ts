
'use server';

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
    authDomain: "summa-social.firebaseapp.com",
});

export async function createSession(idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const session = await createSessionCookie(idToken, {});
        cookies().set('auth-token', session, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 12 * 60 * 60 * 24, // 12 days
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
