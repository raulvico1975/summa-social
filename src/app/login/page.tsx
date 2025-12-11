'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { user, isUserLoading } = useFirebase();

  // Si l'usuari ja està autenticat, redirigir a /redirect-to-org
  React.useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/redirect-to-org');
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

  // Usuari NO autenticat: mostrar missatge informatiu
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
        <Logo className="h-16 w-16 text-primary" />

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">
            Para acceder, utiliza la URL de tu organización
          </h1>
          <p className="text-muted-foreground">
            Ejemplo: <span className="font-mono text-primary">summasocial.app/nombre-de-tu-org</span>
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 w-full">
          <p className="text-sm text-muted-foreground">
            Si no conoces la URL de tu organización, contacta con el administrador de tu entidad.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mt-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>
    </main>
  );
}
