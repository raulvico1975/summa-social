// src/hooks/use-organization.ts

'use client';

import { useEffect, useState } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  writeBatch
} from 'firebase/firestore';
import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking, FirestorePermissionError, errorEmitter } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import type { Organization, OrganizationMember, UserProfile, OrganizationRole } from '@/lib/data';

interface UseOrganizationResult {
  organization: Organization | null;
  organizationId: string | null;
  userRole: OrganizationRole | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook principal per gestionar l'organització de l'usuari actual.
 * 
 * - Si l'usuari és nou: crea automàticament una organització
 * - Si l'usuari ja té organització: la carrega
 * - Proporciona l'organizationId per a tots els components
 */
export function useOrganization(): UseOrganizationResult {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadOrCreateOrganization = async () => {
      if (isUserLoading) return;
      if (!user) {
        setIsLoading(false);
        setOrganization(null);
        setUserRole(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      const userProfileRef = doc(firestore, 'users', user.uid);
      
      try {
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data() as UserProfile;
          if (userProfile.organizationId) {
            const orgRef = doc(firestore, 'organizations', userProfile.organizationId);
            const orgSnap = await getDoc(orgRef);
            if (orgSnap.exists()) {
              const orgData = orgSnap.data() as Omit<Organization, 'id'>;
              setOrganization({ id: orgSnap.id, ...orgData });
              setUserRole(userProfile.role);
              console.log('✅ Organització carregada:', orgData.name);
            } else {
              console.warn('⚠️ Organització referenciada no trobada. Creant-ne una nova...');
              createNewOrganization();
            }
          } else {
            console.log('🆕 Usuari sense organització. Creant-ne una...');
            createNewOrganization();
          }
        } else {
          console.log('🆕 Usuari nou detectat. Creant organització...');
          createNewOrganization();
        }
      } catch (err: any) {
         // This is likely a permission error on getDoc
         const permissionError = new FirestorePermissionError({
            path: userProfileRef.path,
            operation: 'get',
        });
        setError(permissionError);
        errorEmitter.emit('permission-error', permissionError);
        console.error('❌ Error carregant el perfil d\'usuari:', err);
      } finally {
        setIsLoading(false);
      }
    };

    const createNewOrganization = () => {
      if (!user) return;

      const now = new Date().toISOString();
      const slug = `org-${Date.now()}`;

      const newOrgData: Omit<Organization, 'id'> = {
        slug: slug,
        name: 'La Meva Organització',
        taxId: '',
        createdAt: now,
      };

      const orgsCollection = collection(firestore, 'organizations');
      
      addDoc(orgsCollection, newOrgData)
        .then(orgDocRef => {
            const orgId = orgDocRef.id;
            const batch = writeBatch(firestore);

            const memberData: OrganizationMember = {
                userId: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'Usuari',
                role: 'admin',
                joinedAt: now,
            };
            const memberRef = doc(firestore, 'organizations', orgId, 'members', user.uid);
            batch.set(memberRef, memberData);

            const userProfile: UserProfile = {
                organizationId: orgId,
                role: 'admin',
            };
            const userProfileRef = doc(firestore, 'users', user.uid);
            batch.set(userProfileRef, userProfile, { merge: true });

            return batch.commit().then(() => {
                setOrganization({ id: orgId, ...newOrgData });
                setUserRole('admin');
                console.log('✅ Nova organització creada:', orgId);
                toast({
                    title: 'Benvingut a Summa Social!',
                    description: 'Hem creat la teva organització. Pots personalitzar-la a Configuració.',
                });
            });
        })
        .catch(err => {
            const permissionError = new FirestorePermissionError({
                path: orgsCollection.path,
                operation: 'create',
                requestResourceData: newOrgData,
            });
            setError(permissionError);
            errorEmitter.emit('permission-error', permissionError);
            console.error('❌ Error creant organització:', err);
        });
    };

    loadOrCreateOrganization();
  }, [user, isUserLoading, firestore, toast]);

  return {
    organization,
    organizationId: organization?.id || null,
    userRole,
    isLoading,
    error,
  };
}
