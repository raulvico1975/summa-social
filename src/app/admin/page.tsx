'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { browserSessionPersistence, sendPasswordResetEmail, setPersistence, signInWithEmailAndPassword, signOut } from 'firebase/auth';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Shield,
  Building2,
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
  ArrowUpRight,
  Settings,
  Download,
  RefreshCw,
  Copy,
  ChevronDown,
  Bot,
  Megaphone,
  Database,
  Wrench,
} from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileListItem } from '@/components/mobile/mobile-list-item';
import { CreateOrganizationDialog } from '@/components/admin/create-organization-dialog';
import { SystemHealth } from '@/components/admin/system-health';
import { ProductUpdatesSection } from '@/components/admin/product-updates-section';
import { I18nManager } from '@/components/super-admin/i18n-manager';
import { KbLearningManager } from '@/components/super-admin/kb-learning-manager';
import { KbRuntimeDiagnostics } from '@/components/super-admin/kb-runtime-diagnostics';
import { HelpAuditSection } from '@/components/admin/help-audit-section';
import { SuperAdminsManager } from '@/components/admin/super-admins-manager';
import { EditorialCenter } from '@/components/admin/editorial-center';
import { AdminSection } from '@/components/admin/admin-section';
import { AdminNav } from '@/components/admin/admin-nav';
import { migrateExistingSlugs } from '@/lib/slugs';
import { logAdminAction, getRecentAuditLogs, formatAuditAction, type AdminAuditLog } from '@/lib/admin-audit';
import { isDemoEnv } from '@/lib/demo/isDemoOrg';
import { isAllowlistedSuperAdmin } from '@/lib/admin/superadmin-allowlist';
import { ensureSuperAdminRegistry } from '@/lib/admin/ensure-superadmin-registry';
import {
  formatDateForAdmin,
  formatRelativeActivity,
} from '@/lib/admin/control-tower-format';
import type {
  AdminControlTowerSummary,
  ControlStatus,
} from '@/lib/admin/control-tower-summary';

function statusClasses(status: ControlStatus): string {
  if (status === 'critical') return 'border-red-300 bg-red-50'
  if (status === 'warning') return 'border-amber-300 bg-amber-50'
  return 'border-green-300 bg-green-50'
}

function statusBadgeVariant(status: ControlStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'critical') return 'destructive'
  if (status === 'warning') return 'secondary'
  return 'default'
}

function AdminPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, firestore, auth, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { t } = useTranslations();
  const reason = searchParams.get('reason');

  const [isSuperAdmin, setIsSuperAdmin] = React.useState<boolean | null>(null);
  const [superAdminCheckDone, setSuperAdminCheckDone] = React.useState(false);
  const [registryError, setRegistryError] = React.useState<string | null>(null);

  const [summary, setSummary] = React.useState<AdminControlTowerSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = React.useState(false);
  const [summaryError, setSummaryError] = React.useState<string | null>(null);
  const [summaryRefreshToken, setSummaryRefreshToken] = React.useState(0);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [suspendDialogOrg, setSuspendDialogOrg] = React.useState<AdminControlTowerSummary['entities'][number] | null>(null);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isMigrating, setIsMigrating] = React.useState(false);

  const [resetEmail, setResetEmail] = React.useState('');
  const [isResetting, setIsResetting] = React.useState(false);

  const [loginEmail, setLoginEmail] = React.useState('');
  const [loginPassword, setLoginPassword] = React.useState('');
  const [isLoggingIn, setIsLoggingIn] = React.useState(false);
  const [loginError, setLoginError] = React.useState('');

  const [auditLogs, setAuditLogs] = React.useState<AdminAuditLog[]>([]);
  const [isLoadingAudit, setIsLoadingAudit] = React.useState(false);

  const [isSeedingDemo, setIsSeedingDemo] = React.useState(false);
  const [seedResult, setSeedResult] = React.useState<{ ok: boolean; demoMode?: string; counts?: Record<string, number>; error?: string } | null>(null);
  const [showSeedConfirm, setShowSeedConfirm] = React.useState(false);
  const [selectedDemoMode, setSelectedDemoMode] = React.useState<'short' | 'work'>('short');

  const [backupOrgId, setBackupOrgId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) {
      setIsSuperAdmin(null);
      setSuperAdminCheckDone(false);
      setRegistryError(null);
      return;
    }

    const isAllowed = isAllowlistedSuperAdmin(user.email);

    if (!isAllowed) {
      setIsSuperAdmin(false);
      setSuperAdminCheckDone(true);
      return;
    }

    const setupAccess = async () => {
      try {
        const result = await ensureSuperAdminRegistry(firestore, user.uid, user.email!);
        if (!result.success) {
          setRegistryError(result.error || 'No s\'ha pogut preparar l\'accés');
          console.warn('[admin] Error alineant registre, però allowlisted:', result.error);
        }
        setIsSuperAdmin(true);
      } catch (error) {
        console.error('[admin] Error inesperat:', error);
        setRegistryError((error as Error).message);
        setIsSuperAdmin(true);
      } finally {
        setSuperAdminCheckDone(true);
      }
    };

    setupAccess();
  }, [user, firestore]);

  const refreshSummary = React.useCallback(() => {
    setSummaryRefreshToken((prev) => prev + 1)
  }, [])

  React.useEffect(() => {
    if (isSuperAdmin !== true || !user) return

    let active = true

    const loadSummary = async () => {
      setIsSummaryLoading(true)
      setSummaryError(null)

      try {
        const idToken = await user.getIdToken()
        const response = await fetch('/api/admin/control-tower/summary', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        })

        const data = await response.json()
        if (!response.ok || !data.ok) {
          throw new Error(data.error || 'No s\'ha pogut carregar el resum')
        }

        if (!active) return
        setSummary(data.summary)
      } catch (error) {
        if (!active) return
        const message = (error as Error).message
        setSummaryError(message)
        console.error('[admin] control tower summary error:', error)
      } finally {
        if (active) {
          setIsSummaryLoading(false)
        }
      }
    }

    loadSummary()

    return () => {
      active = false
    }
  }, [isSuperAdmin, user, summaryRefreshToken])

  React.useEffect(() => {
    if (isSuperAdmin !== true) return;
    setIsLoadingAudit(true);
    getRecentAuditLogs(firestore, 15)
      .then(setAuditLogs)
      .catch(console.error)
      .finally(() => setIsLoadingAudit(false));
  }, [firestore, isSuperAdmin, summaryRefreshToken]);

  React.useEffect(() => {
    if (!isCreateDialogOpen && isSuperAdmin === true) {
      refreshSummary()
    }
  }, [isCreateDialogOpen, isSuperAdmin, refreshSummary])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) return;
    setIsLoggingIn(true);
    setLoginError('');
    try {
      // Sessió de navegador: es tanca en tancar el navegador
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
    } catch (error: unknown) {
      console.error('Login error:', error);
      setLoginError(t.admin?.shell?.loginError ?? 'Credencials incorrectes');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleEnterOrganization = (org: AdminControlTowerSummary['entities'][number]) => {
    sessionStorage.setItem('adminViewingOrgId', org.id);
    router.push('/dashboard');
  };

  const handleCopyOrganization = async (org: AdminControlTowerSummary['entities'][number]) => {
    try {
      const base = typeof window !== 'undefined' ? window.location.origin : 'https://summasocial.app'
      await navigator.clipboard.writeText(`${base}/${org.slug}`)
      toast({
        title: 'Enllaç copiat',
        description: `S\'ha copiat /${org.slug}`,
      })
    } catch (error) {
      console.error('Copy error:', error)
      toast({
        variant: 'destructive',
        title: t.common?.error ?? 'Error',
        description: 'No s\'ha pogut copiar l\'enllaç',
      })
    }
  }

  const handleToggleSuspend = async (org: AdminControlTowerSummary['entities'][number]) => {
    setIsProcessing(true);
    try {
      const newStatus = org.status === 'suspended' ? 'active' : 'suspended';
      await updateDoc(doc(firestore, 'organizations', org.id), {
        status: newStatus,
        ...(newStatus === 'suspended' ? { suspendedAt: new Date().toISOString() } : { suspendedAt: null, suspendedReason: null }),
        updatedAt: new Date().toISOString(),
      });

      logAdminAction(
        firestore,
        newStatus === 'suspended' ? 'SUSPEND_ORG' : 'REACTIVATE_ORG',
        user!.uid,
        org.slug || org.id
      );

      toast({
        title: newStatus === 'suspended'
          ? (t.admin?.shell?.orgSuspended ?? 'Organització suspesa')
          : (t.admin?.shell?.orgReactivated ?? 'Organització reactivada'),
        description: newStatus === 'suspended'
          ? t.admin?.shell?.orgNowSuspended?.({ org: org.name }) ?? `${org.name} ara està suspesa.`
          : t.admin?.shell?.orgNowActive?.({ org: org.name }) ?? `${org.name} ara està activa.`,
      });

      refreshSummary()
    } catch (error) {
      console.error('Error updating organization:', error);
      toast({ variant: 'destructive', title: t.common?.error ?? 'Error', description: t.admin?.shell?.updateError ?? 'No s\'ha pogut actualitzar l\'organització.' });
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
        title: t.admin?.migrations?.completed ?? 'Migració completada',
        description: `${t.admin?.migrations?.migrated?.({ count: result.migrated }) ?? `${result.migrated} organitzacions migrades`}. ${result.errors.length > 0 ? (t.admin?.migrations?.errors?.({ count: result.errors.length }) ?? `Errors: ${result.errors.length}`) : ''}`,
      });
      if (result.errors.length > 0) {
        console.error('Errors de migració:', result.errors);
      }
      refreshSummary()
    } catch (error) {
      console.error('Error durant la migració:', error);
      toast({
        variant: 'destructive',
        title: t.common?.error ?? 'Error',
        description: t.admin?.migrations?.failed ?? 'No s\'ha pogut completar la migració.',
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
      logAdminAction(firestore, 'RESET_PASSWORD_SENT', user!.uid, resetEmail.trim());
      refreshSummary()
    } catch (error) {
      console.error('Password reset error (silenced):', error);
    } finally {
      toast({
        title: t.admin?.resetPassword?.sent ?? 'Correu enviat',
        description: t.admin?.resetPassword?.sentDescription ?? 'Si l\'adreça existeix, rebrà un correu per restablir la contrasenya.',
      });
      setResetEmail('');
      setIsResetting(false);
    }
  };

  const executeRegenerateDemo = async () => {
    if (!user) return;
    setShowSeedConfirm(false);
    setIsSeedingDemo(true);
    setSeedResult(null);

    try {
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
        const countsStr = Object.entries(data.counts || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
        toast({
          title: t.admin?.health?.demoRegenerated ?? 'Demo regenerada',
          description: t.admin?.health?.demoRegeneratedDesc?.({ mode: data.demoMode, counts: countsStr }) ?? `Mode: ${data.demoMode}. Dades creades: ${countsStr}`,
        });
      } else {
        setSeedResult({ ok: false, error: data.error || (t.common?.unknownError ?? 'Error desconegut') });
        toast({
          variant: 'destructive',
          title: t.common?.error ?? 'Error',
          description: data.error || (t.admin?.health?.demoError ?? 'No s\'ha pogut regenerar la demo'),
        });
      }
      refreshSummary()
    } catch (error) {
      console.error('Error regenerant demo:', error);
      setSeedResult({ ok: false, error: (error as Error).message });
      toast({
        variant: 'destructive',
        title: t.common?.error ?? 'Error',
        description: t.admin?.health?.demoConnectionError ?? 'Error de connexió regenerant la demo',
      });
    } finally {
      setIsSeedingDemo(false);
    }
  };

  const handleRegenerateDemo = () => {
    setShowSeedConfirm(true);
  };

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

      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `backup_${orgId}.json`;

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
        title: t.admin?.shell?.backupDownloaded ?? 'Backup descarregat',
        description: t.admin?.shell?.backupDownloadedDesc?.({ org: orgName }) ?? `S'ha descarregat el backup de ${orgName}.`,
      });
    } catch (error) {
      console.error('Error descarregant backup:', error);
      toast({
        variant: 'destructive',
        title: t.common?.error ?? 'Error',
        description: (error as Error).message || (t.admin?.shell?.backupError ?? 'No s\'ha pogut descarregar el backup.'),
      });
    } finally {
      setBackupOrgId(null);
    }
  };

  const getStatusBadge = (status: AdminControlTowerSummary['entities'][number]['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800 border-green-300">{t.admin?.orgStatus?.active ?? 'Activa'}</Badge>;
      case 'suspended':
        return <Badge variant="destructive">{t.admin?.orgStatus?.suspended ?? 'Suspesa'}</Badge>;
      case 'pending':
        return <Badge variant="secondary">{t.admin?.orgStatus?.pending ?? 'Pendent'}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logout:', error);
    }
  };

  if (isUserLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>{t.admin?.shell?.loginTitle ?? 'Panell SuperAdmin'}</CardTitle>
            <CardDescription>{t.admin?.access?.restricted ?? 'Accés restringit'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {reason === 'idle' && (
                <p className="text-sm rounded-md px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200">
                  Sessió tancada per inactivitat. Torna a iniciar sessió.
                </p>
              )}
              {reason === 'max_session' && (
                <p className="text-sm rounded-md px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200">
                  Per seguretat, cal tornar a iniciar sessió cada 12 hores.
                </p>
              )}
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

  if (!superAdminCheckDone) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isSuperAdmin !== true) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h1 className="text-xl font-semibold">{t.admin?.access?.deniedTitle ?? 'Accés denegat'}</h1>
        <p className="text-muted-foreground">{t.admin?.access?.deniedDescription ?? 'No tens permisos per accedir al panell d\'administració.'}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleLogout}>
            {t.admin?.access?.logout ?? 'Tancar sessió'}
          </Button>
          <Button onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t.admin?.access?.backToDashboard ?? 'Tornar al dashboard'}
          </Button>
        </div>
      </div>
    );
  }

  const cards = summary?.globalStatus.cards ?? []
  const entities = summary?.entities ?? []
  const kbSummary = summary?.kbBotSummary
  const communication = summary?.communicationSummary

  return (
    <div className="min-h-screen bg-background">
      {registryError && (
        <div className="bg-amber-500 text-white px-4 py-3">
          <div className="container mx-auto flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <div>
              <span className="font-semibold">{t.admin?.health?.registryWarning ?? 'Atenció'}</span>
              <span className="ml-2 text-amber-100">
                {t.admin?.health?.reloadIfNeeded?.({ error: registryError }) ?? `${registryError}. Recarrega la pàgina si cal.`}
              </span>
            </div>
          </div>
        </div>
      )}

      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">{t.admin?.controlTower?.title ?? 'SUPERADMIN — TORRE DE CONTROL'}</h1>
                <p className="text-sm text-muted-foreground">{t.admin?.controlTower?.subtitle ?? 'Govern i contingut de Summa Social'}</p>
              </div>
            </div>
            <Button variant="outline" onClick={refreshSummary} disabled={isSummaryLoading}>
              {isSummaryLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualitzar
            </Button>
          </div>
        </div>
      </header>

      <AdminNav />

      <main className="container mx-auto px-4 py-8 space-y-8">
        {summaryError && (
          <Card className="border-red-300 bg-red-50">
            <CardContent className="pt-6 text-sm text-red-700">
              {summaryError}
            </CardContent>
          </Card>
        )}

        <AdminSection
          id="estat"
          title={t.admin?.controlTower?.sections?.globalStatusTitle ?? '1. Estat global'}
          description={t.admin?.controlTower?.sections?.globalStatusDescription ?? 'Visió executiva de sistema, incidències, contingut i traduccions.'}
          tone="neutral"
        >
          {isSummaryLoading && !summary ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregant resum...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {cards.map((card) => (
                <Card key={card.id} className={statusClasses(card.status)}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-sm">{card.title}</CardTitle>
                      <Badge variant={statusBadgeVariant(card.status)} className="capitalize">{card.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold text-sm">{card.headline}</p>
                    {card.detail && <p className="text-xs text-muted-foreground mt-1">{card.detail}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Collapsible className="mt-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" />
                  {t.admin?.controlTower?.sections?.technicalDiagnostics ?? 'Diagnòstic tècnic'}
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <SystemHealth />
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t.admin?.health?.diagTitle ?? 'Diagnòstic'}</CardTitle>
                  <CardDescription>{t.admin?.health?.diagDescription ?? 'Si estàs perdut o hi ha una incidència, comença pel manual.'}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <a
                    href="https://console.firebase.google.com/project/summa-social/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Firebase Console
                  </a>
                  <a
                    href="https://console.cloud.google.com/logs/query?project=summa-social"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Cloud Logging
                  </a>
                  <span
                    className="flex items-center gap-2 cursor-pointer hover:text-foreground text-muted-foreground"
                    onClick={() => {
                      navigator.clipboard.writeText('docs/DEV-SOLO-MANUAL.md');
                      toast({ title: t.admin?.health?.copiedToClipboard ?? 'Copiat al porta-retalls' });
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    <code className="text-xs bg-muted px-1 rounded">docs/DEV-SOLO-MANUAL.md</code>
                  </span>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
        </AdminSection>

        <AdminSection
          id="entitats"
          title={t.admin?.controlTower?.sections?.entitiesTitle ?? '2. Entitats'}
          description={t.admin?.controlTower?.sections?.entitiesDescription ?? 'Govern executiu de totes les organitzacions.'}
          tone="neutral"
        >
          <Card>
            <CardContent className="pt-6">
              {isMobile ? (
                <div className="flex flex-col gap-2">
                  {entities.length > 0 ? (
                    entities.map((org) => (
                      <MobileListItem
                        key={org.id}
                        title={org.name}
                        leadingIcon={<Building2 className="h-4 w-4" />}
                        badges={[getStatusBadge(org.status)]}
                        meta={[
                          { label: 'Alta', value: formatDateForAdmin(org.createdAt) },
                          { label: 'Activitat', value: formatRelativeActivity(org.lastActivityAt) },
                        ]}
                        actions={
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEnterOrganization(org)}>
                                <LogIn className="mr-2 h-4 w-4" />
                                Entrar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                sessionStorage.setItem('adminViewingOrgId', org.id);
                                router.push(`/${org.slug}/dashboard/movimientos`);
                              }}>
                                <ArrowUpRight className="mr-2 h-4 w-4" />
                                Moviments
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                sessionStorage.setItem('adminViewingOrgId', org.id);
                                router.push(`/${org.slug}/dashboard/configuracion`);
                              }}>
                                <Settings className="mr-2 h-4 w-4" />
                                Configuració
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCopyOrganization(org)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Còpia
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
                                Backup
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
                        }
                        onClick={() => handleEnterOrganization(org)}
                      />
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-12">Sense entitats disponibles.</p>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Estat</TableHead>
                      <TableHead>Alta</TableHead>
                      <TableHead>Última activitat</TableHead>
                      <TableHead>Accions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entities.length > 0 ? (
                      entities.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{org.name}</div>
                                <div className="text-xs text-muted-foreground">/{org.slug}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(org.status)}</TableCell>
                          <TableCell>{formatDateForAdmin(org.createdAt)}</TableCell>
                          <TableCell>{formatRelativeActivity(org.lastActivityAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap items-center gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleEnterOrganization(org)}>
                                Entrar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  sessionStorage.setItem('adminViewingOrgId', org.id);
                                  router.push(`/${org.slug}/dashboard/movimientos`);
                                }}
                              >
                                Moviments
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => {
                                  sessionStorage.setItem('adminViewingOrgId', org.id);
                                  router.push(`/${org.slug}/dashboard/configuracion`);
                                }}
                              >
                                Configuració
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleCopyOrganization(org)}>
                                Còpia
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className={org.status === 'suspended' ? 'h-7 px-2 text-xs text-green-600' : 'h-7 px-2 text-xs text-destructive'}
                                onClick={() => setSuspendDialogOrg(org)}
                              >
                                {org.status === 'suspended' ? 'Reactivar' : 'Suspendre'}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                          Sense entitats disponibles.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </AdminSection>

        <AdminSection
          id="coneixement"
          title={t.admin?.controlTower?.sections?.knowledgeTitle ?? '3. Coneixement i Bot'}
          description={t.admin?.controlTower?.sections?.knowledgeDescription ?? 'Salut de la base de coneixement i friccions de suport.'}
          tone="content"
        >
          <Card>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Base de coneixement</p>
                <p className="text-sm font-semibold mt-1">
                  Darrera actualització: {formatDateForAdmin(kbSummary?.kbUpdatedAt ?? null)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Activitat del bot</p>
                <p className="text-sm font-semibold mt-1">{kbSummary?.botTotalQuestions ?? 0} preguntes totals</p>
                <p className="text-sm text-muted-foreground">{kbSummary?.botTodayQuestions ?? 0} avui (estimació operativa)</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Temes més freqüents</p>
                <ul className="mt-1 text-sm space-y-1">
                  {(kbSummary?.topTopics ?? []).length > 0 ? (
                    (kbSummary?.topTopics ?? []).map((topic) => (
                      <li key={topic.topic}>• {topic.topic}</li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">Sense dades</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          <EditorialCenter />

          <Collapsible className="mt-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Gestió avançada KB i bot
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <KbLearningManager />
              <KbRuntimeDiagnostics />
            </CollapsibleContent>
          </Collapsible>
        </AdminSection>

        <AdminSection
          id="comunicacio"
          title={t.admin?.controlTower?.sections?.communicationTitle ?? '4. Comunicació'}
          description={t.admin?.controlTower?.sections?.communicationDescription ?? 'Coherència editorial i ritme de publicació.'}
          tone="info"
        >
          <Card className={communication ? statusClasses(communication.status) : ''}>
            <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold">Darreres novetats publicades</p>
                <ul className="mt-2 space-y-2 text-sm">
                  {(communication?.latestPublished ?? []).length > 0 ? (
                    (communication?.latestPublished ?? []).map((item) => (
                      <li key={item.id} className="flex items-center justify-between gap-3">
                        <span>{item.title}</span>
                        <span className="text-muted-foreground text-xs">{formatDateForAdmin(item.publishedAt)}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-muted-foreground">No hi ha publicacions actives.</li>
                  )}
                </ul>
              </div>
              <div>
                <p className="text-sm font-semibold">Esborranys pendents</p>
                <p className="text-2xl font-bold mt-1">{communication?.pendingDrafts ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">Controla si hi ha novetats encallades abans de publicar.</p>
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Badge variant={statusBadgeVariant(communication?.status ?? 'ok')} className="capitalize">
                    {communication?.status ?? 'ok'}
                  </Badge>
                  <span className="text-muted-foreground">Estat editorial</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Collapsible className="mt-6">
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Gestió editorial avançada
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <ProductUpdatesSection isSuperAdmin={isSuperAdmin === true} />
              <HelpAuditSection />
              <I18nManager />
            </CollapsibleContent>
          </Collapsible>
        </AdminSection>

        <AdminSection
          id="configuracio"
          title={t.admin?.controlTower?.sections?.advancedConfigTitle ?? '5. Configuració avançada'}
          description={t.admin?.controlTower?.sections?.advancedConfigDescription ?? 'Accions sensibles i administració del sistema (plegat per defecte).'}
          tone="warn"
        >
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Obrir configuració avançada
                </span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Operacions SuperAdmin</CardTitle>
                  <CardDescription>Alta d\'organitzacions i migracions.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    Nova organització
                  </Button>
                  <Button variant="outline" onClick={handleMigrateSlugs} disabled={isMigrating}>
                    {isMigrating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Migrar slugs
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Mail className="h-4 w-4" />
                    {t.admin?.resetPassword?.title ?? 'Reset contrasenya'}
                  </CardTitle>
                  <CardDescription>
                    {t.admin?.resetPassword?.description ?? 'Envia un correu per restablir la contrasenya d\'un usuari'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder={t.admin?.resetPassword?.placeholder ?? 'email@exemple.com'}
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      disabled={isResetting}
                    />
                    <Button
                      onClick={handlePasswordReset}
                      disabled={isResetting || !resetEmail.trim()}
                    >
                      {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {t.admin?.resetPassword?.send ?? 'Enviar correu'}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {isDemoEnv() && (
                <Card className="border-amber-300 bg-amber-50/50">
                  <CardHeader>
                    <CardTitle className="text-base text-amber-900">{t.admin?.health?.demoEnv ?? 'Entorn DEMO'}</CardTitle>
                    <CardDescription className="text-amber-700">
                      {t.admin?.health?.demoDescription ?? 'Estàs treballant amb dades de demostració. Les accions aquí no afecten producció.'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant={selectedDemoMode === 'short' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDemoMode('short')}
                        disabled={isSeedingDemo}
                      >
                        Short
                      </Button>
                      <Button
                        variant={selectedDemoMode === 'work' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDemoMode('work')}
                        disabled={isSeedingDemo}
                      >
                        Work
                      </Button>
                      <span className="text-xs text-amber-700">
                        {selectedDemoMode === 'short'
                          ? (t.admin?.health?.demoShort ?? 'Dades netes per vídeos/pitch')
                          : (t.admin?.health?.demoWork ?? 'Dades amb anomalies per validar workflows')}
                      </span>
                    </div>
                    <Button onClick={handleRegenerateDemo} disabled={isSeedingDemo} variant="outline">
                      {isSeedingDemo ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {t.admin?.health?.regenerating ?? 'Regenerant...'}
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          {t.admin?.health?.regenerateDemo ?? 'Regenerar demo'}
                        </>
                      )}
                    </Button>
                    {seedResult && (
                      <div className={`p-3 rounded-lg text-sm ${seedResult.ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {seedResult.ok ? (
                          <span>Seed completat ({seedResult.demoMode})</span>
                        ) : (
                          <span>Error: {seedResult.error}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <SuperAdminsManager />

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="h-4 w-4" />
                    {t.admin?.updates?.title ?? 'Activitat SuperAdmin'}
                  </CardTitle>
                  <CardDescription>
                    {t.admin?.updates?.description ?? 'Últimes accions registrades'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingAudit ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t.common?.loading ?? 'Carregant...'}
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t.admin?.updates?.noActions ?? 'Cap acció registrada encara.'}</p>
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
            </CollapsibleContent>
          </Collapsible>
        </AdminSection>
      </main>

      <CreateOrganizationDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />

      <AlertDialog open={!!suspendDialogOrg} onOpenChange={() => setSuspendDialogOrg(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {suspendDialogOrg?.status === 'suspended'
                ? (t.admin?.shell?.reactivateTitle ?? 'Reactivar organització?')
                : (t.admin?.shell?.suspendTitle ?? 'Suspendre organització?')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {suspendDialogOrg?.status === 'suspended'
                ? (t.admin?.shell?.reactivateDesc?.({ org: suspendDialogOrg?.name ?? '' }) ?? `L'organització "${suspendDialogOrg?.name}" tornarà a estar activa i els seus membres podran accedir-hi.`)
                : (t.admin?.shell?.suspendDesc?.({ org: suspendDialogOrg?.name ?? '' }) ?? `L'organització "${suspendDialogOrg?.name}" quedarà suspesa i els seus membres no podran accedir-hi.`)
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>{t.common?.cancel ?? 'Cancel·lar'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => suspendDialogOrg && handleToggleSuspend(suspendDialogOrg)}
              disabled={isProcessing}
              className={suspendDialogOrg?.status === 'suspended' ? '' : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'}
            >
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {suspendDialogOrg?.status === 'suspended' ? (t.admin?.shell?.reactivate ?? 'Reactivar') : (t.admin?.shell?.suspend ?? 'Suspendre')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showSeedConfirm} onOpenChange={setShowSeedConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-800">
              {t.admin?.health?.confirmRegenTitle?.({ mode: selectedDemoMode }) ?? `Regenerar dades demo (${selectedDemoMode})?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.admin?.health?.confirmRegenDesc ?? 'Aquesta acció esborrarà totes les dades de demostració existents i en crearà de noves.'}
              <br /><br />
              <strong>{t.admin?.health?.selectedMode ?? 'Mode seleccionat:'}</strong>{' '}
              {selectedDemoMode === 'short'
                ? (t.admin?.health?.shortModeDesc ?? 'Short — Dades netes per vídeos i pitch')
                : (t.admin?.health?.workModeDesc ?? 'Work — Dades amb anomalies per validar workflows reals')}
              <br /><br />
              <strong>{t.admin?.health?.onlyDemo ?? "Només afecta l'organització demo (slug: demo). Cap dada de producció serà modificada."}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common?.cancel ?? 'Cancel·lar'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeRegenerateDemo}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {t.admin?.health?.regenerateDemo ?? 'Regenerar demo'} ({selectedDemoMode})
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function AdminPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Carregant...</div>}>
      <AdminPageContent />
    </React.Suspense>
  );
}
