// src/hooks/use-initialize-user-data.ts

'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { ALL_DEFAULT_CATEGORIES } from '@/lib/default-data';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook que inicialitza les dades per defecte per a organitzacions noves.
 * Detecta automàticament si l'organització no té categories i les crea.
 */
export function useInitializeOrganizationData() {
  const { firestore, user } = useFirebase();
  const { organizationId, isLoading: isOrgLoading } = useCurrentOrganization();
  const { toast } = useToast();

  const [isInitializing, setIsInitializing] = useState(false);

  // Track which organization we've initialized for
  const initializedForOrgRef = useRef<string | null>(null);

  useEffect(() => {
    // GUARD: No fer queries si no hi ha user (evita permission-denied durant logout)
    if (!user) {
      return;
    }

    // Esperar a tenir organització
    if (isOrgLoading || !organizationId) {
      return;
    }

    // Si ja hem inicialitzat per aquesta organització, no fer res
    if (initializedForOrgRef.current === organizationId) {
      return;
    }

    // Marcar que estem inicialitzant ABANS de l'async per evitar múltiples execucions
    initializedForOrgRef.current = organizationId;

    const initializeIfNeeded = async () => {
      setIsInitializing(true);
      console.log(`🔍 Comprovant dades per a l'organització: ${organizationId}`);

      try {
        // Comprovar si l'organització ja té categories
        const categoriesRef = collection(firestore, 'organizations', organizationId, 'categories');
        const snapshot = await getDocs(categoriesRef);

        if (snapshot.empty) {
          // Organització nova! Crear categories per defecte
          console.log('🆕 Organització sense categories. Creant categories per defecte...');

          const batch = writeBatch(firestore);

          ALL_DEFAULT_CATEGORIES.forEach((category) => {
            const newDocRef = doc(categoriesRef);
            batch.set(newDocRef, category);
          });

          await batch.commit();

          console.log(`✅ ${ALL_DEFAULT_CATEGORIES.length} categories creades correctament.`);

          toast({
            title: 'Configuració completada!',
            description: `Hem configurat ${ALL_DEFAULT_CATEGORIES.length} categories comptables per a la teva organització.`,
          });
        } else {
          console.log(`✅ Organització existent amb ${snapshot.size} categories.`);
        }

      } catch (error) {
        console.error('❌ Error inicialitzant dades d\'organització:', error);
        // Revertir el ref perquè es pugui tornar a intentar
        initializedForOrgRef.current = null;
        toast({
          variant: 'destructive',
          title: 'Error d\'inicialització',
          description: 'No s\'han pogut crear les categories per defecte.',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeIfNeeded();
  }, [user, organizationId, isOrgLoading, firestore, toast]);

  return { isInitializing };
}

// Mantenir el nom antic per compatibilitat (però ara és un alias)
export const useInitializeUserData = useInitializeOrganizationData;
