// src/app/[orgSlug]/dashboard/project-module/quick-expense/page.tsx
// Captura ultra-ràpida de despeses (<10s): foto + import + guardar
// Rols permesos: admin, user. Viewer: bloquejat amb missatge.

'use client';

import { QuickExpenseScreen } from '@/components/project-module/quick-expense-screen';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { Button } from '@/components/ui/button';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useOrgUrl } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';

export default function QuickExpensePage() {
  const { organizationId, userRole } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  const { t } = useTranslations();

  // Bloquejar viewer
  if (userRole === 'viewer') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="font-semibold text-lg">
            {t.projectModule?.quickExpense?.noPermission ?? 'No tens permís'}
          </p>
          <p className="text-muted-foreground text-sm">
            {t.projectModule?.quickExpense?.noPermissionBody ?? "Demana accés a l'administració de l'entitat."}
          </p>
          <Link href={buildUrl('/project-module')}>
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.common?.back ?? 'Tornar'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Validar organització
  if (!organizationId) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Carregant...</div>
      </div>
    );
  }

  return <QuickExpenseScreen organizationId={organizationId} />;
}
