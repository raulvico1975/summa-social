
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useFirebase, initiateAnonymousSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';

// Contraseña simple para el acceso en desarrollo
const DEV_PASSWORD = 'summa';

export default function LoginPage() {
  const router = useRouter();
  const { auth, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = () => {
    if (password === DEV_PASSWORD) {
      setError('');
      setIsLoggingIn(true);
      toast({ title: 'Contraseña correcta', description: 'Iniciando sesión anónima en Firebase...' });
      initiateAnonymousSignIn(auth);
      // The onAuthStateChanged listener in FirebaseProvider will handle the redirect
    } else {
      setError('Contrasenya incorrecta.');
      setIsLoggingIn(false);
    }
  };

  React.useEffect(() => {
    // If there's a user and the login process has started, redirect to dashboard
    if (user && isLoggingIn) {
      router.push('/dashboard');
    }
  }, [user, isLoggingIn, router]);


  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <Logo className="h-16 w-16 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">Bienvenido a Summa Social</h1>
          <p className="text-muted-foreground mt-2">
            Introduce la contraseña de acceso para continuar. (v1.1 - Firestore activado)
          </p>
        </div>
        
        <div className="w-full space-y-2 text-left">
          <Label htmlFor="password">Contraseña</Label>
          <Input 
            type="password" 
            id="password" 
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            onKeyPress={handleKeyPress}
            placeholder="••••••••"
            disabled={isLoggingIn || isUserLoading}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <Button onClick={handleLogin} className="w-full" disabled={isLoggingIn || isUserLoading}>
          {isLoggingIn || isUserLoading ? 'Accediendo...' : 'Acceder al Panel de Control'}
        </Button>
      </div>
    </main>
  );
}
