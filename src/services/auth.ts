'use server';

import { cookies } from 'next/headers';
import { authAdmin, firestoreAdmin } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { Organization, OrganizationMember, UserProfile } from '@/lib/data';

const SESSION_COOKIE_NAME = 'auth-token';
const SESSION_DURATION_DAYS = 12;
const SESSION_MAX_AGE_SECONDS = SESSION_DURATION_DAYS * 24 * 60 * 60;

// El teu UID - només tu pots crear organitzacions
const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';

export async function ensureUserHasOrganization(idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
        const decodedToken = await authAdmin.verifyIdToken(idToken);
        const { uid, email, name: firebaseName } = decodedToken;
        
        const userProfileRef = firestoreAdmin.collection('users').doc(uid);
        const userProfileSnap = await userProfileRef.get();

        if (!userProfileSnap.exists) {
            if (uid === SUPER_ADMIN_UID) {
                // User is Super Admin and has no org, create one
                const now = new Date();
                const userName = firebaseName || email?.split('@')[0] || `user_${uid.substring(0, 5)}`;
                
                const newOrgData: Omit<Organization, 'id'> = {
                    slug: `org-${now.getTime()}`,
                    name: `Org. de ${userName}`,
                    taxId: '',
                    createdAt: now.toISOString(),
                };
                const orgDocRef = await firestoreAdmin.collection('organizations').add(newOrgData);

                const memberData: OrganizationMember = {
                    userId: uid,
                    email: email || '',
                    displayName: userName,
                    role: 'admin',
                    joinedAt: now.toISOString(),
                };
                await firestoreAdmin.collection('organizations').doc(orgDocRef.id).collection('members').doc(uid).set(memberData);

                const newUserProfile: UserProfile = {
                    organizationId: orgDocRef.id,
                    role: 'admin',
                    displayName: userName,
                };
                await userProfileRef.set(newUserProfile, { merge: true });

            } else {
                throw new Error("No tens cap organització assignada. Contacta amb l'administrador.");
            }
        }
        
        // At this point, user profile is guaranteed to exist. Now create the session.
        return await createSession(idToken);

    } catch (error: any) {
        console.error("Error in ensureUserHasOrganization:", error);
        return { success: false, error: error.message || 'Server error during organization check.' };
    }
}


export async function createSession(idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
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
