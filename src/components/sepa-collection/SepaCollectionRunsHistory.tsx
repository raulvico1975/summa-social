'use client';

import * as React from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import {
  AlertTriangle,
  CalendarDays,
  Download,
  FileClock,
  FolderArchive,
  Hash,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import type { BankAccount, SepaCollectionRunRecord } from '@/lib/data';
import { summarizeSepaCollectionRunRecord } from '@/lib/sepa/pain008/run-history';

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

function formatShortDate(dateStr: string | null) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string | null) {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SepaCollectionRunsHistory() {
  const { firestore, storage } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { tr } = useTranslations();
  const [downloadingRunId, setDownloadingRunId] = React.useState<string | null>(null);

  const bankAccountsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'bankAccounts') : null,
    [firestore, organizationId]
  );
  const { data: bankAccounts } = useCollection<BankAccount>(bankAccountsCollection);

  const runsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'sepaCollectionRuns') : null,
    [firestore, organizationId]
  );
  const runsQuery = useMemoFirebase(
    () => runsCollection ? query(runsCollection, orderBy('createdAt', 'desc'), limit(30)) : null,
    [runsCollection]
  );
  const { data: runs, isLoading, error } = useCollection<SepaCollectionRunRecord>(runsQuery);

  const bankAccountsById = React.useMemo(() => {
    return new Map((bankAccounts ?? []).map((account) => [account.id, account]));
  }, [bankAccounts]);

  const summaries = React.useMemo(() => {
    return (runs ?? []).map((run) => summarizeSepaCollectionRunRecord(run));
  }, [runs]);

  const totalRunAmount = React.useMemo(() => {
    return summaries.reduce((sum, run) => sum + run.totalCents, 0);
  }, [summaries]);

  const lastExportedAt = summaries[0]?.exportedAt ?? summaries[0]?.createdAt ?? null;

  const handleDownload = React.useCallback(async (runId: string, storagePath: string | null, filename: string | null) => {
    if (!storagePath) return;

    setDownloadingRunId(runId);
    try {
      const downloadUrl = await getDownloadURL(ref(storage, storagePath));
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || `sepa-run-${runId}.xml`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (downloadError) {
      console.error('SEPA_RUN_DOWNLOAD_FAILED', downloadError);
      toast({
        variant: 'destructive',
        title: tr('sepaPain008.history.downloadErrorTitle', 'No s\'ha pogut descarregar l\'XML'),
        description: tr('sepaPain008.history.downloadErrorDescription', 'Revisa que el fitxer continuï disponible i torna-ho a provar.'),
      });
    } finally {
      setDownloadingRunId(null);
    }
  }, [storage, toast, tr]);

  return (
    <section className="w-full space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
        <h2 className="text-lg font-semibold text-foreground">
          {tr('sepaPain008.history.title', 'Historial de remeses')}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {tr(
            'sepaPain008.history.description',
            'Recupera els XML pain.008 que ja s’han generat i revisa ràpidament què es va incloure a cada remesa.'
          )}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/60 bg-background/95 p-4 shadow-sm sm:p-5 xl:p-6 2xl:p-8">
        <Alert>
          <FolderArchive className="h-4 w-4" />
          <AlertDescription>
            {tr(
              'sepaPain008.history.notice',
              'Aquest historial és intern de Summa: desa el XML generat i el resum de la remesa, però no envia res automàticament al banc.'
            )}
          </AlertDescription>
        </Alert>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-32 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {tr(
                'sepaPain008.history.loadError',
                'No s’ha pogut carregar l’historial de remeses ara mateix.'
              )}
            </AlertDescription>
          </Alert>
        ) : summaries.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
            <FolderArchive className="mx-auto h-10 w-10 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">
              {tr('sepaPain008.history.emptyTitle', 'Encara no hi ha remeses desades')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {tr(
                'sepaPain008.history.emptyDescription',
                'Quan generis una remesa des de la pestanya Nova remesa, aquí en quedarà el registre i el XML per recuperar-lo més endavant.'
              )}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  {tr('sepaPain008.history.summary.totalRuns', 'Remeses desades')}
                </p>
                <p className="mt-2 text-2xl font-semibold">{summaries.length}</p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  {tr('sepaPain008.history.summary.totalAmount', 'Import acumulat visible')}
                </p>
                <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalRunAmount)}</p>
              </div>
              <div className="rounded-2xl border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  {tr('sepaPain008.history.summary.lastExport', 'Darrera exportació')}
                </p>
                <p className="mt-2 text-lg font-semibold">{formatDateTime(lastExportedAt)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {summaries.map((run) => {
                const accountName = run.bankAccountId ? bankAccountsById.get(run.bankAccountId)?.name : null;
                const isDownloading = downloadingRunId === run.id;

                return (
                  <section key={run.id} className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {run.collectionDate
                              ? tr('sepaPain008.history.collectionDateBadge', 'Cobrament {date}')
                                  .replace('{date}', formatShortDate(run.collectionDate))
                              : tr('sepaPain008.history.noCollectionDate', 'Sense data de cobrament')}
                          </Badge>
                          <Badge variant="outline">{run.scheme ?? 'CORE'}</Badge>
                          {accountName && (
                            <Badge variant="outline">{accountName}</Badge>
                          )}
                        </div>

                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold sm:text-lg">
                            {run.filename ?? tr('sepaPain008.history.noFilename', 'XML sense nom de fitxer')}
                          </h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {tr('sepaPain008.history.generatedAt', 'Generada el {date}')
                              .replace('{date}', formatDateTime(run.exportedAt ?? run.createdAt))}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 lg:items-end">
                        <div className="text-left lg:text-right">
                          <p className="text-2xl font-semibold">{formatCurrency(run.totalCents)}</p>
                          <p className="text-sm text-muted-foreground">
                            {tr('sepaPain008.history.itemsCount', '{count} cobraments')
                              .replace('{count}', String(run.itemCount))}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={!run.storagePath || isDownloading}
                          onClick={() => handleDownload(run.id ?? '', run.storagePath, run.filename)}
                        >
                          {isDownloading ? (
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Download className="mr-2 h-4 w-4" />
                          )}
                          {run.storagePath
                            ? tr('sepaPain008.history.downloadXml', 'Descarregar XML')
                            : tr('sepaPain008.history.xmlUnavailable', 'XML no disponible')}
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      <div className="rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <Hash className="h-3.5 w-3.5" />
                          <span>{tr('sepaPain008.history.messageId', 'MsgId')}</span>
                        </div>
                        <p className="mt-2 break-all font-mono text-sm text-foreground">
                          {run.messageId ?? '—'}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span>{tr('sepaPain008.history.included', 'Incloses')}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {run.includedCount}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>{tr('sepaPain008.history.excluded', 'Excloses')}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {run.excludedCount}
                        </p>
                      </div>

                      <div className="rounded-xl border bg-muted/20 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                          <CalendarDays className="h-3.5 w-3.5" />
                          <span>{tr('sepaPain008.history.createdAt', 'Creada')}</span>
                        </div>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {formatDateTime(run.createdAt)}
                        </p>
                      </div>
                    </div>

                    {run.storagePath && (
                      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <FileClock className="h-3.5 w-3.5" />
                        <span className="break-all">{run.storagePath}</span>
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
