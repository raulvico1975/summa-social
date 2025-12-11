'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { Loader2, Building2, AlertCircle } from 'lucide-react';
import type { Organization } from '@/lib/data';

export default function OrgLoginPage() {
  const router = useRouter();
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [organization, setOrganization] = React.useState<Organization | null>(null);
  const [isLoadingOrg, setIsLoadingOrg] = React.useState(true);
  const [orgNotFound, setOrgNotFound] = React.useState(false);

  // Carregar informació de l'organització pel slug
  React.useEffect(() => {
    const loadOrganization = async () => {
      if (!orgSlug) return;

      try {
        // Primer, buscar a la col·lecció /slugs
        const slugRef = doc(firestore, 'slugs', orgSlug);
        const slugSnap = await getDoc(slugRef);

        if (slugSnap.exists()) {
          const slugData = slugSnap.data();
          const orgRef = doc(firestore, 'organizations', slugData.orgId);
          const orgSnap = await getDoc(orgRef);

          if (orgSnap.exists()) {
            setOrganization({ id: orgSnap.id, ...orgSnap.data() } as Organization);
            setIsLoadingOrg(false);
            return;
          }
        }

        // Fallback: buscar directament per slug a organizations
        const orgsQuery = query(
          collection(firestore, 'organizations'),
          where('slug', '==', orgSlug),
          limit(1)
        );
        const orgsSnap = await getDocs(orgsQuery);

        if (!orgsSnap.empty) {
          const orgDoc = orgsSnap.docs[0];
          setOrganization({ id: orgDoc.id, ...orgDoc.data() } as Organization);
        } else {
          setOrgNotFound(true);
        }
      } catch (err) {
        console.error('Error loading organization:', err);
        setOrgNotFound(true);
      } finally {
        setIsLoadingOrg(false);
      }
    };

    loadOrganization();
  }, [orgSlug, firestore]);

  // Si l'usuari ja està autenticat, redirigir al dashboard
  React.useEffect(() => {
    if (user && !isUserLoading && organization) {
      router.push(`/${orgSlug}/dashboard`);
    }
  }, [user, isUserLoading, organization, orgSlug, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setError('');
    setIsLoggingIn(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);

      toast({
        title: 'Sesión iniciada',
        description: 'Bienvenido de nuevo',
      });

      router.push(`/${orgSlug}/dashboard`);
    } catch (err: any) {
      console.error('Error de login:', err);
      setIsLoggingIn(false);

      let friendlyError = 'Error al iniciar sesión';
      switch (err.code) {
        case 'auth/invalid-email':
          friendlyError = 'El correo electrónico no es válido';
          break;
        case 'auth/user-not-found':
          friendlyError = 'No existe ningún usuario con este correo';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          friendlyError = 'Contraseña incorrecta';
          break;
        case 'auth/too-many-requests':
          friendlyError = 'Demasiados intentos. Espera unos minutos';
          break;
        default:
          friendlyError = err.message || friendlyError;
      }
      setError(friendlyError);
      toast({ variant: 'destructive', title: 'Error', description: friendlyError });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // Loading state
  if (isUserLoading || isLoadingOrg) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Cargando...</p>
      </main>
    );
  }

  // Organització no trobada
  if (orgNotFound) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <div className="w-full max-w-md flex flex-col items-center gap-6 text-center">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Organización no encontrada
            </h1>
            <p className="text-muted-foreground">
              No existe ninguna organización con la URL <span className="font-mono text-primary">{orgSlug}</span>
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push('/')}>
            Volver al inicio
          </Button>
        </div>
      </main>
    );
  }

  // Si l'usuari ja està autenticat, mostrar loading mentre redirigeix
  if (user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirigiendo...</p>
      </main>
    );
  }

  // Formulari de login
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm flex flex-col items-center gap-6 text-center">
        <Logo className="h-16 w-16 text-primary" />

        {/* Nom de l'organització */}
        {organization && (
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-4 py-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{organization.name}</span>
          </div>
        )}

        <div>
          <h1 className="text-2xl font-bold tracking-tight">Iniciar sesión</h1>
          <p className="text-muted-foreground mt-2">
            Accede a tu cuenta para continuar
          </p>
        </div>

        <div className="w-full space-y-4 text-left">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError('');
              }}
              onKeyPress={handleKeyPress}
              placeholder="nombre@ejemplo.com"
              disabled={isLoggingIn}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
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
              Accediendo...
            </>
          ) : (
            'Acceder'
          )}
        </Button>
      </div>
    </main>
  );
}
