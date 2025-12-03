'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const { firestore, user, isUserLoading } = useFirebase();
  const [isRedirecting, setIsRedirecting] = React.useState(true);

  React.useEffect(() => {
    const redirect = async () => {
      // Esperar a que es carregui l'estat d'autenticació
      if (isUserLoading) {
        return;
      }

      // Si no hi ha usuari, redirigir al login
      if (!user) {
        router.push('/login');
        return;
      }

      // Si hi ha usuari, buscar la seva organització
      try {
        // Primer, buscar si l'usuari té una organització per defecte
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        let orgId: string | null = null;
        
        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data();
          if (profileData.defaultOrganizationId) {
            orgId = profileData.defaultOrganizationId;
          }
        }

        // Si no té organització per defecte, buscar la primera on és membre
        if (!orgId) {
          const orgsRef = collection(firestore, 'organizations');
          const orgsSnapshot = await getDocs(orgsRef);
          
          for (const orgDocSnap of orgsSnapshot.docs) {
            const memberRef = doc(firestore, 'organizations', orgDocSnap.id, 'members', user.uid);
            const memberSnap = await getDoc(memberRef);
            if (memberSnap.exists()) {
              orgId = orgDocSnap.id;
              break;
            }
          }
        }

        // Obtenir el slug de l'organització i redirigir
        if (orgId) {
          const orgRef = doc(firestore, 'organizations', orgId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            const orgData = orgSnap.data();
            if (orgData.slug) {
              router.push(`/${orgData.slug}/dashboard`);
              return;
            }
          }
        }

        // Fallback: redirigir al dashboard genèric
        router.push('/dashboard');
      } catch (error) {
        console.error('Error finding organization:', error);
        router.push('/login');
      }
    };

    redirect();
  }, [user, isUserLoading, firestore, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirigint...</p>
    </main>
  );
}
