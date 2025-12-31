'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { Loader2, ExternalLink, Mail, Clock } from 'lucide-react';
import { SUPPORT_EMAIL } from '@/lib/constants';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');
  const { user, isUserLoading } = useFirebase();

  // Si l'usuari ja està autenticat, redirigir a /redirect-to-org
  React.useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/redirect-to-org?next=/dashboard');
    }
  }, [user, isUserLoading, router]);

  // Loading state mentre verifica sessió
  if (isUserLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificant sessió...</p>
      </main>
    );
  }

  // Si l'usuari està autenticat, mostrar loading mentre redirigeix
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirigint...</p>
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
            <span className="text-sm">
              La teva sessió s&apos;ha tancat per inactivitat.
            </span>
          </div>
        )}

        {/* Títol i descripció */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Benvingut a Summa Social
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            Per accedir al tauler de la teva entitat, utilitza la URL que et van facilitar.
          </p>
        </div>

        {/* Exemple d'URL */}
        <div className="bg-muted/50 rounded-xl p-5 w-full space-y-3 border border-border/50">
          <p className="text-sm text-muted-foreground">
            L&apos;adreça té aquest format:
          </p>
          <p className="text-base font-mono bg-background rounded-lg px-4 py-2 border">
            <span className="text-muted-foreground">summasocial.app/</span>
            <span className="text-primary font-semibold">la-teva-entitat</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Si no la recordes, demana-la a l&apos;administrador de la teva organització.
          </p>
        </div>

        {/* Separador */}
        <div className="w-full flex items-center gap-4">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">o bé</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Opcions */}
        <div className="w-full space-y-3">
          <Button asChild variant="outline" className="w-full" size="lg">
            <a href="https://summasocial.app" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Visita el web de Summa Social
            </a>
          </Button>

          <Button asChild variant="ghost" className="w-full" size="lg">
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="mr-2 h-4 w-4" />
              Contacta amb nosaltres
            </a>
          </Button>
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground mt-4">
          Summa Social — Gestió econòmica i fiscal per a entitats
        </p>
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
