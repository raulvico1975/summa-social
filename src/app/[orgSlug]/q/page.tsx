// src/app/[orgSlug]/q/page.tsx
// Ruta curta per a Quick Expense: /{orgSlug}/q
// Dissenyat per guardar com a accés ràpid al mòbil

'use client';

import { QuickExpenseScreen } from '@/components/project-module/quick-expense-screen';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslations } from '@/i18n';

export default function QuickExpenseShortPage() {
  const { organizationId, userRole } = useCurrentOrganization();
  const { t } = useTranslations();

  // Textos i18n
  const q = t.projectModule?.quickExpense;

  // Bloquejar viewer
  if (userRole === 'viewer') {
    return (
      <div className="flex h-[100dvh] items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <AlertCircle className="h-12 w-12 text-muted-foreground" />
          <p className="font-semibold text-lg">
            {q?.noPermission ?? 'No tens permís'}
          </p>
          <p className="text-muted-foreground text-sm">
            {q?.noPermissionBody ?? "Demana accés a l'administració de l'entitat."}
          </p>
        </div>
      </div>
    );
  }

  // Validar organització
  if (!organizationId) {
    return (
      <div className="flex h-[100dvh] items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Carregant...</div>
      </div>
    );
  }

  return <QuickExpenseScreen organizationId={organizationId} isLandingMode />;
}
