'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

/**
 * Pàgina de redirecció que:
 * 1. Determina l'organització de l'usuari actual
 * 2. Redirigeix a la URL amb el slug de l'organització
 * 
 * Exemple:
 * - Usuari accedeix a /dashboard/movimientos
 * - Middleware redirigeix a /redirect-to-org?next=/dashboard/movimientos
 * - Aquesta pàgina determina que l'usuari pertany a "flores-kiskeya"
 * - Redirigeix a /flores-kiskeya/dashboard/movimientos
 */
export default function RedirectToOrgPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore, user, isUserLoading } = useFirebase();
  
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Esperar que es carregui l'usuari
    if (isUserLoading) {
      return;
    }

    // Si no hi ha usuari, redirigir a login
    if (!user) {
      router.push('/login');
      return;
    }

    const findUserOrganization = async () => {
      try {
        // 1. Comprovar si l'usuari té una organització per defecte al seu perfil
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        let orgSlug: string | null = null;
        let orgId: string | null = null;

        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data();
          if (profileData.defaultOrganizationId) {
            orgId = profileData.defaultOrganizationId;
            
            // Obtenir el slug d'aquesta organització
            const orgRef = doc(firestore, 'organizations', orgId);
            const orgSnap = await getDoc(orgRef);
            if (orgSnap.exists()) {
              orgSlug = orgSnap.data().slug;
            }
          }
        }

        // 2. Si no té organització per defecte, buscar la primera on és membre
        if (!orgSlug) {
          const orgsRef = collection(firestore, 'organizations');
          const orgsSnapshot = await getDocs(orgsRef);
          
          for (const orgDoc of orgsSnapshot.docs) {
            const memberRef = doc(firestore, 'organizations', orgDoc.id, 'members', user.uid);
            const memberSnap = await getDoc(memberRef);
            
            if (memberSnap.exists()) {
              orgSlug = orgDoc.data().slug;
              orgId = orgDoc.id;
              break;
            }
          }
        }

        // 3. Si encara no té organització, redirigir a la pàgina de crear/seleccionar
        if (!orgSlug) {
          // Potser l'usuari és nou i no té organització
          router.push('/onboarding');
          return;
        }

        // 4. Construir la URL final i redirigir
        const nextPath = searchParams.get('next') || '/dashboard';
        
        // Substituir /dashboard per /{orgSlug}/dashboard
        let finalPath: string;
        if (nextPath.startsWith('/dashboard')) {
          finalPath = `/${orgSlug}${nextPath}`;
        } else {
          finalPath = `/${orgSlug}/dashboard${nextPath}`;
        }

        // Redirigir a la URL final
        router.replace(finalPath);

      } catch (err) {
        console.error('Error finding user organization:', err);
        setError('No s\'ha pogut determinar la teva organització. Torna-ho a provar.');
      }
    };

    findUserOrganization();
  }, [firestore, user, isUserLoading, router, searchParams]);

  // Mostrar error si n'hi ha
  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-4">
          <p className="text-destructive font-semibold">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Tornar a l'inici
          </button>
        </div>
      </div>
    );
  }

  // Mostrar spinner mentre es carrega
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirigint al teu espai...</p>
      </div>
    </div>
  );
}
