// src/app/dashboard/layout.tsx

'use client';

import * as React from 'react';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebarContent } from '@/components/dashboard-sidebar-content';
import { DashboardHeader } from '@/components/dashboard-header';
import { LogPanel } from '@/components/log-panel';
import { AppLogContext } from '@/hooks/use-app-log';
import type { LogMessage } from '@/hooks/use-app-log';
import { OrganizationProvider } from '@/hooks/organization-provider';

let logCounter = 0;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(true);
  const [logs, setLogs] = React.useState<LogMessage[]>([]);

  const log = React.useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const newLog: LogMessage = {
      id: logCounter++,
      timestamp,
      message,
    };
    setLogs((prevLogs) => [...prevLogs, newLog]);
  }, []);

  const clearLogs = React.useCallback(() => {
    setLogs([]);
  }, []);

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
    <OrganizationProvider>
      <AppLogContext.Provider value={{ logs, log, clearLogs }}>
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
        <LogPanel />
      </AppLogContext.Provider>
    </OrganizationProvider>
  );
}
