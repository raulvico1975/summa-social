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
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

export default function LoginPage() {
  const router = useRouter();
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const { t } = useTranslations();
  const { toast } = useToast();
  
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);

  const findUserOrganizationSlug = async (userId: string): Promise<string | null> => {
    try {
      // Primer, buscar si l'usuari té una organització per defecte
      const userProfileRef = doc(firestore, 'users', userId);
      const userProfileSnap = await getDoc(userProfileRef);
      
      let orgId: string | null = null;
      
      if (userProfileSnap.exists()) {
        const profileData = userProfileSnap.data();
        if (profileData.defaultOrganizationId) {
          orgId = profileData.defaultOrganizationId;
        }
      }

      // Si no té organització per defecte, buscar la primera on és membre
      if (!orgId) {
        const orgsRef = collection(firestore, 'organizations');
        const orgsSnapshot = await getDocs(orgsRef);
        
        for (const orgDocSnap of orgsSnapshot.docs) {
          const memberRef = doc(firestore, 'organizations', orgDocSnap.id, 'members', userId);
          const memberSnap = await getDoc(memberRef);
          if (memberSnap.exists()) {
            orgId = orgDocSnap.id;
            break;
          }
        }
      }

      // Obtenir el slug de l'organització
      if (orgId) {
        const orgRef = doc(firestore, 'organizations', orgId);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
          const orgData = orgSnap.data();
          return orgData.slug || null;
        }
      }

      return null;
    } catch (error) {
      console.error('Error finding organization:', error);
      return null;
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t.login.allFieldsRequired || 'Introdueix email i contrasenya');
      return;
    }

    setError('');
    setIsLoggingIn(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      toast({ 
        title: t.login.loginSuccess, 
        description: t.login.loginDescription 
      });

      // Buscar l'organització de l'usuari i redirigir
      const orgSlug = await findUserOrganizationSlug(userCredential.user.uid);
      
      if (orgSlug) {
        router.push(`/${orgSlug}/dashboard`);
      } else {
        // Si no té organització, redirigir al dashboard genèric
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Error de login:', err);
      setIsLoggingIn(false);
      
      let friendlyError = t.login.genericError;
      switch (err.code) {
        case 'auth/invalid-email':
          friendlyError = t.login.invalidEmail || 'L\'email no és vàlid';
          break;
        case 'auth/user-not-found':
          friendlyError = t.login.userNotFound || 'No existeix cap compte amb aquest email';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          friendlyError = t.login.wrongPassword || 'La contrasenya és incorrecta';
          break;
        case 'auth/too-many-requests':
          friendlyError = t.login.tooManyRequests || 'Massa intents. Espera uns minuts.';
          break;
        default:
          friendlyError = err.message || friendlyError;
      }
      setError(friendlyError);
      toast({ variant: 'destructive', title: t.common.error, description: friendlyError });
    }
  };

  // If user is already logged in, redirect to their organization
  React.useEffect(() => {
    const redirectIfLoggedIn = async () => {
      if (user && !isUserLoading) {
        const orgSlug = await findUserOrganizationSlug(user.uid);
        if (orgSlug) {
          router.push(`/${orgSlug}/dashboard`);
        } else {
          router.push('/dashboard');
        }
      }
    };
    
    redirectIfLoggedIn();
  }, [user, isUserLoading, router, firestore]);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  if (isUserLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Verificant sessió...</p>
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
