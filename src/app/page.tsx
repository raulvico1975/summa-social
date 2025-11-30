
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useFirebase, initiateAnonymousSignIn } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';

// Contraseña simple para el acceso en desarrollo
const DEV_PASSWORD = 'summa';

export default function LoginPage() {
  const router = useRouter();
  const { auth, user, isUserLoading } = useFirebase();
  const { t } = useTranslations();
  const { toast } = useToast();
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const handleLogin = () => {
    if (password === DEV_PASSWORD) {
      setError('');
      setIsLoggingIn(true);
      toast({ title: t.login.loginSuccess, description: t.login.loginDescription });
      initiateAnonymousSignIn(auth);
      // The onAuthStateChanged listener in FirebaseProvider will handle the redirect
    } else {
      setError(t.login.passwordIncorrect);
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
          <h1 className="text-3xl font-bold tracking-tight font-headline">{t.login.welcome}</h1>
          <p className="text-muted-foreground mt-2">
            {t.login.prompt}
          </p>
        </div>
        
        <div className="w-full space-y-2 text-left">
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
            disabled={isLoggingIn || isUserLoading}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <Button onClick={handleLogin} className="w-full" disabled={isLoggingIn || isUserLoading}>
          {isLoggingIn || isUserLoading ? t.login.accessing : t.login.access}
        </Button>
      </div>
    </main>
  );
}
