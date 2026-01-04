'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { Loader2, Building2, AlertCircle, Clock } from 'lucide-react';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';
import type { Invitation, OrganizationMember, UserProfile } from '@/lib/data';

interface OrgInfo {
  id: string;
  name: string;
  slug: string;
}

function OrgLoginContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const orgSlug = params.orgSlug as string;
  const reason = searchParams.get('reason');
  const nextPath = searchParams.get('next');
  const inviteToken = searchParams.get('inviteToken');
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  // DEMO: Bypass per /demo/login — no cal carregar org abans de login
  const isDemoLogin = isDemoEnv() && orgSlug === 'demo';

  const [organization, setOrganization] = React.useState<OrgInfo | null>(
    // En DEMO, crear org dummy per evitar fetch a Firestore
    isDemoLogin ? { id: 'demo-org', name: 'Demo', slug: 'demo' } : null
  );
  const [isLoadingOrg, setIsLoadingOrg] = React.useState(!isDemoLogin);
  const [orgNotFound, setOrgNotFound] = React.useState(false);

  // Carregar informació de l'organització pel slug
  // DEMO: Skip si és /demo/login (ja tenim org dummy)
  React.useEffect(() => {
    // DEMO: No carregar org, ja tenim dummy
    if (isDemoLogin) return;

    const loadOrganization = async () => {
      if (!orgSlug) return;

      try {
        const slugRef = doc(firestore, 'slugs', orgSlug);
        const slugSnap = await getDoc(slugRef);

        if (slugSnap.exists()) {
          const slugData = slugSnap.data();
          setOrganization({
            id: slugData.orgId,
            name: slugData.orgName || 'Organización',
            slug: orgSlug
          });
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
  }, [orgSlug, firestore, isDemoLogin]);

  // Si l'usuari ja està autenticat, redirigir al dashboard (o nextPath si ve de inactivitat)
  React.useEffect(() => {
    if (user && !isUserLoading && organization) {
      const destination = nextPath || `/${orgSlug}/dashboard`;
      router.push(destination);
    }
  }, [user, isUserLoading, organization, orgSlug, router, nextPath]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Todos los campos son obligatorios');
      return;
    }

    setError('');
    setIsLoggingIn(true);

    try {
      // Configurar persistència local per mantenir sessió entre pestanyes
      await setPersistence(auth, browserLocalPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      // Si hi ha inviteToken, completar l'acceptació de la invitació
      if (inviteToken && organization) {
        try {
          // Buscar la invitació pel token
          const invitationsRef = collection(firestore, 'invitations');
          const q = query(invitationsRef, where('token', '==', inviteToken));
          const querySnapshot = await getDocs(q);

          if (!querySnapshot.empty) {
            const invitationDoc = querySnapshot.docs[0];
            const invitationData = { id: invitationDoc.id, ...invitationDoc.data() } as Invitation;

            // Verificar que la invitació és per aquesta organització i no ha estat usada
            if (
              invitationData.organizationId === organization.id &&
              !invitationData.usedAt
            ) {
              // Verificar si l'usuari ja és membre
              const memberRef = doc(
                firestore,
                'organizations',
                organization.id,
                'members',
                loggedInUser.uid
              );
              const memberSnap = await getDoc(memberRef);

              if (!memberSnap.exists()) {
                // Afegir l'usuari com a membre
                const memberData: OrganizationMember = {
                  userId: loggedInUser.uid,
                  email: loggedInUser.email || email,
                  displayName: loggedInUser.displayName || email.split('@')[0],
                  role: invitationData.role,
                  joinedAt: new Date().toISOString(),
                  invitedBy: invitationData.createdBy,
                };
                await setDoc(memberRef, memberData);

                // Actualitzar el perfil d'usuari si no té organització
                const userProfileRef = doc(firestore, 'users', loggedInUser.uid);
                const userProfileSnap = await getDoc(userProfileRef);
                if (!userProfileSnap.exists()) {
                  const userProfile: UserProfile = {
                    organizationId: organization.id,
                    role: invitationData.role,
                    displayName: loggedInUser.displayName || email.split('@')[0],
                  };
                  await setDoc(userProfileRef, userProfile);
                }

                // Marcar la invitació com a usada
                const invitationRef = doc(firestore, 'invitations', invitationData.id);
                await updateDoc(invitationRef, {
                  usedAt: new Date().toISOString(),
                  usedBy: loggedInUser.uid,
                });

                toast({
                  title: 'Invitació acceptada!',
                  description: `T'has unit a ${organization.name}`,
                });
              }
            }
          }
        } catch (inviteErr) {
          // Si falla l'acceptació de la invitació, no bloquegem el login
          console.error('Error processant invitació:', inviteErr);
        }
      }

      toast({
        title: 'Sesión iniciada',
        description: 'Bienvenido de nuevo',
      });

      // Redirigir a nextPath si existeix, sinó al dashboard
      const destination = nextPath || `/${orgSlug}/dashboard`;
      router.push(destination);
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

        {/* Missatge de sessió tancada per inactivitat */}
        {reason === 'idle' && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-lg px-4 py-3 w-full">
            <Clock className="h-5 w-5 shrink-0" />
            <span className="text-sm">
              Sessió tancada per inactivitat. Torna a iniciar sessió per continuar.
            </span>
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

export default function OrgLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Cargando...</p>
        </main>
      }
    >
      <OrgLoginContent />
    </Suspense>
  );
}
