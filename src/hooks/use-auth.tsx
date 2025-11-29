

'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser as useFirebaseUser } from '@/firebase'; // Using the new hook
import type { User as FirebaseUser } from 'firebase/auth';

interface User {
  uid: string;
  name?: string | null;
  email?: string | null;
  picture?: string | null;
  email_verified?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
});

const MOCK_USER_ID_FOR_DEV = 'dev-nuria-id';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user: firebaseUser, isUserLoading } = useFirebaseUser();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isUserLoading) {
      if (firebaseUser) {
        // If a real user is logged in, use their data
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName,
          email: firebaseUser.email,
          picture: firebaseUser.photoURL,
          email_verified: firebaseUser.emailVerified,
        });
      } else {
        // For development, we use a consistent mock user ID to ensure
        // Firestore data is always written to the same path (`users/dev-nuria-id/...`)
        // This simulates a single, consistent user across reloads.
        setUser({
          uid: MOCK_USER_ID_FOR_DEV,
          name: 'Nuria (Dev)',
          email: 'nuria@example.dev',
        });
      }
    }
  }, [firebaseUser, isUserLoading]);

  return (
    <AuthContext.Provider value={{ user, loading: isUserLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
