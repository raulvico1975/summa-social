
'use client';

import { useState, useEffect, createContext, useContext } from 'react';

interface User {
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

// Mock user for development when login is disabled
const MOCK_USER: User = {
  name: 'Usuario de Desarrollo',
  email: 'dev@example.com',
  picture: null,
  email_verified: true,
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // We provide a mock user directly to bypass the real authentication flow.
  const [user] = useState<User | null>(MOCK_USER);
  const [loading] = useState(false); // Set loading to false as we are not fetching anything.

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
