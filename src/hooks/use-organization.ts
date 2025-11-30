// src/hooks/use-organization.ts

'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Organization, OrganizationMember, UserProfile, OrganizationRole } from '@/lib/data';

// El teu UID - només tu pots crear organitzacions
const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';

interface UseOrganizationResult {
  organization: Organization | null;
  organizationId: string | null;
  userProfile: UserProfile | null;
  userRole: OrganizationRole | null;
  isLoading: boolean;
  error: Error | null;
  isSuperAdmin: boolean;
}

/**
 * Hook principal per gestionar l'organització de l'usuari actual.
 */
export function useOrganization(): UseOrganizationResult {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;
  
  useEffect(() => {
    const loadOrCreateOrganization = async () => {
      if (isUserLoading) {
        setIsLoading(true);
        return;
      }

      if (!user) {
        setIsLoading(false);
        setOrganization(null);
        setUserProfile(null);
        return;
      }
      
      setIsLoading(true);
      setError(null);

      try {
        const userProfileRef = doc(firestore, 'users', user.uid);
        let userProfileSnap = await getDoc(userProfileRef);
        let profileData = userProfileSnap.data() as UserProfile | undefined;

        if (!userProfileSnap.exists()) {
          if (isSuperAdmin) {
            const { newOrg, newProfile } = await createNewOrganization();
            setOrganization(newOrg);
            setUserProfile(newProfile);
          } else {
            throw new Error('No tens cap organització assignada. Contacta amb l\'administrador.');
          }
        } else if (profileData?.organizationId) {
          const orgRef = doc(firestore, 'organizations', profileData.organizationId);
          const orgSnap = await getDoc(orgRef);

          if (orgSnap.exists()) {
            setOrganization({ id: orgSnap.id, ...(orgSnap.data() as Omit<Organization, 'id'>) });
            setUserProfile(profileData);
          } else {
            throw new Error(`L'organització amb ID ${profileData.organizationId} no s'ha trobat.`);
          }
        } else {
          throw new Error('El teu perfil d\'usuari no està assignat a cap organització.');
        }

      } catch (err) {
        console.error('❌ Error carregant o creant l\'organització:', err);
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
    
    const createNewOrganization = async () => {
        if (!user) throw new Error("Usuari no trobat en crear organització");

        const now = new Date().toISOString();
        const slug = `org-${Date.now()}`;
        const userDisplayName = user.displayName || user.email?.split('@')[0] || 'Super Admin';

        const newOrgData: Omit<Organization, 'id'> = {
            slug: slug,
            name: `Org. de ${userDisplayName}`,
            taxId: '',
            createdAt: now,
        };
        const orgDocRef = await addDoc(collection(firestore, 'organizations'), newOrgData);
        
        const memberData: OrganizationMember = {
            userId: user.uid,
            email: user.email || '',
            displayName: userDisplayName,
            role: 'admin',
            joinedAt: now,
        };
        await setDoc(doc(firestore, 'organizations', orgDocRef.id, 'members', user.uid), memberData);

        const newUserProfile: UserProfile = {
            organizationId: orgDocRef.id,
            role: 'admin',
            displayName: userDisplayName,
        };
        await setDoc(doc(firestore, 'users', user.uid), newUserProfile, { merge: true });

        toast({
            title: 'Benvingut a Summa Social!',
            description: 'Hem creat la teva organització. Pots personalitzar-la a Configuració.',
        });
        
        return { 
          newOrg: { id: orgDocRef.id, ...newOrgData }, 
          newProfile: newUserProfile 
        };
    };


    loadOrCreateOrganization();
  }, [user, isUserLoading, firestore, isSuperAdmin, toast]);

  return {
    organization,
    organizationId: organization?.id || null,
    userProfile,
    userRole: userProfile?.role || null,
    isLoading,
    error,
    isSuperAdmin,
  };
}
