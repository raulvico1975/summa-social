'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { useUser as useFirebaseUser } from '@/firebase';
import { useCurrentOrganization } from './organization-provider';

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
  const { userProfile, isLoading: isOrgLoading } = useCurrentOrganization();
  
  const [user, setUser] = useState<User | null>(null);

  const isLoading = isFirebaseUserLoading || isOrgLoading;

  useEffect(() => {
    // Aquesta funció s'executarà cada cop que firebaseUser, userProfile o isLoading canviïn.
    if (isLoading) {
      setUser(null); // Mentre carrega, no tenim usuari.
      return;
    }

    if (firebaseUser) {
      // Un cop les dades han carregat, construïm l'objecte usuari definitiu.
      // El nom del perfil té prioritat.
      const displayName = userProfile?.displayName || firebaseUser.displayName || 'Usuari';
      
      setUser({
        uid: firebaseUser.uid,
        name: displayName,
        email: firebaseUser.email,
        picture: firebaseUser.photoURL,
        email_verified: firebaseUser.emailVerified,
        isAnonymous: firebaseUser.isAnonymous,
      });
    } else {
      // Si no hi ha usuari de Firebase, no hi ha usuari a l'app.
      setUser(null);
    }
  }, [firebaseUser, userProfile, isLoading]);

  return (
    <AuthContext.Provider value={{ user, loading: isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
