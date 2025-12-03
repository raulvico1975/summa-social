'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { Loader2 } from 'lucide-react';

export default function RedirectToOrgPage() {
  const { organization, isLoading } = useCurrentOrganization();
  const router = useRouter();

  React.useEffect(() => {
    // Si tenim organització i no estem carregant, redirigim
    if (organization && !isLoading) {
      router.replace(`/${organization.slug}/dashboard`);
    }
    
    // Si no hi ha organització i no estem carregant (potser l'usuari no està logat),
    // el portem a la pàgina d'inici
    if (!organization && !isLoading) {
      router.replace('/');
    }
  }, [organization, isLoading, router]);

  // Mostrar un estat de càrrega mentre esperem
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Redirigint a la teva organització...</p>
      </div>
    </div>
  );
}
