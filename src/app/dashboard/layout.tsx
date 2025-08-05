
'use client';

import * as React from 'react';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebarContent } from '@/components/dashboard-sidebar-content';
import { DashboardHeader } from '@/components/dashboard-header';
import { LogPanel } from '@/components/log-panel';
import { AppLogProvider } from '@/hooks/use-app-log';


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // We need to get the initial state of the sidebar from the cookie.
  // This is a client component because it uses hooks and browser APIs.
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    // We can't access document on the server.
    const sidebarState = document.cookie
      .split('; ')
      .find((row) => row.startsWith('sidebar_state='))
      ?.split('=')[1];
    if (sidebarState) {
      setOpen(sidebarState === 'true');
    }
  }, []);

  return (
    <AppLogProvider>
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
    </AppLogProvider>
  );
}
