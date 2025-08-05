
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';

export default function LoginPage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <Logo className="h-16 w-16 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Bienvenido a Summa Social</h1>
          <p className="text-muted-foreground mt-2">
            La autenticación está desactivada temporalmente.
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard')}>
          Acceder al Panel de Control (Desarrollo)
        </Button>
         <p className="text-xs text-muted-foreground max-w-sm mt-4">
            Nota: El acceso al panel está habilitado sin autenticación. 
            El middleware de seguridad se ha reactivado para proteger las rutas, pero el flujo de login real está pendiente.
        </p>
      </div>
    </main>
  );
}
