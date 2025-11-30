'use server';

// This file is kept for future use if server-side session management is needed again.
// For now, all authentication logic is handled on the client.
// The functions here are no longer called by the application.

import { cookies } from 'next/headers';
import { authAdmin } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

const SESSION_COOKIE_NAME = 'auth-token';

export async function signOut() {
    cookies().delete(SESSION_COOKIE_NAME);
}

export async function getSession(): Promise<DecodedIdToken | null> {
  const cookie = cookies().get(SESSION_COOKIE_NAME);
  if (cookie) {
    try {
      const claims = await authAdmin.verifySessionCookie(cookie.value, true);
      return claims;
    } catch (error) {
      return null;
    }
  }
  return null;
}
