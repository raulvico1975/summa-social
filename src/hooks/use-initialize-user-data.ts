// src/hooks/use-initialize-user-data.ts

'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { ALL_DEFAULT_CATEGORIES } from '@/lib/default-data';
import { useToast } from '@/hooks/use-toast';

/**
 * Hook que inicialitza les dades per defecte per a usuaris nous.
 * Detecta automàticament si l'usuari no té categories i les crea.
 */
export function useInitializeUserData() {
  const { firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [isInitializing, setIsInitializing] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeIfNeeded = async () => {
      // Esperar a tenir usuari
      if (isUserLoading || !user || isInitializing || isInitialized) {
        return;
      }

      setIsInitializing(true);

      try {
        // Comprovar si l'usuari ja té categories
        const categoriesRef = collection(firestore, 'users', user.uid, 'categories');
        const snapshot = await getDocs(categoriesRef);

        if (snapshot.empty) {
          // Usuari nou! Crear categories per defecte
          console.log('Nou usuari detectat. Creant categories per defecte...');
          
          const batch = writeBatch(firestore);
          
          ALL_DEFAULT_CATEGORIES.forEach((category) => {
            const newDocRef = doc(categoriesRef);
            batch.set(newDocRef, category);
          });

          await batch.commit();

          console.log(`✅ ${ALL_DEFAULT_CATEGORIES.length} categories creades correctament.`);
          
          toast({
            title: '¡Bienvenido a Summa Social!',
            description: `Hemos configurado ${ALL_DEFAULT_CATEGORIES.length} categorías contables para tu organización.`,
          });
        } else {
          console.log(`Usuari existent amb ${snapshot.size} categories.`);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Error inicialitzant dades d\'usuari:', error);
        toast({
          variant: 'destructive',
          title: 'Error de inicialización',
          description: 'No se pudieron crear las categorías por defecto. Inténtalo de nuevo.',
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeIfNeeded();
  }, [user, isUserLoading, firestore, isInitializing, isInitialized, toast]);

  return { isInitializing, isInitialized };
}
