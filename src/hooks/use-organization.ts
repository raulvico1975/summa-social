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
      if (isUserLoading) return;

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
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const profile = userProfileSnap.data() as UserProfile;
          setUserProfile(profile);
          if (profile.organizationId) {
            await loadExistingOrganization(profile.organizationId);
          } else {
            await handleNoOrganization();
          }
        } else {
          await handleNoOrganization();
        }
      } catch (err) {
        console.error('❌ Error carregant organització:', err);
        setError(err instanceof Error ? err : new Error('Error desconegut'));
      } finally {
        setIsLoading(false);
      }
    };

    const loadExistingOrganization = async (orgId: string) => {
      const orgRef = doc(firestore, 'organizations', orgId);
      const orgSnap = await getDoc(orgRef);

      if (orgSnap.exists()) {
        const orgData = orgSnap.data() as Omit<Organization, 'id'>;
        setOrganization({ id: orgSnap.id, ...orgData });
      } else {
        console.error('❌ Organització referenciada no trobada:', orgId);
        setError(new Error('L\'organització assignada no existeix.'));
      }
    };

    const handleNoOrganization = async () => {
      if (isSuperAdmin) {
        await createNewOrganization();
      } else {
        setError(new Error('No tens cap organització assignada.'));
        toast({
          variant: 'destructive',
          title: 'Sense accés',
          description: 'No tens cap organització assignada. Contacta amb l\'administrador.',
        });
      }
    };

    const createNewOrganization = async () => {
      if (!user) return;

      const now = new Date().toISOString();
      const slug = `org-${Date.now()}`;
      // CANVI CLAU: Assegurar un nom per defecte si no existeix a Firebase Auth
      const userDisplayName = user.displayName || user.email?.split('@')[0] || 'Super Admin';

      const newOrgData: Omit<Organization, 'id'> = {
        slug: slug,
        name: `Org. de ${userDisplayName}`,
        taxId: '',
        createdAt: now,
      };

      const orgsCollection = collection(firestore, 'organizations');
      const orgDocRef = await addDoc(orgsCollection, newOrgData);
      const orgId = orgDocRef.id;

      const memberData: OrganizationMember = {
        userId: user.uid,
        email: user.email || '',
        displayName: userDisplayName, // Assegurar que aquest camp es desa
        role: 'admin',
        joinedAt: now,
      };

      const memberRef = doc(firestore, 'organizations', orgId, 'members', user.uid);
      await setDoc(memberRef, memberData);

      // CANVI CLAU: Guardar també el displayName al perfil de l'usuari
      const newUserProfile: UserProfile = {
        organizationId: orgId,
        role: 'admin',
        displayName: userDisplayName, 
      };

      const userProfileRef = doc(firestore, 'users', user.uid);
      await setDoc(userProfileRef, newUserProfile, { merge: true });

      setOrganization({ id: orgId, ...newOrgData });
      setUserProfile(newUserProfile);
      
      toast({
        title: 'Benvingut a Summa Social!',
        description: 'Hem creat la teva organització. Pots personalitzar-la a Configuració.',
      });
    };

    loadOrCreateOrganization();
  }, [user, isUserLoading, firestore, toast, isSuperAdmin]);

  return {
    organization,
    organizationId: organization?.id || null,
    userProfile, // Assegurar que es retorna el perfil complet
    userRole: userProfile?.role || null,
    isLoading,
    error,
    isSuperAdmin,
  };
}
