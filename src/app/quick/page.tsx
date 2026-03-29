// src/app/quick/page.tsx
// Deep link per a Quick Expense: /quick → delega a /redirect-to-org
// Tota la lògica d'org queda centralitzada en un sol lloc.

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { Loader2 } from 'lucide-react';
import { useTranslations } from '@/i18n';

export default function QuickExpenseLandingPage() {
  const router = useRouter();
  const { user, isUserLoading } = useFirebase();
  const { t } = useTranslations();

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      // Si no hi ha usuari, anar a login amb retorn a /quick
      router.replace('/login?next=/quick');
    } else {
      // Delegar a redirect-to-org amb destí quick-expense
      router.replace('/redirect-to-org?next=/quick-expense');
    }
  }, [user, isUserLoading, router]);

  // Sempre mostrar loading (la redirecció és immediata)
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{t.common.loading}</p>
      </div>
    </div>
  );
}
