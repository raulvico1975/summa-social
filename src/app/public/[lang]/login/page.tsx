'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { Loader2, ExternalLink, Mail, Clock } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants';
import { isValidPublicLocale, type PublicLocale } from '@/lib/public-locale';
import { getPublicTranslations } from '@/i18n/public';

function LoginPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { user, isUserLoading } = useFirebase();

  // Obtenir l'idioma dels params
  const langParam = params.lang as string;
  const lang: PublicLocale = isValidPublicLocale(langParam) ? langParam : 'ca';
  const t = getPublicTranslations(lang);

  // Si l'usuari ja està autenticat, redirigir a /redirect-to-org preservant next
  const next = searchParams.get('next');
  React.useEffect(() => {
    if (user && !isUserLoading) {
      const redirectNext = next || '/dashboard';
      router.push(`/redirect-to-org?next=${encodeURIComponent(redirectNext)}`);
    }
  }, [user, isUserLoading, router, next]);

  // Loading state mentre verifica sessió
  if (isUserLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Si l'usuari està autenticat, mostrar loading mentre redirigeix
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Usuari NO autenticat: mostrar pàgina informativa amable
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-8 text-center">
        {/* Logo amb fons suau */}
        <div className="bg-primary/5 rounded-full p-6">
          <Logo className="h-20 w-20 text-primary" />
        </div>

        {/* Missatge de sessió tancada per inactivitat */}
        {reason === 'idle' && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-3 w-full">
            <Clock className="h-5 w-5 shrink-0" />
            <span className="text-sm">{t.login.sessionExpired}</span>
          </div>
        )}

        {/* Títol i descripció */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {t.login.welcomeTitle}
          </h1>
          <p className="text-muted-foreground leading-relaxed">{t.login.welcomeDescription}</p>
        </div>

        {/* Exemple d'URL */}
        <div className="bg-muted/50 rounded-xl p-5 w-full space-y-3 border border-border/50">
          <p className="text-sm text-muted-foreground">{t.login.urlFormatIntro}</p>
          <p className="text-base font-mono bg-background rounded-lg px-4 py-2 border">
            <span className="text-muted-foreground">summasocial.app/</span>
            <span className="text-primary font-semibold">{t.login.urlFormatExample}</span>
          </p>
          <p className="text-xs text-muted-foreground">{t.login.urlFormatHelp}</p>
        </div>

        {/* Separador */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">{t.login.orElse}</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Opcions */}
        <div className="w-full space-y-3">
          <Button asChild variant="outline" className="w-full" size="lg">
            <a href="https://summasocial.app" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              {t.login.visitWebsite}
            </a>
          </Button>

          <Button asChild variant="ghost" className="w-full" size="lg">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="mr-2 h-4 w-4" />
              {t.login.contactUs}
            </a>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground mt-4">{t.login.footer}</p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
