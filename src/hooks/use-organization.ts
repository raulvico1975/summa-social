// src/hooks/use-organization.ts

'use client';

import { useEffect, useState } from 'react';
import { 
  doc, 
  getDoc,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Organization, UserProfile, OrganizationRole } from '@/lib/data';
import type { User } from 'firebase/auth';

interface UseOrganizationResult {
  firebaseUser: User | null;
  organization: Organization | null;
  organizationId: string | null;
  userProfile: UserProfile | null;
  userRole: OrganizationRole | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to load the organization for the current user.
 * It assumes the user and organization have been created on login.
 */
export function useOrganization(): UseOrganizationResult {
  const { firestore, user: firebaseUser, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const loadOrganization = async () => {
      if (isUserLoading) {
        return;
      }

      if (!firebaseUser) {
        setIsLoading(false);
        setOrganization(null);
        setUserProfile(null);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const userProfileRef = doc(firestore, 'users', firebaseUser.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data() as UserProfile;
          setUserProfile(profileData);

          const orgRef = doc(firestore, 'organizations', profileData.organizationId);
          const orgSnap = await getDoc(orgRef);

          if (orgSnap.exists()) {
            setOrganization({ id: orgSnap.id, ...(orgSnap.data() as Omit<Organization, 'id'>) });
          } else {
            throw new Error(`L'organització amb ID ${profileData.organizationId} no s'ha trobat.`);
          }
        } else {
          // This should not happen if the login flow works correctly
          throw new Error('El teu perfil d\'usuari no existeix. Torna a iniciar sessió.');
        }

      } catch (err) {
        console.error('❌ Error carregant l\'organització:', err);
        const anError = err instanceof Error ? err : new Error('Error desconegut durant la càrrega.');
        setError(anError);
        toast({
          variant: 'destructive',
          title: 'Error d\'accés',
          description: anError.message,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadOrganization();
  }, [firebaseUser, isUserLoading, firestore, toast]);

  return {
    firebaseUser,
    organization,
    organizationId: organization?.id || null,
    userProfile,
    userRole: userProfile?.role || null,
    isLoading,
    error,
  };
}
