
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import type { Organization } from '@/lib/data';
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
  History,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Settings,
  Info,
  Download,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CreateOrganizationDialog } from '@/components/admin/create-organization-dialog';
import { SystemHealth } from '@/components/admin/system-health';
import { ProductUpdatesSection } from '@/components/admin/product-updates-section';
import { I18nManager } from '@/components/super-admin/i18n-manager';
import { SuperAdminsManager } from '@/components/admin/super-admins-manager';
import { AdminSection } from '@/components/admin/admin-section';
import { AdminNav } from '@/components/admin/admin-nav';
import { migrateExistingSlugs } from '@/lib/slugs';
import { logAdminAction, getRecentAuditLogs, formatAuditAction, type AdminAuditLog } from '@/lib/admin-audit';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';
import { isAllowlistedSuperAdmin } from '@/lib/admin/superadmin-allowlist';
import { ensureSuperAdminRegistry } from '@/lib/admin/ensure-superadmin-registry';

export default function AdminPage() {
  const router = useRouter();
  const { user, firestore, auth, isUserLoading } = useFirebase();
  const { toast } = useToast();

  // ─────────────────────────────────────────────────────────────────────────────
  // GUARD: Verificació SuperAdmin via allowlist d'emails
  // Si és allowlisted, autoalinea el registre Firestore
  // ─────────────────────────────────────────────────────────────────────────────
  const [isSuperAdmin, setIsSuperAdmin] = React.useState<boolean | null>(null);
  const [superAdminCheckDone, setSuperAdminCheckDone] = React.useState(false);
  const [registryError, setRegistryError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Reset quan canvia l'usuari
    if (!user) {
      setIsSuperAdmin(null);
      setSuperAdminCheckDone(false);
      setRegistryError(null);
      return;
    }

    // Verificar allowlist per email
    const isAllowed = isAllowlistedSuperAdmin(user.email);

    if (!isAllowed) {
      // No és allowlisted → accés denegat
      setIsSuperAdmin(false);
      setSuperAdminCheckDone(true);
      return;
    }

    // És allowlisted → assegurar registre Firestore i donar accés
    const setupAccess = async () => {
      try {
        const result = await ensureSuperAdminRegistry(firestore, user.uid, user.email!);
        if (!result.success) {
          // Error creant/verificant registre (pot ser permisos)
          setRegistryError(result.error || 'No s\'ha pogut preparar l\'accés');
          // Encara donem accés UI perquè és allowlisted
          console.warn('[admin] Error alineant registre, però allowlisted:', result.error);
        }
        setIsSuperAdmin(true);
      } catch (error) {
        console.error('[admin] Error inesperat:', error);
        setRegistryError((error as Error).message);
        // Donem accés UI igualment perquè és allowlisted
        setIsSuperAdmin(true);
      } finally {
        setSuperAdminCheckDone(true);
      }
    };

    setupAccess();
  }, [user, firestore]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Estats locals (només s'usen si isSuperAdmin === true)
  // ─────────────────────────────────────────────────────────────────────────────
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

  // Audit logs
  const [auditLogs, setAuditLogs] = React.useState<AdminAuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = React.useState(false);

  // Demo seed
  const [isSeedingDemo, setIsSeedingDemo] = React.useState(false);
  const [seedResult, setSeedResult] = React.useState<{ ok: boolean; demoMode?: string; counts?: Record<string, number>; error?: string } | null>(null);
  const [showSeedConfirm, setShowSeedConfirm] = React.useState(false);
  const [selectedDemoMode, setSelectedDemoMode] = React.useState<'short' | 'work'>('short');

  // Backup local
  const [backupOrgId, setBackupOrgId] = React.useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Carregar dades (només si és SuperAdmin confirmat)
  // ─────────────────────────────────────────────────────────────────────────────
  const canLoadData = isSuperAdmin === true;
  const orgsQuery = useMemoFirebase(
    () => canLoadData ? query(collection(firestore, 'organizations'), orderBy('createdAt', 'desc')) : null,
    [firestore, canLoadData]
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

  // Carregar audit logs quan l'usuari és SuperAdmin confirmat
  React.useEffect(() => {
    if (isSuperAdmin !== true) return;
    setIsLoadingAudit(true);
    getRecentAuditLogs(firestore, 15)
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setIsLoadingAudit(false));
  }, [firestore, isSuperAdmin]);

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
      // Audit log (best-effort)
      logAdminAction(
        firestore,
        newStatus === 'suspended' ? 'SUSPEND_ORG' : 'REACTIVATE_ORG',
        user!.uid,
        org.slug || org.id
      );

      toast({
        title: newStatus === 'suspended' ? 'Organització suspesa' : 'Organització reactivada',
        description: `${org.name} ara està ${newStatus === 'suspended' ? 'suspesa' : 'activa'}.`,
      });

      // Refrescar audit logs
      getRecentAuditLogs(firestore, 15).then(setAuditLogs).catch(console.error);
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
      // Audit log (best-effort, sempre, no revela si email existeix)
      logAdminAction(firestore, 'RESET_PASSWORD_SENT', user!.uid, resetEmail.trim());
      // Refrescar audit logs
      getRecentAuditLogs(firestore, 15).then(setAuditLogs).catch(console.error);
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

  // Handler regenerar demo (executa després de confirmació)
  const executeRegenerateDemo = async () => {
    if (!user) return;
    setShowSeedConfirm(false);
    setIsSeedingDemo(true);
    setSeedResult(null);

    try {
      // Obtenir ID Token per auth segura (no header falsificable)
      const idToken = await user.getIdToken();

      const response = await fetch('/api/internal/demo/seed', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ demoMode: selectedDemoMode }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setSeedResult({ ok: true, demoMode: data.demoMode, counts: data.counts });
        toast({
          title: 'Demo regenerada',
          description: `Mode: ${data.demoMode}. Dades creades: ${Object.entries(data.counts || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}`,
        });
      } else {
        setSeedResult({ ok: false, error: data.error || 'Error desconegut' });
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'No s\'ha pogut regenerar la demo',
        });
      }
    } catch (error) {
      console.error('Error regenerant demo:', error);
      setSeedResult({ ok: false, error: (error as Error).message });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error de connexió regenerant la demo',
      });
    } finally {
      setIsSeedingDemo(false);
    }
  };

  // Obre diàleg de confirmació
  const handleRegenerateDemo = () => {
    setShowSeedConfirm(true);
  };

  // Handler per descarregar backup local d'una org
  const handleDownloadBackup = async (orgId: string, orgName: string) => {
    if (!user) return;
    setBackupOrgId(orgId);

    try {
      const idToken = await user.getIdToken();

      const response = await fetch(`/api/admin/orgs/${orgId}/backup/local`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error descarregant backup');
      }

      // Obtenir filename del header Content-Disposition
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `backup_${orgId}.json`;

      // Crear blob i descarregar
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: 'Backup descarregat',
        description: `S'ha descarregat el backup de ${orgName}.`,
      });
    } catch (error) {
      console.error('Error descarregant backup:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: (error as Error).message || 'No s\'ha pogut descarregar el backup.',
      });
    } finally {
      setBackupOrgId(null);
    }
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

  // Handler logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logout:', error);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDERS CONDICIONALS (ordre important: loading → login → denied → content)
  // ─────────────────────────────────────────────────────────────────────────────

  // 1. Loading auth
  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 2. No autenticat → mostrar login
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

  // 3. Verificant SuperAdmin (després de login, abans de decidir)
  if (!superAdminCheckDone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 4. Autenticat però NO és SuperAdmin → Accés denegat + logout
  if (isSuperAdmin !== true) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">Accés denegat</h1>
        <p className="text-muted-foreground">No tens permisos per accedir al panell d'administració.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLogout}>
            Tancar sessió
          </Button>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Tornar al dashboard
          </Button>
        </div>
      </div>
    );
  }

  // 5. SuperAdmin confirmat, carregant orgs
  if (orgsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. SuperAdmin confirmat → Panell complet
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      {/* Banner d'error de registre (només si hi ha error però s'ha donat accés) */}
      {registryError && (
        <div className="bg-amber-500 text-white px-4 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold">Atenció</span>
              <span className="ml-2 text-amber-100">
                {registryError}. Recarrega la pàgina si cal.
              </span>
            </div>
          </div>
        </div>
      )}

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
              {/* Estat del sistema */}
              <div className="ml-6 flex items-center gap-3 text-xs text-muted-foreground border-l pl-4">
                <span className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  v1.20
                </span>
                <span>·</span>
                <span>{process.env.NODE_ENV === 'production' ? 'prod' : 'dev'}</span>
                <span>·</span>
                <span className="font-mono">summa-social</span>
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

      {/* Mini-navegació sticky */}
      <AdminNav />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* ═══════════════════════════════════════════════════════════════════════
            A) GOVERN DEL SISTEMA
            Organitzacions, superadmins i estat global.
        ═══════════════════════════════════════════════════════════════════════ */}
        <AdminSection
          id="govern"
          title="Govern del sistema"
          description="Organitzacions, superadmins i estat global."
          tone="neutral"
        >
          {/* Estadístiques globals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

          {/* Llista d'organitzacions */}
          <Card className="mb-6">
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
                    <TableHead>Indicadors</TableHead>
                    <TableHead>Creada</TableHead>
                    <TableHead>Accessos</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
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
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span
                              className="flex items-center gap-1"
                              title={org.onboarding?.welcomeSeenAt ? `Onboarding vist: ${org.onboarding.welcomeSeenAt}` : 'Onboarding pendent'}
                            >
                              {org.onboarding?.welcomeSeenAt ? (
                                <CheckCircle2 className="h-4 w-4 text-green-600" />
                              ) : (
                                <XCircle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </span>
                            {org.updatedAt && (
                              <span className="text-xs text-muted-foreground" title={`Última activitat: ${org.updatedAt}`}>
                                {formatDate(org.updatedAt)}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(org.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                sessionStorage.setItem('adminViewingOrgId', org.id);
                                router.push(`/${org.slug}/dashboard/movimientos`);
                              }}
                              title="Moviments"
                            >
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              Mov
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => {
                                sessionStorage.setItem('adminViewingOrgId', org.id);
                                router.push(`/${org.slug}/dashboard/configuracion`);
                              }}
                              title="Configuració"
                            >
                              <Settings className="h-3 w-3" />
                            </Button>
                          </div>
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
                              <DropdownMenuItem
                                onClick={() => handleDownloadBackup(org.id, org.name)}
                                disabled={backupOrgId === org.id}
                              >
                                {backupOrgId === org.id ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <Download className="mr-2 h-4 w-4" />
                                )}
                                Backup local
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
                      <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        No hi ha organitzacions. Crea'n una per començar.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* SuperAdmins */}
          <SuperAdminsManager />

          {/* Audit logs */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Activitat SuperAdmin
              </CardTitle>
              <CardDescription>
                Últimes accions registrades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingAudit ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregant...
                </div>
              ) : auditLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Cap acció registrada encara.</p>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {formatAuditAction(log.action)}
                        </Badge>
                        {log.target && (
                          <span className="text-muted-foreground font-mono text-xs">
                            {log.target}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp.toLocaleDateString('ca-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </AdminSection>

        {/* ═══════════════════════════════════════════════════════════════════════
            B) SALUT I DIAGNÒSTIC
            Detecció d'incidències i verificacions de producció.
        ═══════════════════════════════════════════════════════════════════════ */}
        <AdminSection
          id="salut"
          title="Salut i diagnòstic"
          description="Detecció d'incidències i verificacions de producció."
          tone="info"
        >
          {/* Sentinelles + Semàfor */}
          <SystemHealth />

          {/* Demo Management - només visible en entorn demo */}
          {isDemoEnv() && (
            <Card className="mt-6 border-amber-300 bg-amber-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-800">Entorn DEMO</span>
                  <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
                    demo
                  </Badge>
                </CardTitle>
                <CardDescription className="text-amber-700">
                  Estàs treballant amb dades de demostració. Les accions aquí no afecten producció.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* Selector de mode */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-amber-800 font-medium">Mode:</span>
                    <div className="flex gap-2">
                      <Button
                        variant={selectedDemoMode === 'short' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDemoMode('short')}
                        disabled={isSeedingDemo}
                        className={selectedDemoMode === 'short' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-400'}
                      >
                        Short
                      </Button>
                      <Button
                        variant={selectedDemoMode === 'work' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDemoMode('work')}
                        disabled={isSeedingDemo}
                        className={selectedDemoMode === 'work' ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-400'}
                      >
                        Work
                      </Button>
                    </div>
                    <span className="text-xs text-amber-600">
                      {selectedDemoMode === 'short'
                        ? 'Dades netes per vídeos/pitch'
                        : 'Dades amb anomalies per validar workflows'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleRegenerateDemo}
                      disabled={isSeedingDemo}
                      variant="outline"
                      className="border-amber-400 hover:bg-amber-100"
                    >
                      {isSeedingDemo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Regenerant...
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Regenerar demo
                        </>
                      )}
                    </Button>
                    <span className="text-sm text-amber-700">
                      Purga i recrea totes les dades sintètiques
                    </span>
                  </div>

                  {seedResult && (
                    <div className={`p-3 rounded-lg text-sm ${seedResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {seedResult.ok ? (
                        <div>
                          <span className="font-medium">Seed completat ({seedResult.demoMode})</span>
                          {seedResult.counts && (
                            <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                              {Object.entries(seedResult.counts).map(([key, value]) => (
                                <span key={key}>{key}: {value}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span>Error: {seedResult.error}</span>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Diagnòstic links */}
          <Card className="mt-6">
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
        </AdminSection>

        {/* ═══════════════════════════════════════════════════════════════════════
            C) CONTINGUT I COMUNICACIÓ
            Novetats, web i traduccions.
        ═══════════════════════════════════════════════════════════════════════ */}
        <AdminSection
          id="contingut"
          title="Contingut i comunicació"
          description="Novetats, web i traduccions."
          tone="content"
        >
          {/* Novetats del producte */}
          <ProductUpdatesSection isSuperAdmin={isSuperAdmin} />

          {/* Traduccions (i18n) */}
          <div className="mt-6">
            <I18nManager />
          </div>
        </AdminSection>

        {/* ═══════════════════════════════════════════════════════════════════════
            D) OPERATIVA PUNTUAL
            Accions ràpides de suport.
        ═══════════════════════════════════════════════════════════════════════ */}
        <AdminSection
          id="operativa"
          title="Operativa puntual"
          description="Accions ràpides de suport."
          tone="warn"
        >
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
        </AdminSection>
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

      {/* Diàleg confirmar regenerar demo */}
      <AlertDialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-800">
              Regenerar dades demo ({selectedDemoMode})?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció esborrarà totes les dades de demostració existents i en crearà de noves.
              <br /><br />
              <strong>Mode seleccionat:</strong>{' '}
              {selectedDemoMode === 'short'
                ? 'Short — Dades netes per vídeos i pitch'
                : 'Work — Dades amb anomalies per validar workflows reals'}
              <br /><br />
              <strong>Només afecta l'organització demo</strong> (slug: demo). Cap dada de producció serà modificada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRegenerateDemo}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Regenerar demo ({selectedDemoMode})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
