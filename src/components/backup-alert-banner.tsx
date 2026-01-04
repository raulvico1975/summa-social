'use client';

import * as React from 'react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Cloud, AlertTriangle } from 'lucide-react';
import { useFirebase, useDoc } from '@/firebase';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { doc } from 'firebase/firestore';
import type { BackupIntegration } from '@/lib/backups/types';

/**
 * Banner suau que mostra un avís quan el backup automàtic no està configurat.
 * Es mostra si status !== 'connected'.
 * No té dismiss permanent (no ACK).
 */
export function BackupAlertBanner() {
  const { firestore } = useFirebase();
  const { organizationId, userRole } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  const { t } = useTranslations();

  // Només admins veuen el banner
  const isAdmin = userRole === 'admin';

  // Ref memoitzada per al document d'integració
  const backupDocRef = React.useMemo(() => {
    if (!firestore || !organizationId) return null;
    return doc(firestore, `organizations/${organizationId}/integrations/backup`);
  }, [firestore, organizationId]);

  // Subscripció realtime al document
  const { data: backupData, isLoading } = useDoc<BackupIntegration>(backupDocRef);

  // No mostrar res mentre carrega o si no és admin
  if (isLoading || !isAdmin) {
    return null;
  }

  // Si no hi ha document o status !== 'connected', mostrar banner
  const isConnected = backupData?.status === 'connected';

  if (isConnected) {
    return null;
  }

  return (
    <Alert variant="default" className="border-amber-200 bg-amber-50/50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <span className="text-sm text-amber-800">
          {t.settings.backups.alertBannerText}
        </span>
        <Link href={buildUrl('/dashboard/configuracion#backups')}>
          <Button variant="outline" size="sm" className="whitespace-nowrap">
            <Cloud className="h-4 w-4 mr-2" />
            {t.settings.backups.alertBannerCta}
          </Button>
        </Link>
      </AlertDescription>
    </Alert>
  );
}
