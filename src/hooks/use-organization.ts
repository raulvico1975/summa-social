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
  userRole: OrganizationRole | null;
  isLoading: boolean;
  error: Error | null;
  isSuperAdmin: boolean;
}

/**
 * Hook principal per gestionar l'organització de l'usuari actual.
 * 
 * - Si l'usuari és Super Admin i no té organització: en crea una
 * - Si l'usuari normal no té organització: mostra error
 * - Si l'usuari té organització: la carrega
 */
export function useOrganization(): UseOrganizationResult {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

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
            await loadExistingOrganization(userProfile.organizationId, userProfile.role);
          } else {
            // L'usuari existeix però no té organització
            await handleNoOrganization();
          }
        } else {
          // Usuari completament nou
          await handleNoOrganization();
        }
      } catch (err) {
        console.error('❌ Error carregant organització:', err);
        setError(err instanceof Error ? err : new Error('Error desconegut'));
      } finally {
        setIsLoading(false);
      }
    };

    /**
     * Carrega una organització existent
     */
    const loadExistingOrganization = async (orgId: string, role: OrganizationRole) => {
      const orgRef = doc(firestore, 'organizations', orgId);
      const orgSnap = await getDoc(orgRef);

      if (orgSnap.exists()) {
        const orgData = orgSnap.data() as Omit<Organization, 'id'>;
        setOrganization({ id: orgSnap.id, ...orgData });
        setUserRole(role);
        console.log('✅ Organització carregada:', orgData.name);
      } else {
        // L'organització referenciada no existeix
        console.error('❌ Organització referenciada no trobada:', orgId);
        setError(new Error('L\'organització assignada no existeix. Contacta amb l\'administrador.'));
      }
    };

    /**
     * Gestiona el cas quan l'usuari no té organització
     */
    const handleNoOrganization = async () => {
      if (isSuperAdmin) {
        // Super Admin: crear organització automàticament
        console.log('🆕 Super Admin sense organització. Creant-ne una...');
        await createNewOrganization();
      } else {
        // Usuari normal: no pot crear organització
        console.log('⚠️ Usuari sense organització assignada.');
        setError(new Error('No tens cap organització assignada. Contacta amb l\'administrador per obtenir accés.'));
        toast({
          variant: 'destructive',
          title: 'Sense accés',
          description: 'No tens cap organització assignada. Contacta amb l\'administrador.',
        });
      }
    };

    /**
     * Crea una nova organització (només per Super Admin)
     */
    const createNewOrganization = async () => {
      if (!user) return;

      const now = new Date().toISOString();
      
      // Generar un slug únic basat en el timestamp
      const slug = `org-${Date.now()}`;

      // 1. Crear l'organització
      const newOrg: Omit<Organization, 'id'> = {
        slug: slug,
        name: 'La Meva Organització',
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
        displayName: user.displayName || 'Super Admin',
        role: 'admin',
        joinedAt: now,
      };

      const memberRef = doc(firestore, 'organizations', orgId, 'members', user.uid);
      await setDoc(memberRef, memberData);

      // 3. Crear/actualitzar el perfil de l'usuari
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
  }, [user, isUserLoading, firestore, toast, isSuperAdmin]);

  return {
    organization,
    organizationId: organization?.id || null,
    userRole,
    isLoading,
    error,
    isSuperAdmin,
  };
}
