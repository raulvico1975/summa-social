// src/app/[orgSlug]/q/layout.tsx
// Layout mínim per a Quick Expense: sense sidebar, sense topbar
// Dissenyat per ús mòbil com a "app" guardada a la pantalla d'inici

'use client';

import { useParams } from 'next/navigation';
import { OrganizationProvider } from '@/hooks/organization-provider';
import { useInitializeOrganizationData } from '@/hooks/use-initialize-user-data';

function InitializeData({ children }: { children: React.ReactNode }) {
  useInitializeOrganizationData();
  return <>{children}</>;
}

export default function QuickLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  return (
    <OrganizationProvider orgSlug={orgSlug}>
      <InitializeData>
        {children}
      </InitializeData>
    </OrganizationProvider>
  );
}
