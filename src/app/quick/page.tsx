// src/app/quick/page.tsx
// Deep link per a Quick Expense: /quick → /{orgSlug}/dashboard/project-module/quick-expense
// Reutilitza la lògica de redirect-to-org però amb destí fix.

'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, getDoc, collectionGroup, query, where, getDocs, limit, documentId } from 'firebase/firestore';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signOut } from 'firebase/auth';

type PageState = 'loading' | 'error' | 'no-org';

export default function QuickExpenseLandingPage() {
  const router = useRouter();
  const { firestore, auth, user, isUserLoading } = useFirebase();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<string>('');

  const hasAttemptedRef = useRef(false);

  // Destí fix: quick-expense
  const targetPath = '/dashboard/project-module/quick-expense';

  useEffect(() => {
    async function determineOrgAndRedirect() {
      // Evitar execucions múltiples
      if (hasAttemptedRef.current) return;
      if (isUserLoading) return;

      // Si no hi ha usuari, anar a login amb retorn a /quick
      if (!user) {
        router.replace('/login?next=/quick');
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
          const q = query(
            collectionGroup(firestore, 'members'),
            where(documentId(), '==', user.uid),
            limit(1)
          );

          const membersSnap = await getDocs(q);

          if (!membersSnap.empty) {
            const memberDoc = membersSnap.docs[0];
            const parentOrgRef = memberDoc.ref.parent.parent;
            orgId = parentOrgRef?.id ?? null;

            if (orgId) {
              const orgSnap = await getDoc(doc(firestore, 'organizations', orgId));
              slug = orgSnap.exists() ? (orgSnap.data().slug as string | null) : null;
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

        // 5. Redirigir a quick-expense!
        const newPath = `/${slug}${targetPath}`;
        router.replace(newPath);

      } catch (err) {
        console.error('[quick] Error:', err);
        setErrorMessage('Error carregant l\'organització. Torna a iniciar sessió.');
        setDebugInfo(err instanceof Error ? err.message : 'Unknown error');
        setPageState('error');
      }
    }

    determineOrgAndRedirect();
  }, [user, isUserLoading, firestore, router, targetPath]);

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregant...</p>
        </div>
      </div>
    );
  }

  // No organization found
  if (pageState === 'no-org') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-background">
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
    <div className="flex min-h-screen items-center justify-center p-4 bg-background">
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
