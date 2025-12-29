// src/app/[orgSlug]/dashboard/layout.tsx

'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebarContent } from '@/components/dashboard-sidebar-content';
import { DashboardHeader } from '@/components/dashboard-header';
import { LogPanel } from '@/components/log-panel';
import { AppLogContext } from '@/hooks/use-app-log';
import type { LogMessage } from '@/hooks/use-app-log';
import { OrganizationProvider } from '@/hooks/organization-provider';
import { useInitializeOrganizationData } from '@/hooks/use-initialize-user-data';

// Rutes que s'han de renderitzar com a "landing" (sense sidebar/header)
const LANDING_ROUTES = ['/project-module/quick-expense'];

function OrganizationDependentLayout({ children }: { children: React.ReactNode }) {
  useInitializeOrganizationData();
  const pathname = usePathname();

  // Detectar si estem en una ruta landing
  const isLandingRoute = LANDING_ROUTES.some((route) => pathname.endsWith(route));

  const [logs, setLogs] = React.useState<LogMessage[]>([]);
  const logCounterRef = React.useRef(0);

  const log = React.useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newLog: LogMessage = {
      id: logCounterRef.current++,
      timestamp,
      message,
    };
    setLogs((prevLogs) => [...prevLogs, newLog]);
  }, []);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

  const appLogValue = React.useMemo(() => ({ logs, log, clearLogs }), [logs, log, clearLogs]);

  // Landing mode: sense sidebar, header ni log panel
  if (isLandingRoute) {
    return (
      <AppLogContext.Provider value={appLogValue}>
        {children}
      </AppLogContext.Provider>
    );
  }

  // Mode normal: amb sidebar i header
  return (
    <AppLogContext.Provider value={appLogValue}>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen">
          <Sidebar collapsible="icon">
            <DashboardSidebarContent />
          </Sidebar>
          <SidebarInset className="flex flex-1 flex-col transition-all duration-300 ease-in-out">
            <DashboardHeader />
            <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
      <LogPanel />
    </AppLogContext.Provider>
  );
}

export default function OrgDashboardLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  return (
    <OrganizationProvider orgSlug={orgSlug}>
      <OrganizationDependentLayout>
        {children}
      </OrganizationDependentLayout>
    </OrganizationProvider>
  );
}
