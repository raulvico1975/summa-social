// src/hooks/use-organization.ts

'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  addDoc,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { useFirebase } from '@/firebase';
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
      // Esperar que l'usuari estigui carregat
      if (isUserLoading) {
        return;
      }

      // Si no hi ha usuari, no podem fer res
      if (!user) {
        setIsLoading(false);
        setOrganization(null);
        setUserRole(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // 1. Buscar el perfil de l'usuari per veure si ja té organització
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data() as UserProfile;
          
          if (userProfile.organizationId) {
            // L'usuari ja té organització - carregar-la
            const orgRef = doc(firestore, 'organizations', userProfile.organizationId);
            const orgSnap = await getDoc(orgRef);

            if (orgSnap.exists()) {
              const orgData = orgSnap.data() as Omit<Organization, 'id'>;
              setOrganization({ id: orgSnap.id, ...orgData });
              setUserRole(userProfile.role);
              console.log('✅ Organització carregada:', orgData.name);
            } else {
              // L'organització referenciada no existeix - crear-ne una nova
              console.warn('⚠️ Organització referenciada no trobada. Creant-ne una nova...');
              await createNewOrganization();
            }
          } else {
            // L'usuari existeix però no té organització - crear-ne una
            console.log('🆕 Usuari sense organització. Creant-ne una...');
            await createNewOrganization();
          }
        } else {
          // Usuari completament nou - crear perfil i organització
          console.log('🆕 Usuari nou detectat. Creant organització...');
          await createNewOrganization();
        }
      } catch (err) {
        console.error('❌ Error carregant organització:', err);
        setError(err instanceof Error ? err : new Error('Error desconegut'));
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'No s\'ha pogut carregar l\'organització.',
        });
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Crea una nova organització per a l'usuari actual
     */
    const createNewOrganization = async () => {
      if (!user) return;

      const now = new Date().toISOString();
      
      // Generar un slug únic basat en el timestamp
      const slug = `org-${Date.now()}`;

      // 1. Crear l'organització
      const newOrg: Omit<Organization, 'id'> = {
        slug: slug,
        name: 'La Meva Organització',  // Nom per defecte - l'usuari pot canviar-lo
        taxId: '',
        createdAt: now,
      };

      const orgsCollection = collection(firestore, 'organizations');
      const orgDocRef = await addDoc(orgsCollection, newOrg);
      const orgId = orgDocRef.id;

      // 2. Afegir l'usuari com a membre admin
      const memberData: OrganizationMember = {
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Usuari',
        role: 'admin',
        joinedAt: now,
      };

      const memberRef = doc(firestore, 'organizations', orgId, 'members', user.uid);
      await setDoc(memberRef, memberData);

      // 3. Crear/actualitzar el perfil de l'usuari amb la referència a l'organització
      const userProfile: UserProfile = {
        organizationId: orgId,
        role: 'admin',
      };

      const userProfileRef = doc(firestore, 'users', user.uid);
      await setDoc(userProfileRef, userProfile, { merge: true });

      // 4. Actualitzar l'estat local
      setOrganization({ id: orgId, ...newOrg });
      setUserRole('admin');

      console.log('✅ Nova organització creada:', orgId);
      
      toast({
        title: 'Benvingut a Summa Social!',
        description: 'Hem creat la teva organització. Pots personalitzar-la a Configuració.',
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
