// src/components/ErrorBoundaryGlobal.tsx
// Captura errors globals (window.onerror, unhandledrejection) i els envia a systemIncidents

'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { OrganizationContext } from '@/hooks/organization-provider';
import {
  reportSystemIncident,
  shouldIgnoreError,
} from '@/lib/system-incidents';

export function ErrorBoundaryGlobal({
  children,
}: {
  children: React.ReactNode;
}) {
  const { firestore, isUserLoading } = useFirebase();
  const pathname = usePathname();
  // useContext retorna undefined si no hi ha provider (no llança error)
  const org = React.useContext(OrganizationContext);
  const orgId = org?.organizationId;
  const orgSlug = org?.orgSlug;

  // Guardar referència estable per als handlers
  const contextRef = React.useRef({ firestore, pathname, orgId, orgSlug });
  React.useEffect(() => {
    contextRef.current = { firestore, pathname, orgId, orgSlug };
  }, [firestore, pathname, orgId, orgSlug]);

  React.useEffect(() => {
    // No activar fins que Firebase estigui llest
    if (isUserLoading || !firestore) return;

    // Handler per window.onerror (errors síncrons)
    const handleError = (event: ErrorEvent) => {
      const { message, filename, lineno, colno, error } = event;

      // Filtrar soroll
      if (shouldIgnoreError(message)) {
        return;
      }

      const { firestore: fs, pathname: route, orgId: oid, orgSlug: slug } = contextRef.current;
      if (!fs) return;

      reportSystemIncident({
        firestore: fs,
        type: 'CLIENT_CRASH',
        message: message || 'Unknown error',
        route: route || undefined,
        stack: error?.stack,
        orgId: oid || undefined,
        orgSlug: slug || undefined,
        meta: {
          filename,
          lineno,
          colno,
        },
      });
    };

    // Handler per unhandledrejection (promises rebutjades)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      let message = 'Unhandled Promise Rejection';
      let stack: string | undefined;

      if (reason instanceof Error) {
        message = reason.message;
        stack = reason.stack;
      } else if (typeof reason === 'string') {
        message = reason;
      }

      // Filtrar soroll
      if (shouldIgnoreError(message)) {
        return;
      }

      // Detectar errors de permisos de Firestore
      const isPermissionsError =
        message.includes('Missing or insufficient permissions') ||
        message.includes('permission-denied') ||
        message.includes('PERMISSION_DENIED');

      const { firestore: fs, pathname: route, orgId: oid, orgSlug: slug } = contextRef.current;
      if (!fs) return;

      reportSystemIncident({
        firestore: fs,
        type: isPermissionsError ? 'PERMISSIONS' : 'CLIENT_CRASH',
        message,
        route: route || undefined,
        stack,
        orgId: oid || undefined,
        orgSlug: slug || undefined,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, [firestore, isUserLoading]);

  return <>{children}</>;
}
