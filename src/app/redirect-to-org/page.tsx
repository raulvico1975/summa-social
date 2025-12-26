// src/app/redirect-to-org/page.tsx
// Determina l'organització de l'usuari i redirigeix a /{slug}{next}
// Robust: no fa loops, mostra errors clars

'use client';

import { Suspense } from 'react';
import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signOut } from 'firebase/auth';

type PageState = 'loading' | 'error' | 'no-org';

function RedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { firestore, auth, user, isUserLoading } = useFirebase();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  const hasAttemptedRef = useRef(false);
  const nextPath = searchParams.get('next') || '/dashboard';

  useEffect(() => {
    async function determineOrgAndRedirect() {
      // Evitar execucions múltiples
      if (hasAttemptedRef.current) return;
      if (isUserLoading) return;

      // Si no hi ha usuari, anar a login
      if (!user) {
        router.replace('/login');
        return;
      }

      hasAttemptedRef.current = true;

      try {
        let orgId: string | null = null;
        let slug: string | null = null;

        // 1. Buscar el perfil de l'usuari per obtenir l'organizationId
        const userProfileRef = doc(firestore, 'users', user.uid);
        const userProfileSnap = await getDoc(userProfileRef);

        if (userProfileSnap.exists()) {
          const profile = userProfileSnap.data();
          orgId = profile.organizationId || profile.defaultOrganizationId || null;
        }

        // 2. Si no hi ha orgId al perfil, buscar com a membre d'alguna org
        if (!orgId) {
          // Buscar a quines organitzacions és membre
          const orgsRef = collection(firestore, 'organizations');
          const orgsSnap = await getDocs(orgsRef);

          for (const orgDoc of orgsSnap.docs) {
            const memberRef = doc(firestore, 'organizations', orgDoc.id, 'members', user.uid);
            const memberSnap = await getDoc(memberRef);
            if (memberSnap.exists()) {
              orgId = orgDoc.id;
              slug = orgDoc.data().slug;
              break;
            }
          }
        }

        // 3. Si encara no tenim orgId, l'usuari no té accés a cap org
        if (!orgId) {
          setPageState('no-org');
          setDebugInfo(`uid: ${user.uid}`);
          return;
        }

        // 4. Obtenir el slug si no el tenim encara
        if (!slug) {
          const orgRef = doc(firestore, 'organizations', orgId);
          const orgSnap = await getDoc(orgRef);

          if (!orgSnap.exists()) {
            setErrorMessage('L\'organització assignada no existeix.');
            setDebugInfo(`orgId: ${orgId}`);
            setPageState('error');
            return;
          }

          const orgData = orgSnap.data();
          slug = orgData.slug || null;
        }

        if (!slug) {
          setErrorMessage('L\'organització no té un identificador (slug) configurat.');
          setDebugInfo(`orgId: ${orgId}`);
          setPageState('error');
          return;
        }

        // 5. Redirigir!
        const newPath = `/${slug}${nextPath}`;
        router.replace(newPath);

      } catch (err) {
        console.error('[redirect-to-org] Error:', err);
        setErrorMessage('Error carregant l\'organització. Torna a iniciar sessió.');
        setDebugInfo(err instanceof Error ? err.message : 'Unknown error');
        setPageState('error');
      }
    }

    determineOrgAndRedirect();
  }, [user, isUserLoading, firestore, router, nextPath]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch {
      router.replace('/login');
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregant organització...</p>
        </div>
      </div>
    );
  }

  // No organization found
  if (pageState === 'no-org') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-orange-500" />
            <CardTitle className="mt-4">Sense organització</CardTitle>
            <CardDescription>
              No tens accés a cap organització. Contacta amb l'administrador per obtenir una invitació.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={handleLogout} variant="outline">
              Tancar sessió
            </Button>
            {debugInfo && (
              <p className="text-xs text-muted-foreground text-center font-mono">
                {debugInfo}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <CardTitle className="mt-4">Error</CardTitle>
          <CardDescription>{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={handleLogout}>
            Tornar a iniciar sessió
          </Button>
          {debugInfo && (
            <p className="text-xs text-muted-foreground text-center font-mono">
              {debugInfo}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

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
