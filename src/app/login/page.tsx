'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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
        <p className="mt-4 text-muted-foreground">Verificando sesión...</p>
      </main>
    );
  }

  // Si l'usuari està autenticat, mostrar loading mentre redirigeix
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
      </main>
    );
  }

  // Usuari NO autenticat: mostrar missatge informatiu amb CTA
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
        <Logo className="h-16 w-16 text-primary" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Accedeix a la teva organització
          </h1>
          <p className="text-muted-foreground">
            Utilitza la URL de la teva entitat per accedir al tauler.
          </p>
        </div>

        {/* CTA principal */}
        <Button asChild size="lg" className="w-full">
          <Link href="/redirect-to-org?next=/dashboard">
            Entrar a la teva organització
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>

        <div className="bg-muted/50 rounded-lg p-4 w-full space-y-2">
          <p className="text-sm text-muted-foreground">
            Si ja tens la URL de la teva organització, pots usar-la directament:
          </p>
          <p className="text-sm font-mono text-primary">
            summasocial.app/
            <span className="text-muted-foreground">&lt;slug&gt;</span>
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Si no coneixes la URL de la teva organització, contacta amb l&apos;administrador de la teva entitat.
        </p>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mt-2"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tornar
        </Button>
      </div>
    </main>
  );
}
