// src/app/[orgSlug]/dashboard/project-module/quick-expense/layout.tsx
// Layout "blank" per a la landing de Quick Expense: sense sidebar, header ni breadcrumb.
// Només conté OrganizationProvider per accedir al context de l'organització.

'use client';

import { useParams } from 'next/navigation';
import { OrganizationProvider } from '@/hooks/organization-provider';

export default function QuickExpenseLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  return (
    <OrganizationProvider orgSlug={orgSlug}>
      <div className="min-h-[100dvh] bg-background">
        {children}
      </div>
    </OrganizationProvider>
  );
}
