'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useFirebase } from '@/firebase';

/**
 * Pàgina que redirigeix automàticament al dashboard de l'organització.
 * Quan algú accedeix a /flores-de-kiskeya, el redirigeix a /flores-de-kiskeya/dashboard
 * Si l'usuari no està autenticat, redirigeix a /flores-de-kiskeya/login
 */
export default function OrgRootPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const { user, isUserLoading } = useFirebase();

  useEffect(() => {
    if (isUserLoading || !orgSlug) return;

    if (!user) {
      router.replace(`/${orgSlug}/login`);
    } else {
      router.replace(`/${orgSlug}/dashboard`);
    }
  }, [orgSlug, router, user, isUserLoading]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirigint...</p>
    </main>
  );
}
