'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Cloud, AlertCircle, CheckCircle2, XCircle, Loader2, Play, Link2, Unlink } from 'lucide-react';
import { useFirebase, useDoc } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { doc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import type { BackupIntegration, BackupProvider, BackupRun } from '@/lib/backups/types';
import { INITIAL_BACKUP_INTEGRATION } from '@/lib/backups/types';

export function BackupsSettings() {
  const { firestore, user } = useFirebase();
  const { organizationId, orgSlug, userRole } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();
  const searchParams = useSearchParams();

  const canEdit = userRole === 'admin';

  // Mostrar toast si s'ha connectat correctament (després de redirect OAuth)
  React.useEffect(() => {
    const connected = searchParams.get('backup_connected');
    const error = searchParams.get('backup_error');

    if (connected === 'dropbox') {
      toast({
        title: t.settings.backups.connectedSuccess,
        description: t.settings.backups.connectedSuccessDropbox,
      });
      // Netejar URL params
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (connected === 'googleDrive') {
      toast({
        title: t.settings.backups.connectedSuccess,
        description: t.settings.backups.connectedSuccessGoogleDrive,
      });
      // Netejar URL params
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (error) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.settings.backups.connectionFailed,
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams, toast, t]);

  // Ref memoitzada per al document d'integració
  const backupDocRef = React.useMemo(() => {
    if (!firestore || !organizationId) return null;
    return doc(firestore, `organizations/${organizationId}/integrations/backup`);
  }, [firestore, organizationId]);

  // Subscripció realtime al document
  const { data: backupData, isLoading: isLoadingDoc, error: docError } = useDoc<BackupIntegration>(backupDocRef);

  // Estat local per gestionar inicialització
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isRunningBackup, setIsRunningBackup] = React.useState(false);
  const [lastRun, setLastRun] = React.useState<BackupRun | null>(null);
  const [isLoadingLastRun, setIsLoadingLastRun] = React.useState(true);

  // Inicialitzar document si no existeix
  React.useEffect(() => {
    if (!backupDocRef || isLoadingDoc || backupData || isInitializing) return;

    // Si no hi ha data i no estem carregant, el document no existeix
    const initDoc = async () => {
      setIsInitializing(true);
      try {
        await setDoc(backupDocRef, INITIAL_BACKUP_INTEGRATION);
      } catch (err) {
        console.error('Error inicialitzant backup integration:', err);
        toast({
          variant: 'destructive',
          title: t.common.error,
          description: t.settings.backups.errorInitializing,
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initDoc();
  }, [backupDocRef, isLoadingDoc, backupData, isInitializing, toast, t]);

  // Carregar últim backup run
  React.useEffect(() => {
    if (!firestore || !organizationId) return;

    const loadLastRun = async () => {
      setIsLoadingLastRun(true);
      try {
        const backupsRef = collection(firestore, `organizations/${organizationId}/backups`);
        const q = query(backupsRef, orderBy('startedAt', 'desc'), limit(1));
        const snap = await getDocs(q);

        if (!snap.empty) {
          const runDoc = snap.docs[0];
          setLastRun({ id: runDoc.id, ...runDoc.data() } as BackupRun);
        } else {
          setLastRun(null);
        }
      } catch (err) {
        console.error('Error carregant últim backup:', err);
      } finally {
        setIsLoadingLastRun(false);
      }
    };

    loadLastRun();
  }, [firestore, organizationId]);

  // Handler per canviar proveïdor
  const handleProviderChange = async (value: string) => {
    if (!backupDocRef || !canEdit) return;

    // No permetre canvi si està connectat
    if (backupData?.status === 'connected') return;

    setIsSaving(true);
    try {
      const provider = value as BackupProvider;
      await updateDoc(backupDocRef, { provider });
      toast({
        title: t.settings.backups.providerUpdated,
      });
    } catch (err) {
      console.error('Error actualitzant proveïdor:', err);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.settings.backups.errorUpdating,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handler per executar backup manualment
  const handleRunBackup = async () => {
    if (!canEdit || !organizationId || !user || !isConnected) return;

    setIsRunningBackup(true);
    try {
      const idToken = await user.getIdToken();

      const response = await fetch('/api/integrations/backup/run-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orgId: organizationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run backup');
      }

      toast({
        title: t.settings.backups.runBackupSuccess,
        description: t.settings.backups.runBackupSuccessDesc,
      });

      // Recarregar últim backup
      if (firestore) {
        const backupsRef = collection(firestore, `organizations/${organizationId}/backups`);
        const q = query(backupsRef, orderBy('startedAt', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const runDoc = snap.docs[0];
          setLastRun({ id: runDoc.id, ...runDoc.data() } as BackupRun);
        }
      }
    } catch (err) {
      console.error('Error running backup:', err);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: err instanceof Error ? err.message : t.settings.backups.runBackupError,
      });
    } finally {
      setIsRunningBackup(false);
    }
  };

  // Handler per connectar proveïdor
  const handleConnect = async () => {
    if (!canEdit || !organizationId || !orgSlug || !user) return;

    const provider = backupData?.provider;
    if (!provider) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.settings.backups.selectProviderFirst,
      });
      return;
    }

    // Determinar endpoint segons provider
    let startEndpoint: string;
    if (provider === 'dropbox') {
      startEndpoint = '/api/integrations/backup/dropbox/start';
    } else if (provider === 'googleDrive') {
      startEndpoint = '/api/integrations/backup/google-drive/start';
    } else {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: 'Provider not supported',
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Obtenir ID token per autenticar la request
      const idToken = await user.getIdToken();

      const response = await fetch(startEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ orgId: organizationId, orgSlug }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Mostrar missatges d'error diferenciats segons el codi
        let errorMessage = t.settings.backups.connectionFailed;
        if (errorData.code === 'ORG_NOT_FOUND') {
          errorMessage = 'Organització no trobada';
        } else if (errorData.code === 'NOT_MEMBER') {
          errorMessage = 'No ets membre d\'aquesta organització';
        } else if (errorData.code === 'NOT_ADMIN') {
          errorMessage = 'Només els administradors poden connectar proveïdors de backup';
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Redirigir a OAuth del provider
      window.location.href = data.url;
    } catch (err) {
      console.error('Error starting OAuth:', err);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.settings.backups.connectionFailed,
      });
      setIsConnecting(false);
    }
  };

  // Determinar estat visual
  const integration = backupData ?? INITIAL_BACKUP_INTEGRATION;
  const isConnected = integration.status === 'connected';
  const hasError = integration.status === 'error';
  const isDisconnected = integration.status === 'disconnected';

  // Loading state
  if (isLoadingDoc || isInitializing) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (docError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            {t.settings.backups.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{t.settings.backups.errorLoading}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          {t.settings.backups.title}
        </CardTitle>
        <CardDescription>{t.settings.backups.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Estat actual */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{t.settings.backups.statusLabel}</span>
            <Badge
              variant={isConnected ? 'default' : hasError ? 'destructive' : 'secondary'}
              className={isConnected ? 'bg-green-600' : ''}
            >
              {isConnected && <CheckCircle2 className="h-3 w-3 mr-1" />}
              {hasError && <XCircle className="h-3 w-3 mr-1" />}
              {isConnected
                ? t.settings.backups.statusConnected
                : hasError
                  ? t.settings.backups.statusError
                  : t.settings.backups.statusDisconnected}
            </Badge>
          </div>

          {/* Proveïdor seleccionat */}
          {integration.provider && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t.settings.backups.providerLabel}</span>
              <span>
                {integration.provider === 'dropbox'
                  ? t.settings.backups.providerDropbox
                  : t.settings.backups.providerGoogleDrive}
              </span>
            </div>
          )}

          {/* Últim backup */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t.settings.backups.lastRunLabel}</span>
            {isLoadingLastRun ? (
              <Skeleton className="h-4 w-24" />
            ) : lastRun ? (
              <span className="flex items-center gap-1">
                {lastRun.status === 'success' ? (
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                ) : (
                  <XCircle className="h-3 w-3 text-destructive" />
                )}
                {new Date(lastRun.startedAt).toLocaleDateString('ca-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            ) : (
              <span className="text-muted-foreground">{t.settings.backups.lastRunNone}</span>
            )}
          </div>
        </div>

        {/* Error message si existeix */}
        {integration.lastError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t.settings.backups.lastErrorLabel}:</strong> {integration.lastError}
            </AlertDescription>
          </Alert>
        )}

        {/* Selector de proveïdor */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t.settings.backups.selectProvider}</label>
          {isConnected ? (
            <p className="text-sm text-muted-foreground">
              {t.settings.backups.disconnectToChange}
            </p>
          ) : (
            <Select
              value={integration.provider ?? ''}
              onValueChange={handleProviderChange}
              disabled={!canEdit || isSaving}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.settings.backups.selectProviderPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dropbox">{t.settings.backups.providerDropbox}</SelectItem>
                <SelectItem value="googleDrive">{t.settings.backups.providerGoogleDrive}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Accions */}
        <div className="flex gap-3">
          {isConnected ? (
            // Ja connectat: mostrar estat i opció de desconnectar
            <Button variant="outline" disabled className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              {t.settings.backups.connectedTo}{' '}
              {integration.provider === 'dropbox'
                ? t.settings.backups.providerDropbox
                : t.settings.backups.providerGoogleDrive}
            </Button>
          ) : integration.provider === 'dropbox' ? (
            // Dropbox seleccionat: botó funcional
            <Button
              onClick={handleConnect}
              disabled={!canEdit || isConnecting}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {isConnecting ? t.settings.backups.connecting : t.settings.backups.connect}
            </Button>
          ) : integration.provider === 'googleDrive' ? (
            // Google Drive seleccionat: botó funcional
            <Button
              onClick={handleConnect}
              disabled={!canEdit || isConnecting}
              className="flex items-center gap-2"
            >
              {isConnecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              {isConnecting ? t.settings.backups.connecting : t.settings.backups.connect}
            </Button>
          ) : (
            // Cap proveïdor seleccionat
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button disabled className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      {t.settings.backups.connect}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t.settings.backups.selectProviderFirst}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    variant="outline"
                    disabled={!isConnected || !canEdit || isRunningBackup}
                    onClick={handleRunBackup}
                    className="flex items-center gap-2"
                  >
                    {isRunningBackup ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    {isRunningBackup ? t.settings.backups.runningBackup : t.settings.backups.runNow}
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isConnected
                    ? t.settings.backups.runNowReady
                    : t.settings.backups.runNowDisabled}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}
