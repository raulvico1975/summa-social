// src/app/redirect-to-org/page.tsx

'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

// Component intern que usa useSearchParams
function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore, user, isUserLoading } = useFirebase();
  const [error, setError] = useState<string | null>(null);

  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    async function determineOrgAndRedirect() {
      if (isUserLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }

      try {
        // 1. Buscar el perfil de l'usuari per obtenir l'organizationId
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        
        let orgId: string | null = null;
        
        if (userProfileSnap.exists()) {
          const profile = userProfileSnap.data();
          // Buscar organizationId o defaultOrganizationId
          orgId = profile.organizationId || profile.defaultOrganizationId || null;
        }

        if (!orgId) {
          setError('No tens accés a cap organització. Contacta amb l\'administrador.');
          return;
        }

        // 2. Obtenir el slug de l'organització
        const orgRef = doc(firestore, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        
        if (!orgSnap.exists()) {
          setError('Organització no trobada');
          return;
        }

        const orgData = orgSnap.data();
        const slug = orgData.slug;

        if (!slug) {
          setError('L\'organització no té slug configurat');
          return;
        }

        // 3. Redirigir a la URL amb slug
        // nextPath pot ser "/dashboard" o "/dashboard/movimientos"
        // Hem de convertir-lo a "/{slug}/dashboard" o "/{slug}/dashboard/movimientos"
        const newPath = `/${slug}${nextPath}`;
        router.replace(newPath);

      } catch (err) {
        console.error('Error determinant organització:', err);
        setError('Error carregant l\'organització. Torna a iniciar sessió.');
      }
    }

    determineOrgAndRedirect();
  }, [user, isUserLoading, firestore, router, nextPath]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="text-primary underline"
          >
            Tornar a l'inici
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Carregant organització...</p>
      </div>
    </div>
  );
}

// Component principal amb Suspense
export default function RedirectToOrgPage() {
  return (
    <Suspense 
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Carregant...</p>
          </div>
        </div>
      }
    >
      <RedirectContent />
    </Suspense>
  );
}