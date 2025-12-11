'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Pàgina que redirigeix automàticament al dashboard de l'organització.
 * Quan algú accedeix a /flores-de-kiskeya, el redirigeix a /flores-de-kiskeya/dashboard
 */
export default function OrgRootPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params?.orgSlug as string;

  useEffect(() => {
    if (orgSlug) {
      router.replace(`/${orgSlug}/dashboard`);
    }
  }, [orgSlug, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Redirigint...</p>
    </main>
  );
}
