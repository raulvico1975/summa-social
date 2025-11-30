'use client';

import { useState, useEffect, createContext, useContext, useMemo } from 'react';
import { useUser as useFirebaseUser } from '@/firebase';
import { useCurrentOrganization } from './organization-provider';
import type { UserProfile } from '@/lib/data';

interface User {
  uid: string;
  name: string | null;
  email: string | null;
  picture?: string | null;
  email_verified?: boolean;
  isAnonymous: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: firebaseUser, isUserLoading: isFirebaseUserLoading } = useFirebaseUser();
  // IMPORTANT: We get the whole organization context now
  const orgContext = useCurrentOrganization();
  const { userProfile, isLoading: isOrgLoading } = orgContext;

  const isLoading = isFirebaseUserLoading || isOrgLoading;

  const user = useMemo<User | null>(() => {
    if (isLoading || !firebaseUser) {
      return null;
    }

    // The user's profile name from the database is the source of truth.
    const displayName = userProfile?.displayName || firebaseUser.displayName || 'Usuari';
    
    return {
      uid: firebaseUser.uid,
      name: displayName,
      email: firebaseUser.email,
      picture: firebaseUser.photoURL,
      email_verified: firebaseUser.emailVerified,
      isAnonymous: firebaseUser.isAnonymous,
    };
  }, [firebaseUser, userProfile, isLoading]);


  return (
    <AuthContext.Provider value={{ user, loading: isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
