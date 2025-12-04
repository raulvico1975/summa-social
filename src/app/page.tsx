'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const { firestore, user, isUserLoading } = useFirebase();

  React.useEffect(() => {
    const redirect = async () => {
      if (isUserLoading) return;

      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // Buscar organització de l'usuari
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        let orgId: string | null = null;
        
        if (userProfileSnap.exists()) {
          const profileData = userProfileSnap.data();
          if (profileData.defaultOrganizationId) {
            orgId = profileData.defaultOrganizationId;
          }
        }

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

        router.push('/login');
      } catch (error) {
        console.error('Error:', error);
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
