// src/app/[orgSlug]/dashboard/layout.tsx

'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Sidebar, SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { DashboardSidebarContent } from '@/components/dashboard-sidebar-content';
import { DashboardHeader } from '@/components/dashboard-header';
import { LogPanel } from '@/components/log-panel';
import { ProductUpdatesFab } from '@/components/notifications/product-updates-fab';
import { AppLogContext } from '@/hooks/use-app-log';
import type { LogMessage } from '@/hooks/use-app-log';
import { OrganizationProvider, useCurrentOrganization } from '@/hooks/organization-provider';
import { useInitializeOrganizationData } from '@/hooks/use-initialize-user-data';

// ─────────────────────────────────────────────────────────────────────────────
// Sidebar collapse logic: col·lapsa després de la primera navegació
// ─────────────────────────────────────────────────────────────────────────────

function useSidebarCollapseBehavior() {
  const pathname = usePathname();
  const { organizationId, firebaseUser } = useCurrentOrganization();
  const userId = firebaseUser?.uid;

  // Claus de localStorage per persistir preferències
  const collapsedKey = organizationId && userId
    ? `summa.sidebarCollapsed.${organizationId}.${userId}`
    : null;
  const firstNavKey = organizationId && userId
    ? `summa.sidebar.firstNavDone.${organizationId}.${userId}`
    : null;

  // Estat intern: sidebar oberta o col·lapsada
  const [sidebarOpen, setSidebarOpen] = React.useState<boolean>(() => {
    // Inicial: si tenim preferència guardada, usar-la; sinó, oberta
    if (typeof window !== 'undefined' && collapsedKey) {
      const stored = localStorage.getItem(collapsedKey);
      if (stored !== null) {
        return stored !== 'true'; // 'true' = collapsed → open = false
      }
    }
    return true; // Per defecte oberta (primera visita)
  });

  // Ref per detectar si ja ha passat la primera navegació
  const initialPathnameRef = React.useRef<string | null>(null);

  // Inicialitzar pathname inicial
  React.useEffect(() => {
    if (initialPathnameRef.current === null) {
      initialPathnameRef.current = pathname;
    }
  }, [pathname]);

  // Detectar canvi de ruta per col·lapsar després de la primera navegació
  React.useEffect(() => {
    // Esperar a tenir les claus de localStorage
    if (!collapsedKey || !firstNavKey) return;

    // Si ja hem fet la primera navegació abans (sessió anterior), no fer res
    const firstNavDone = localStorage.getItem(firstNavKey);
    if (firstNavDone === 'true') return;

    // Si el pathname ha canviat des de l'inicial (primera navegació dins dashboard)
    if (initialPathnameRef.current && pathname !== initialPathnameRef.current) {
      // Col·lapsar sidebar
      setSidebarOpen(false);
      // Guardar preferències
      localStorage.setItem(collapsedKey, 'true');
      localStorage.setItem(firstNavKey, 'true');
    }
  }, [pathname, collapsedKey, firstNavKey]);

  // Handler per canvis manuals de l'usuari (botó toggle)
  const handleOpenChange = React.useCallback((open: boolean) => {
    setSidebarOpen(open);
    // Guardar preferència
    if (collapsedKey) {
      localStorage.setItem(collapsedKey, (!open).toString());
    }
    // Si l'usuari ha interactuat manualment, marcar firstNav com fet
    if (firstNavKey) {
      localStorage.setItem(firstNavKey, 'true');
    }
  }, [collapsedKey, firstNavKey]);

  return { sidebarOpen, handleOpenChange };
}

function OrganizationDependentLayout({ children }: { children: React.ReactNode }) {
  useInitializeOrganizationData();

  // Sidebar collapse behavior
  const { sidebarOpen, handleOpenChange } = useSidebarCollapseBehavior();

  // DEV-ONLY: Horizontal scroll detector - troba l'element culpable
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const findOverflowingElement = (): HTMLElement | null => {
      const docWidth = document.documentElement.clientWidth;
      const all = document.querySelectorAll('*');
      for (const node of all) {
        const el = node as HTMLElement;
        const rect = el.getBoundingClientRect();
        if (rect.right > docWidth + 1) {
          return el;
        }
      }
      return null;
    };

    const check = () => {
      const el = document.documentElement;
      const hasScroll = el.scrollWidth > el.clientWidth + 1;
      if (hasScroll) {
        const culprit = findOverflowingElement();
        console.warn(
          '[UI] Horizontal scroll detected:',
          `diff=${el.scrollWidth - el.clientWidth}px`,
          culprit ? `\nCulprit: ${culprit.tagName}.${culprit.className}` : ''
        );
        if (culprit) {
          console.warn('[UI] Culprit element:', culprit);
        }
      }
    };
    check();
    // Check after DOM updates
    const observer = new MutationObserver(() => setTimeout(check, 100));
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', check);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', check);
    };
  }, []);

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

  return (
    <AppLogContext.Provider value={appLogValue}>
      <SidebarProvider open={sidebarOpen} onOpenChange={handleOpenChange}>
        {/* Shell: sidebar + contingut (header+main) en flex horitzontal */}
        <div className="flex h-screen overflow-hidden">
          <Sidebar collapsible="icon">
            <DashboardSidebarContent />
          </Sidebar>
          <SidebarInset className="flex min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out">
            {/* Header DINS SidebarInset: alineat amb el contingut */}
            <DashboardHeader />
            <main className="min-w-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>

      {/* FAB rail: stack vertical de botons flotants a baix-dreta */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <ProductUpdatesFab />
        <LogPanel />
      </div>
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
