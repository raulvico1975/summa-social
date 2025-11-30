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
const SUPER_ADMIN_UID = 'nVpmVHsGD4TySqEyjEZzBlQuC033';

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
 */
export function useOrganization(): UseOrganizationResult {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [userRole, setUserRole] = useState<OrganizationRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // DEBUG: Logging per diagnosticar
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;
  
  useEffect(() => {
    // DEBUG: Mostrar informació de l'usuari
    console.log('🔍 DEBUG useOrganization:');
    console.log('   - user:', user);
    console.log('   - user?.uid:', user?.uid);
    console.log('   - SUPER_ADMIN_UID:', SUPER_ADMIN_UID);
    console.log('   - isSuperAdmin:', user?.uid === SUPER_ADMIN_UID);
    console.log('   - isUserLoading:', isUserLoading);
  }, [user, isUserLoading]);

  useEffect(() => {
    const loadOrCreateOrganization = async () => {
      // Esperar que l'usuari estigui carregat
      if (isUserLoading) {
        console.log('⏳ Esperant que l\'usuari es carregui...');
        return;
      }

      // Si no hi ha usuari, no podem fer res
      if (!user) {
        console.log('❌ No hi ha usuari autenticat');
        setIsLoading(false);
        setOrganization(null);
        setUserRole(null);
        return;
      }

      console.log('👤 Usuari autenticat:', user.uid);
      console.log('🔑 És Super Admin?', isSuperAdmin);

      setIsLoading(true);
      setError(null);

      try {
        // 1. Buscar el perfil de l'usuari per veure si ja té organització
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const userProfile = userProfileSnap.data() as UserProfile;
          console.log('📄 Perfil d\'usuari trobat:', userProfile);
          
          if (userProfile.organizationId) {
            // L'usuari ja té organització - carregar-la
            console.log('🏢 Carregant organització:', userProfile.organizationId);
            await loadExistingOrganization(userProfile.organizationId, userProfile.role);
          } else {
            // L'usuari existeix però no té organització
            console.log('⚠️ Usuari sense organizationId al perfil');
            await handleNoOrganization();
          }
        } else {
          // Usuari completament nou
          console.log('🆕 Usuari nou (sense perfil a Firestore)');
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
        console.error('❌ Organització referenciada no trobada:', orgId);
        setError(new Error('L\'organització assignada no existeix. Contacta amb l\'administrador.'));
      }
    };

    /**
     * Gestiona el cas quan l'usuari no té organització
     */
    const handleNoOrganization = async () => {
      console.log('🔍 handleNoOrganization - isSuperAdmin:', isSuperAdmin);
      console.log('🔍 handleNoOrganization - user?.uid:', user?.uid);
      console.log('🔍 handleNoOrganization - SUPER_ADMIN_UID:', SUPER_ADMIN_UID);
      
      if (isSuperAdmin) {
        // Super Admin: crear organització automàticament
        console.log('🆕 Super Admin detectat! Creant organització...');
        await createNewOrganization();
      } else {
        // Usuari normal: no pot crear organització
        console.log('⚠️ Usuari sense organització assignada. UID:', user?.uid);
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

      console.log('🏗️ Creant nova organització per:', user.uid);

      const now = new Date().toISOString();
      const slug = `org-${Date.now()}`;

      // 1. Crear l'organització
      const newOrg: Omit<Organization, 'id'> = {
        slug: slug,
        name: 'La Meva Organització',
        taxId: '',
        createdAt: now,
      };

      console.log('📝 Dades de l\'organització:', newOrg);

      try {
        const orgsCollection = collection(firestore, 'organizations');
        const orgDocRef = await addDoc(orgsCollection, newOrg);
        const orgId = orgDocRef.id;
        console.log('✅ Organització creada amb ID:', orgId);

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
        console.log('✅ Membre creat');

        // 3. Crear/actualitzar el perfil de l'usuari
        const userProfile: UserProfile = {
          organizationId: orgId,
          role: 'admin',
        };

        const userProfileRef = doc(firestore, 'users', user.uid);
        await setDoc(userProfileRef, userProfile, { merge: true });
        console.log('✅ Perfil d\'usuari actualitzat');

        // 4. Actualitzar l'estat local
        setOrganization({ id: orgId, ...newOrg });
        setUserRole('admin');

        console.log('🎉 Tot completat! Organització:', orgId);
        
        toast({
          title: 'Benvingut a Summa Social!',
          description: 'Hem creat la teva organització. Pots personalitzar-la a Configuració.',
        });
      } catch (err) {
        console.error('❌ Error creant organització:', err);
        throw err;
      }
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
