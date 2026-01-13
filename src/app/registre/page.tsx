'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Invitation, UserProfile, OrganizationMember } from '@/lib/data';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslations } from '@/i18n';

// 👇 AFEGIR AIXÒ per evitar el prerendering estàtic
export const dynamic = 'force-dynamic';

type PageState = 'loading' | 'invalid' | 'expired' | 'used' | 'ready' | 'registering' | 'success';

function RegistreContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const { t } = useTranslations();

  const [pageState, setPageState] = React.useState<PageState>('loading');
  const [invitation, setInvitation] = React.useState<Invitation | null>(null);
  const [orgSlug, setOrgSlug] = React.useState<string | null>(null);

  const [displayName, setDisplayName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [error, setError] = React.useState('');

  // Validar la invitació quan es carrega la pàgina
  React.useEffect(() => {
    const validateInvitation = async () => {
      if (!token || !firestore) {
        setPageState('invalid');
        return;
      }

      try {
        // Buscar la invitació pel token
        const invitationsRef = collection(firestore, 'invitations');
        const q = query(invitationsRef, where('token', '==', token));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setPageState('invalid');
          return;
        }

        const invitationDoc = querySnapshot.docs[0];
        const invitationData = { id: invitationDoc.id, ...invitationDoc.data() } as Invitation;

        // Comprovar si ja s'ha usat
        if (invitationData.usedAt) {
          setPageState('used');
          return;
        }

        // Comprovar si ha expirat
        const now = new Date();
        const expiresAt = new Date(invitationData.expiresAt);
        if (now > expiresAt) {
          setPageState('expired');
          return;
        }

        // Tot correcte!
        setInvitation(invitationData);

        // Carregar el slug de l'organització per l'enllaç d'inici de sessió
        try {
          const orgRef = doc(firestore, 'organizations', invitationData.organizationId);
          const orgSnap = await getDoc(orgRef);
          if (orgSnap.exists()) {
            const slug = orgSnap.data().slug;
            if (slug) {
              setOrgSlug(slug);
            }
          }
        } catch {
          // Si no podem carregar el slug, l'enllaç d'inici sessió mostrarà text alternatiu
        }

        // Si la invitació té un email específic, pre-omplir-lo
        if (invitationData.email) {
          setEmail(invitationData.email);
        }

        setPageState('ready');
      } catch (err) {
        console.error('Error validant invitació:', err);
        setPageState('invalid');
      }
    };

    validateInvitation();
  }, [token, firestore]);

  const handleRegister = async () => {
    // Validacions
    if (!displayName || !email || !password || !confirmPassword) {
      setError(t.register?.errors?.allFieldsRequired ?? 'Tots els camps són obligatoris');
      return;
    }

    if (password !== confirmPassword) {
      setError(t.register?.errors?.passwordMismatch ?? 'Les contrasenyes no coincideixen');
      return;
    }

    if (password.length < 6) {
      setError(t.register?.errors?.passwordTooShort ?? 'La contrasenya ha de tenir mínim 6 caràcters');
      return;
    }

    if (!invitation) {
      setError(t.register?.errors?.invalidInvitation ?? 'Invitació no vàlida');
      return;
    }

    // Si la invitació té email específic, validar que coincideix
    if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      setError((t.register?.errors?.emailMismatch ?? 'Aquesta invitació és només per a {email}').replace('{email}', invitation.email));
      return;
    }

    setError('');
    setPageState('registering');

    try {
      // 1. Crear l'usuari a Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Actualitzar el perfil amb el nom
      await updateProfile(user, { displayName });

      // 3. Crear el perfil d'usuari a Firestore
      const userProfile: UserProfile = {
        organizationId: invitation.organizationId,
        role: invitation.role,
        displayName: displayName,
      };
      await setDoc(doc(firestore, 'users', user.uid), userProfile);

      // 4. Afegir l'usuari com a membre de l'organització
      // IMPORTANT: invitationId és obligatori per validar a Firestore Rules
      const memberData: OrganizationMember = {
        userId: user.uid,
        email: email,
        displayName: displayName,
        role: invitation.role,
        joinedAt: new Date().toISOString(),
        invitationId: invitation.id,
      };
      await setDoc(
        doc(firestore, 'organizations', invitation.organizationId, 'members', user.uid),
        memberData
      );

      // 5. Marcar la invitació com a usada
      const invitationRef = doc(firestore, 'invitations', invitation.id);
      await updateDoc(invitationRef, {
        usedAt: new Date().toISOString(),
        usedBy: user.uid,
      });

      setPageState('success');

      toast({
        title: t.register?.success?.title ?? 'Compte creat!',
        description: (t.register?.success?.description ?? 'Benvingut/da a {org}').replace('{org}', invitation.organizationName),
      });

      // Obtenir el slug de l'organització per redirigir directament
      try {
        const orgRef = doc(firestore, 'organizations', invitation.organizationId);
        const orgSnap = await getDoc(orgRef);
        const slug = orgSnap.exists() ? orgSnap.data().slug : null;

        setTimeout(() => {
          if (slug) {
            // Redirecció directa a l'org (sense passar per redirect-to-org)
            router.push(`/${slug}/dashboard`);
          } else {
            // Fallback si no hi ha slug (no hauria de passar)
            router.push('/redirect-to-org?next=/dashboard');
          }
        }, 2000);
      } catch {
        // En cas d'error, usar el flux antic
        setTimeout(() => {
          router.push('/redirect-to-org?next=/dashboard');
        }, 2000);
      }

    } catch (err: any) {
      console.error('Error en el registre:', err);
      setPageState('ready');

      switch (err.code) {
        case 'auth/email-already-in-use':
          // Redirigir a login amb la invitació per acceptar-la amb el compte existent
          if (orgSlug && token) {
            toast({
              title: t.register?.errors?.existingAccount ?? 'Compte existent',
              description: t.register?.errors?.redirectingLogin ?? 'Redirigint per iniciar sessió i acceptar la invitació...',
            });
            router.push(`/${orgSlug}/login?inviteToken=${token}&next=/${orgSlug}/dashboard`);
          } else {
            setError(t.register?.errors?.emailInUse ?? 'Aquest email ja està registrat. Inicia sessió per acceptar la invitació.');
          }
          break;
        case 'auth/invalid-email':
          setError(t.register?.errors?.invalidEmail ?? "L'email no és vàlid");
          break;
        case 'auth/weak-password':
          setError(t.register?.errors?.weakPassword ?? 'La contrasenya és massa feble');
          break;
        default:
          setError(t.register?.errors?.genericError ?? 'Error creant el compte. Torna-ho a provar.');
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleRegister();
    }
  };

  // Renderitzar segons l'estat
  if (pageState === 'loading') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">{t.register?.loading?.validating ?? 'Validant invitació...'}</p>
      </main>
    );
  }

  if (pageState === 'invalid') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">{t.register?.invalid?.title ?? 'Invitació no vàlida'}</CardTitle>
            <CardDescription>
              {t.register?.invalid?.description ?? "L'enllaç d'invitació no és vàlid o no existeix."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              {t.register?.buttons?.goHome ?? "Anar a l'inici"}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (pageState === 'expired') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-orange-500" />
            <CardTitle className="mt-4">{t.register?.expired?.title ?? 'Invitació expirada'}</CardTitle>
            <CardDescription>
              {t.register?.expired?.description ?? "Aquesta invitació ha caducat. Contacta amb l'administrador per obtenir una nova."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              {t.register?.buttons?.goHome ?? "Anar a l'inici"}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (pageState === 'used') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-orange-500" />
            <CardTitle className="mt-4">{t.register?.used?.title ?? 'Invitació ja utilitzada'}</CardTitle>
            <CardDescription>
              {t.register?.used?.description ?? "Aquesta invitació ja s'ha utilitzat. Si ja tens compte, inicia sessió."}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              {t.register?.buttons?.login ?? 'Iniciar sessió'}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  if (pageState === 'success') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-green-500" />
            <CardTitle className="mt-4">{t.register?.success?.titleFull ?? 'Compte creat correctament!'}</CardTitle>
            <CardDescription>
              {(t.register?.success?.redirecting ?? 'Benvingut/da a {org}. Redirigint al panell...').replace('{org}', invitation?.organizationName ?? '')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </main>
    );
  }

  // Formulari de registre (pageState === 'ready' o 'registering')
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex flex-col items-center gap-6">
        <Logo className="h-16 w-16 text-primary" />
        
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle>{t.register?.form?.title ?? 'Crear compte'}</CardTitle>
            <CardDescription>
              {(t.register?.form?.invitedTo ?? "Has estat convidat a unir-te a {org}").replace('{org}', '')} <strong>{invitation?.organizationName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="displayName">{t.register?.form?.displayName ?? 'Nom complet'}</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.register?.form?.displayNamePlaceholder ?? 'El teu nom'}
                disabled={pageState === 'registering'}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">{t.register?.form?.email ?? 'Email'}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.register?.form?.emailPlaceholder ?? 'nom@exemple.com'}
                disabled={pageState === 'registering' || !!invitation?.email}
              />
              {invitation?.email && (
                <p className="text-xs text-muted-foreground">
                  {t.register?.form?.emailRestricted ?? 'Aquesta invitació és específica per aquest email'}
                </p>
              )}
            </div>

            {/* Contrasenya */}
            <div className="space-y-2">
              <Label htmlFor="password">{t.register?.form?.password ?? 'Contrasenya'}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.register?.form?.passwordPlaceholder ?? 'Mínim 6 caràcters'}
                disabled={pageState === 'registering'}
              />
            </div>

            {/* Confirmar contrasenya */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t.register?.form?.confirmPassword ?? 'Confirmar contrasenya'}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t.register?.form?.confirmPasswordPlaceholder ?? 'Repeteix la contrasenya'}
                disabled={pageState === 'registering'}
              />
            </div>

            {/* Missatge d'error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t.register?.form?.error ?? 'Error'}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Info del rol */}
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                {(t.register?.form?.roleInfo ?? "Seràs afegit com a {role} de l'organització.").replace('{role}', invitation?.role ?? '')}
              </p>
            </div>

            {/* Clàusula informativa de privacitat */}
            <p className="text-xs text-muted-foreground text-center">
              {t.register?.privacyNotice ?? 'En registrar-te, declares que has llegit la'}{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                {t.register?.privacyLink ?? 'Política de privacitat'}
              </a>.
            </p>

            {/* Botó de registre */}
            <Button
              onClick={handleRegister}
              className="w-full"
              disabled={pageState === 'registering'}
            >
              {pageState === 'registering' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.register?.buttons?.creating ?? 'Creant compte...'}
                </>
              ) : (
                t.register?.buttons?.createAccount ?? 'Crear compte'
              )}
            </Button>

            {/* Enllaç a login */}
            <p className="text-center text-sm text-muted-foreground">
              {t.register?.form?.haveAccount ?? 'Ja tens compte?'}{' '}
              {orgSlug ? (
                <a
                  href={`/${orgSlug}/login?inviteToken=${token}&next=/${orgSlug}/dashboard`}
                  className="text-primary hover:underline"
                >
                  {t.register?.buttons?.login ?? 'Inicia sessió'}
                </a>
              ) : (
                <span className="text-muted-foreground">
                  {t.register?.buttons?.loginAtOrg ?? 'Inicia sessió a la teva organització.'}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function RegistrePage() {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }>
        <RegistreContent />
      </Suspense>
    );
}
