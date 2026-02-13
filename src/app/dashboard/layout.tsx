// src/app/dashboard/layout.tsx

'use client';

import * as React from 'react';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebarContent } from '@/components/dashboard-sidebar-content';
import { DashboardHeader } from '@/components/dashboard-header';
import { OrganizationProvider } from '@/hooks/organization-provider';
import { useInitializeOrganizationData } from '@/hooks/use-initialize-user-data';

function OrganizationDependentLayout({ children }: { children: React.ReactNode }) {
  // Aquest hook s'assegura que les dades per defecte (com categories) existeixin.
  useInitializeOrganizationData();

  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    const sidebarState = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sidebar_state='))
      ?.split('=')[1];
    if (sidebarState) {
      setOpen(sidebarState === 'true');
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={open} onOpenChange={setOpen}>
      <div className="flex min-h-screen">
        <Sidebar>
          <DashboardSidebarContent />
        </Sidebar>
        <SidebarInset className="flex flex-1 flex-col transition-all duration-300 ease-in-out">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <OrganizationProvider>
      <OrganizationDependentLayout>
        {children}
      </OrganizationDependentLayout>
    </OrganizationProvider>
  );
}
