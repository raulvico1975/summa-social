'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser as useFirebaseUser } from '@/firebase';

interface User {
  uid: string;
  name?: string | null;
  email?: string | null;
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
  const { user: firebaseUser, isUserLoading } = useFirebaseUser();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isUserLoading) {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || 'Usuari Anònim',
          email: firebaseUser.email,
          picture: firebaseUser.photoURL,
          email_verified: firebaseUser.emailVerified,
          isAnonymous: firebaseUser.isAnonymous,
        });
      } else {
        // If no firebase user, our user is also null
        setUser(null);
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
