'use server';

import { cookies } from 'next/headers';
import { authAdmin } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

const SESSION_COOKIE_NAME = 'auth-token';
const SESSION_DURATION_DAYS = 12;
const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;

export async function createSession(idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const decodedIdToken = await authAdmin.verifyIdToken(idToken);
        
        // Session cookie will be valid for 12 days.
        const expiresIn = SESSION_MAX_AGE_SECONDS * 1000;
        const sessionCookie = await authAdmin.createSessionCookie(idToken, { expiresIn });
        
        cookies().set(SESSION_COOKIE_NAME, sessionCookie, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_MAX_AGE_SECONDS,
        });

        return { success: true };
    } catch (error: any) {
        console.error("Session creation failed:", error);
        return { success: false, error: 'Failed to create session. Please try again.' };
    }
}

export async function signOut() {
    cookies().delete(SESSION_COOKIE_NAME);
}

export async function verifySessionCookie(sessionCookie: string): Promise<DecodedIdToken | null> {
    try {
        const decodedClaims = await authAdmin.verifySessionCookie(sessionCookie, true /** checkRevoked */);
        return decodedClaims;
    } catch (error) {
        return null;
    }
}

export async function getSession(): Promise<DecodedIdToken | null> {
  const cookie = cookies().get(SESSION_COOKIE_NAME);
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
