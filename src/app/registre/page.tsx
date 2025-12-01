
'use client';

import * as React from 'react';
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

type PageState = 'loading' | 'invalid' | 'expired' | 'used' | 'ready' | 'registering' | 'success';

export default function RegistrePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  
  const [pageState, setPageState] = React.useState<PageState>('loading');
  const [invitation, setInvitation] = React.useState<Invitation | null>(null);
  
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
      setError('Tots els camps són obligatoris');
      return;
    }

    if (password !== confirmPassword) {
      setError('Les contrasenyes no coincideixen');
      return;
    }

    if (password.length < 6) {
      setError('La contrasenya ha de tenir mínim 6 caràcters');
      return;
    }

    if (!invitation) {
      setError('Invitació no vàlida');
      return;
    }

    // Si la invitació té email específic, validar que coincideix
    if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      setError(`Aquesta invitació és només per a ${invitation.email}`);
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
      const memberData: OrganizationMember = {
        userId: user.uid,
        email: email,
        displayName: displayName,
        role: invitation.role,
        joinedAt: new Date().toISOString(),
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
        title: 'Compte creat!',
        description: `Benvingut/da a ${invitation.organizationName}`,
      });

      // Redirigir al dashboard després de 2 segons
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: any) {
      console.error('Error en el registre:', err);
      setPageState('ready');
      
      switch (err.code) {
        case 'auth/email-already-in-use':
          setError('Aquest email ja està registrat. Prova d\'iniciar sessió.');
          break;
        case 'auth/invalid-email':
          setError('L\'email no és vàlid');
          break;
        case 'auth/weak-password':
          setError('La contrasenya és massa feble');
          break;
        default:
          setError('Error creant el compte. Torna-ho a provar.');
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
        <p className="mt-4 text-muted-foreground">Validant invitació...</p>
      </main>
    );
  }

  if (pageState === 'invalid') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
            <CardTitle className="mt-4">Invitació no vàlida</CardTitle>
            <CardDescription>
              L'enllaç d'invitació no és vàlid o no existeix.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              Anar a l'inici
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
            <CardTitle className="mt-4">Invitació expirada</CardTitle>
            <CardDescription>
              Aquesta invitació ha caducat. Contacta amb l'administrador per obtenir una nova.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              Anar a l'inici
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
            <CardTitle className="mt-4">Invitació ja utilitzada</CardTitle>
            <CardDescription>
              Aquesta invitació ja s'ha utilitzat. Si ja tens compte, inicia sessió.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => router.push('/')}>
              Iniciar sessió
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
            <CardTitle className="mt-4">Compte creat correctament!</CardTitle>
            <CardDescription>
              Benvingut/da a {invitation?.organizationName}. Redirigint al panell...
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
            <CardTitle>Crear compte</CardTitle>
            <CardDescription>
              Has estat convidat a unir-te a <strong>{invitation?.organizationName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Nom */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Nom complet</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="El teu nom"
                disabled={pageState === 'registering'}
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="nom@exemple.com"
                disabled={pageState === 'registering' || !!invitation?.email}
              />
              {invitation?.email && (
                <p className="text-xs text-muted-foreground">
                  Aquesta invitació és específica per aquest email
                </p>
              )}
            </div>

            {/* Contrasenya */}
            <div className="space-y-2">
              <Label htmlFor="password">Contrasenya</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Mínim 6 caràcters"
                disabled={pageState === 'registering'}
              />
            </div>

            {/* Confirmar contrasenya */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contrasenya</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Repeteix la contrasenya"
                disabled={pageState === 'registering'}
              />
            </div>

            {/* Missatge d'error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Info del rol */}
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p className="text-muted-foreground">
                Seràs afegit com a <strong>{invitation?.role}</strong> de l'organització.
              </p>
            </div>

            {/* Botó de registre */}
            <Button
              onClick={handleRegister}
              className="w-full"
              disabled={pageState === 'registering'}
            >
              {pageState === 'registering' ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creant compte...
                </>
              ) : (
                'Crear compte'
              )}
            </Button>

            {/* Enllaç a login */}
            <p className="text-center text-sm text-muted-foreground">
              Ja tens compte?{' '}
              <a href="/" className="text-primary hover:underline">
                Inicia sessió
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
