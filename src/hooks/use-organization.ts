// src/hooks/use-organization.ts

'use client';

import { useEffect, useState, useRef } from 'react';
import { 
  doc, 
  getDoc,
  writeBatch,
  getDocs,
  collection
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Organization, UserProfile, OrganizationRole, OrganizationMember } from '@/lib/data';
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

// El teu UID - només tu pots crear organitzacions
const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';

/**
 * Hook to load the organization for the current user.
 * It also handles the creation of the organization and user profile if they don't exist.
 */
export function useOrganization(): UseOrganizationResult {
  const { firestore, user: firebaseUser, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref to prevent running the creation logic multiple times
  const creationCheckPerformedRef = useRef(false);

  useEffect(() => {
    const loadAndEnsureOrganization = async () => {
      // Don't do anything until Firebase auth is resolved
      if (isUserLoading) {
        return;
      }
      
      // If user is logged out, reset state
      if (!firebaseUser) {
        setIsLoading(false);
        setOrganization(null);
        setUserProfile(null);
        creationCheckPerformedRef.current = false; // Reset for next login
        return;
      }
      
      // If we have already checked for this user session, don't do it again
      if (creationCheckPerformedRef.current) {
        return;
      }
      
      setIsLoading(true);
      setError(null);
      creationCheckPerformedRef.current = true; // Mark as checked

      try {
        const userProfileRef = doc(firestore, 'users', firebaseUser.uid);
        let userProfileSnap = await getDoc(userProfileRef);
        let profileData = userProfileSnap.data() as UserProfile | undefined;

        // ---------------------------------------------------------------------
        // CRITICAL LOGIC: Create organization and profiles if they don't exist
        // ---------------------------------------------------------------------
        if (!userProfileSnap.exists()) {
          console.log(`[use-organization] No user profile found for UID ${firebaseUser.uid}. Starting creation process...`);
          if (firebaseUser.uid === SUPER_ADMIN_UID) {
            
            const batch = writeBatch(firestore);
            const now = new Date();
            const userName = firebaseUser.displayName || firebaseUser.email?.split('@')[0] || `user_${firebaseUser.uid.substring(0, 5)}`;
            
            // 1. Create Organization
            const orgCollectionRef = collection(firestore, 'organizations');
            const newOrgRef = doc(orgCollectionRef); // Create a new doc with a generated ID
            const newOrgData: Omit<Organization, 'id'> = {
                slug: `org-${now.getTime()}`,
                name: `Org. de ${userName}`,
                taxId: '',
                createdAt: now.toISOString(),
            };
            batch.set(newOrgRef, newOrgData);
            console.log(`[use-organization] Staged organization creation with ID: ${newOrgRef.id}`);

            // 2. Create Organization Member
            const memberRef = doc(firestore, 'organizations', newOrgRef.id, 'members', firebaseUser.uid);
            const memberData: OrganizationMember = {
                userId: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: userName,
                role: 'admin',
                joinedAt: now.toISOString(),
            };
            batch.set(memberRef, memberData);
            console.log(`[use-organization] Staged member creation for user ${userName}.`);

            // 3. Create User Profile
            const newUserProfileData: UserProfile = {
                organizationId: newOrgRef.id,
                role: 'admin',
                displayName: userName,
            };
            batch.set(userProfileRef, newUserProfileData);
            console.log(`[use-organization] Staged user profile creation.`);
            
            // Commit all writes at once
            await batch.commit();
            console.log(`[use-organization] Batch commit successful. Creation process complete.`);

            // Re-fetch the profile to ensure we have the latest data
            userProfileSnap = await getDoc(userProfileRef);
            profileData = userProfileSnap.data() as UserProfile;
            
            toast({
              title: "Benvingut!",
              description: `S'ha creat una nova organització per a tu.`
            });
          } else {
              throw new Error("No tens cap organització assignada. Contacta amb l'administrador.");
          }
        }
        // ---------------------------------------------------------------------
        // END CRITICAL LOGIC
        // ---------------------------------------------------------------------

        if (profileData) {
          setUserProfile(profileData);

          const orgRef = doc(firestore, 'organizations', profileData.organizationId);
          const orgSnap = await getDoc(orgRef);

          if (orgSnap.exists()) {
            setOrganization({ id: orgSnap.id, ...(orgSnap.data() as Omit<Organization, 'id'>) });
          } else {
            throw new Error(`L'organització amb ID ${profileData.organizationId} no s'ha trobat.`);
          }
        } else {
            throw new Error('El teu perfil d\'usuari no existeix i no s\'ha pogut crear.');
        }

      } catch (err) {
        console.error('❌ Error in useOrganization:', err);
        const anError = err instanceof Error ? err : new Error('Error desconegut durant la càrrega de l\'organització.');
        setError(anError);
        toast({
          variant: 'destructive',
          title: 'Error Crític',
          description: anError.message,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAndEnsureOrganization();
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
