// src/app/[orgSlug]/quick-expense/layout.tsx
// Layout mínim per a Quick Expense: sense sidebar ni topbar
// Fora del segment /dashboard per evitar heretar el layout del dashboard

'use client';

import { useParams } from 'next/navigation';
import { OrganizationProvider } from '@/hooks/organization-provider';
import { useInitializeOrganizationData } from '@/hooks/use-initialize-user-data';

function InitializeData({ children }: { children: React.ReactNode }) {
  useInitializeOrganizationData();
  return <>{children}</>;
}

export default function QuickExpenseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  return (
    <OrganizationProvider orgSlug={orgSlug}>
      <InitializeData>
        <div className="min-h-[100dvh] bg-background">
          {children}
        </div>
      </InitializeData>
    </OrganizationProvider>
  );
}
