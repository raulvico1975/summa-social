// src/hooks/organization-provider.tsx

'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useOrganization } from '@/hooks/use-organization';
import type { Organization, OrganizationRole } from '@/lib/data';
import { Loader2 } from 'lucide-react';

interface OrganizationContextType {
  organization: Organization | null;
  organizationId: string | null;
  userRole: OrganizationRole | null;
  isLoading: boolean;
  error: Error | null;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

interface OrganizationProviderProps {
  children: ReactNode;
}

/**
 * Provider que gestiona l'organització actual i la fa disponible a tots els components.
 * Mostra una pantalla de càrrega mentre es carrega/crea l'organització.
 */
export function OrganizationProvider({ children }: OrganizationProviderProps) {
  const organizationData = useOrganization();

  // Mentre es carrega, mostrar un indicador
  if (organizationData.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregant organització...</p>
        </div>
      </div>
    );
  }

  // Si hi ha error i no tenim organització, mostrar error
  if (organizationData.error && !organizationData.organization) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center p-4">
          <p className="text-destructive font-semibold">Error carregant l'organització</p>
          <p className="text-muted-foreground text-sm">
            Si us plau, recarrega la pàgina o torna a iniciar sessió.
          </p>
        </div>
      </div>
    );
  }

  return (
    <OrganizationContext.Provider value={organizationData}>
      {children}
    </OrganizationContext.Provider>
  );
}

/**
 * Hook per accedir a l'organització actual des de qualsevol component.
 * 
 * Ús:
 * ```typescript
 * const { organizationId, userRole } = useCurrentOrganization();
 * ```
 */
export function useCurrentOrganization(): OrganizationContextType {
  const context = useContext(OrganizationContext);
  
  if (context === undefined) {
    throw new Error('useCurrentOrganization must be used within an OrganizationProvider');
  }
  
  return context;
}
