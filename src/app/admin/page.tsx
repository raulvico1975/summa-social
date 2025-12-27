
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, getCountFromServer } from 'firebase/firestore';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import type { Organization } from '@/lib/data';
import { SUPER_ADMIN_UID } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Shield,
  Building2,
  Users,
  Plus,
  MoreHorizontal,
  LogIn,
  Pause,
  Play,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Mail,
  ExternalLink,
  FileText,
  Lock,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CreateOrganizationDialog } from '@/components/admin/create-organization-dialog';
import { migrateExistingSlugs } from '@/lib/slugs';

export default function AdminPage() {
  const router = useRouter();
  const { user, firestore, auth, isUserLoading } = useFirebase();
  const { toast } = useToast();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [suspendDialogOrg, setSuspendDialogOrg] = React.useState<Organization | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);

  // Reset contrasenya
  const [resetEmail, setResetEmail] = React.useState('');
  const [isResetting, setIsResetting] = React.useState(false);

  // Login local
  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');

  // Verificar que és Super Admin
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  // Carregar totes les organitzacions
  const orgsQuery = useMemoFirebase(
    () => isSuperAdmin ? query(collection(firestore, 'organizations'), orderBy('createdAt', 'desc')) : null,
    [firestore, isSuperAdmin]
  );
  const { data: organizations, isLoading: orgsLoading } = useCollection<Organization>(orgsQuery);

  // Estadístiques
  const stats = React.useMemo(() => {
    if (!organizations) return { total: 0, active: 0, suspended: 0 };
    return {
      total: organizations.length,
      active: organizations.filter(o => o.status === 'active').length,
      suspended: organizations.filter(o => o.status === 'suspended').length,
    };
  }, [organizations]);

  // Handler login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      // El component es re-renderitzarà automàticament amb el nou user
    } catch (error: unknown) {
      console.error('Login error:', error);
      setLoginError('Credencials incorrectes');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEnterOrganization = (org: Organization) => {
    // Guardar l'organització seleccionada a sessionStorage per "impersonar"
    sessionStorage.setItem('adminViewingOrgId', org.id);
    router.push('/dashboard');
  };

  const handleToggleSuspend = async (org: Organization) => {
    setIsProcessing(true);
    try {
      const newStatus = org.status === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(firestore, 'organizations', org.id), {
        status: newStatus,
        ...(newStatus === 'suspended' ? { suspendedAt: new Date().toISOString() } : { suspendedAt: null, suspendedReason: null }),
        updatedAt: new Date().toISOString(),
      });
      toast({
        title: newStatus === 'suspended' ? 'Organització suspesa' : 'Organització reactivada',
        description: `${org.name} ara està ${newStatus === 'suspended' ? 'suspesa' : 'activa'}.`,
      });
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut actualitzar l\'organització.' });
    } finally {
      setIsProcessing(false);
      setSuspendDialogOrg(null);
    }
  };

  const handleMigrateSlugs = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateExistingSlugs(firestore);
      toast({
        title: 'Migració completada',
        description: `${result.migrated} organitzacions migrades. ${result.errors.length > 0 ? `Errors: ${result.errors.length}` : ''}`,
      });
      if (result.errors.length > 0) {
        console.error('Errors de migració:', result.errors);
      }
    } catch (error) {
      console.error('Error durant la migració:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut completar la migració.',
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!resetEmail.trim()) return;
    setIsResetting(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
    } catch (error) {
      // Silenciós: no revelar si l'email existeix o no
      console.error('Password reset error (silenced):', error);
    } finally {
      // Sempre mostrar missatge genèric d'èxit
      toast({
        title: 'Correu enviat',
        description: 'Si l\'adreça existeix, rebrà un correu per restablir la contrasenya.',
      });
      setResetEmail('');
      setIsResetting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: Organization['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Activa</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspesa</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pendent</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Loading state
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No autenticat - mostrar login
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Panell SuperAdmin</CardTitle>
            <CardDescription>Accés restringit</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@exemple.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  disabled={isLoggingIn}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contrasenya</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                />
              </div>
              {loginError && (
                <p className="text-sm text-destructive">{loginError}</p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoggingIn || !loginEmail.trim() || !loginPassword}
              >
                {isLoggingIn ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="mr-2 h-4 w-4" />
                )}
                Entrar
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Autenticat però no és SuperAdmin
  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">Accés denegat</h1>
        <p className="text-muted-foreground">No tens permisos per accedir al panell d'administració.</p>
        <Button onClick={() => router.push('/dashboard')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Tornar al dashboard
        </Button>
      </div>
    );
  }

  // Carregant organitzacions
  if (orgsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Panell de Super Admin</h1>
                <p className="text-sm text-muted-foreground">Gestió de Summa Social</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleMigrateSlugs} disabled={isMigrating}>
                {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Migrar slugs
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova organització
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Estadístiques */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Organitzacions</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Actives</CardTitle>
              <Play className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Suspeses</CardTitle>
              <Pause className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.suspended}</div>
            </CardContent>
          </Card>
        </div>

        {/* Eines d'administració */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Reset contrasenya */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4" />
                Reset contrasenya
              </CardTitle>
              <CardDescription>
                Envia un correu per restablir la contrasenya d'un usuari
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="email@exemple.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  disabled={isResetting}
                />
                <Button
                  onClick={handlePasswordReset}
                  disabled={isResetting || !resetEmail.trim()}
                >
                  {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar correu
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Diagnòstic */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Diagnòstic
              </CardTitle>
              <CardDescription>
                Si estàs perdut o hi ha una incidència, comença pel manual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <a
                  href="https://console.firebase.google.com/project/summa-social/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Firebase Console
                </a>
                <a
                  href="https://console.cloud.google.com/logs/query?project=summa-social"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  Cloud Logging
                </a>
                <span
                  className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                  onClick={() => {
                    navigator.clipboard.writeText('docs/DEV-SOLO-MANUAL.md');
                    toast({ title: 'Copiat al porta-retalls' });
                  }}
                >
                  <FileText className="h-4 w-4" />
                  <code className="text-xs bg-muted px-1 rounded">docs/DEV-SOLO-MANUAL.md</code>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Llista d'organitzacions */}
        <Card>
          <CardHeader>
            <CardTitle>Organitzacions</CardTitle>
            <CardDescription>
              Gestiona totes les organitzacions registrades a Summa Social
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organització</TableHead>
                  <TableHead>CIF</TableHead>
                  <TableHead>Estat</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="w-[100px]">Accions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations && organizations.length > 0 ? (
                  organizations.map((org) => (
                    <TableRow key={org.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-xs text-muted-foreground">{org.slug}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{org.taxId}</TableCell>
                      <TableCell>{getStatusBadge(org.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(org.createdAt)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEnterOrganization(org)}>
                              <LogIn className="mr-2 h-4 w-4" />
                              Entrar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => setSuspendDialogOrg(org)}
                              className={org.status === 'suspended' ? 'text-green-600' : 'text-destructive'}
                            >
                              {org.status === 'suspended' ? (
                                <>
                                  <Play className="mr-2 h-4 w-4" />
                                  Reactivar
                                </>
                              ) : (
                                <>
                                  <Pause className="mr-2 h-4 w-4" />
                                  Suspendre
                                </>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                      No hi ha organitzacions. Crea'n una per començar.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Diàleg crear organització */}
      <CreateOrganizationDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />

      {/* Diàleg confirmar suspensió */}
      <AlertDialog open={!!suspendDialogOrg} onOpenChange={() => setSuspendDialogOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendDialogOrg?.status === 'suspended' ? 'Reactivar organització?' : 'Suspendre organització?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendDialogOrg?.status === 'suspended' 
                ? `L'organització "${suspendDialogOrg?.name}" tornarà a estar activa i els seus membres podran accedir-hi.`
                : `L'organització "${suspendDialogOrg?.name}" quedarà suspesa i els seus membres no podran accedir-hi.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => suspendDialogOrg && handleToggleSuspend(suspendDialogOrg)}
              disabled={isProcessing}
              className={suspendDialogOrg?.status === 'suspended' ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {suspendDialogOrg?.status === 'suspended' ? 'Reactivar' : 'Suspendre'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
