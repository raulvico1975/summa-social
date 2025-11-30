'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { auth, user, isUserLoading } = useFirebase();
  const { t } = useTranslations();
  const { toast } = useToast();
  
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = async () => {
    // Validació bàsica
    if (!email || !password) {
      setError(t.login.allFieldsRequired || 'Introdueix email i contrasenya');
      return;
    }

    setError('');
    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ 
        title: t.login.loginSuccess, 
        description: t.login.loginDescription 
      });
      // La redirecció es farà automàticament quan user canviï
    } catch (err: any) {
      console.error('Error de login:', err);
      setIsLoggingIn(false);
      
      // Missatges d'error amigables
      switch (err.code) {
        case 'auth/invalid-email':
          setError(t.login.invalidEmail || 'L\'email no és vàlid');
          break;
        case 'auth/user-not-found':
          setError(t.login.userNotFound || 'No existeix cap compte amb aquest email');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setError(t.login.wrongPassword || 'La contrasenya és incorrecta');
          break;
        case 'auth/too-many-requests':
          setError(t.login.tooManyRequests || 'Massa intents. Espera uns minuts.');
          break;
        default:
          setError(t.login.genericError || 'Error d\'autenticació. Torna-ho a provar.');
      }
    }
  };

  // Redirigir quan l'usuari estigui autenticat
  React.useEffect(() => {
    if (user && !isUserLoading) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // Si està carregant l'usuari, mostrar loading
  if (isUserLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  // Si ja hi ha usuari, no mostrar el formulari (es redirigirà)
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirigint...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <Logo className="h-16 w-16 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline">{t.login.welcome}</h1>
          <p className="text-muted-foreground mt-2">
            {t.login.prompt}
          </p>
        </div>
        
        <div className="w-full space-y-4 text-left">
          {/* Camp Email */}
          <div className="space-y-2">
            <Label htmlFor="email">{t.login.email || 'Email'}</Label>
            <Input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="nom@exemple.com"
              disabled={isLoggingIn}
              autoComplete="email"
            />
          </div>

          {/* Camp Password */}
          <div className="space-y-2">
            <Label htmlFor="password">{t.login.password}</Label>
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
              disabled={isLoggingIn}
              autoComplete="current-password"
            />
          </div>

          {/* Missatge d'error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 p-2 rounded-md">
              {error}
            </p>
          )}
        </div>

        <Button 
          onClick={handleLogin} 
          className="w-full" 
          disabled={isLoggingIn}
        >
          {isLoggingIn ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.login.accessing}
            </>
          ) : (
            t.login.access
          )}
        </Button>
      </div>
    </main>
  );
}
