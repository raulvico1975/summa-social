'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslations, type TranslationsContextType } from '@/i18n';
import {
  ArrowLeft,
  FileText,
  Plus,
  Info,
  Loader2,
  Archive,
  RotateCcw,
  ChevronRight,
  Receipt,
  Pencil,
  Trash2,
  Car,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listenExpenseReports,
  createExpenseReportDraft,
  archiveExpenseReport,
  restoreExpenseReport,
  deleteExpenseReport,
  type ExpenseReport,
} from '@/lib/expense-reports';
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
import { formatCurrencyEU } from '@/lib/normalize';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';
import { TicketsInbox } from '@/components/expense-reports/tickets-inbox';

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function formatDateRange(dateFrom: string | null, dateTo: string | null): string {
  if (!dateFrom && !dateTo) return '—';
  if (dateFrom && !dateTo) return format(new Date(dateFrom), 'dd/MM/yyyy', { locale: ca });
  if (!dateFrom && dateTo) return format(new Date(dateTo), 'dd/MM/yyyy', { locale: ca });
  return `${format(new Date(dateFrom!), 'dd/MM', { locale: ca })} - ${format(new Date(dateTo!), 'dd/MM/yyyy', { locale: ca })}`;
}

// Estat derivat per mostrar a l'usuari (no és un camp de Firestore)
type DerivedStatus = 'draft' | 'ready' | 'sepa_generated' | 'matched' | 'archived';

function getDerivedStatus(report: ExpenseReport): DerivedStatus {
  if (report.status === 'archived') return 'archived';
  if (report.status === 'matched' || report.matchedTransactionId) return 'matched';
  if (report.sepa) return 'sepa_generated';
  if (report.generatedPdf) return 'ready';
  return 'draft';
}

interface StatusInfo {
  badge: React.ReactNode;
  tooltip: string;
}

function getStatusInfo(report: ExpenseReport, t: TranslationsContextType['t']): StatusInfo {
  const derived = getDerivedStatus(report);

  switch (derived) {
    case 'draft':
      return {
        badge: <Badge variant="outline" className="bg-gray-50 text-gray-700">{t.expenseReports.statuses.draft}</Badge>,
        tooltip: t.expenseReports.tooltips.draft,
      };
    case 'ready':
      return {
        badge: <Badge variant="outline" className="bg-amber-50 text-amber-700">{t.expenseReports.statuses.ready}</Badge>,
        tooltip: t.expenseReports.tooltips.ready,
      };
    case 'sepa_generated':
      return {
        badge: <Badge variant="outline" className="bg-blue-50 text-blue-700">{t.expenseReports.statuses.sepaGenerated}</Badge>,
        tooltip: t.expenseReports.tooltips.sepaGenerated,
      };
    case 'matched':
      return {
        badge: <Badge variant="outline" className="bg-green-50 text-green-700">{t.expenseReports.statuses.matched}</Badge>,
        tooltip: t.expenseReports.tooltips.matched,
      };
    case 'archived':
      return {
        badge: <Badge variant="outline" className="bg-slate-100 text-slate-500">{t.expenseReports.statuses.archived}</Badge>,
        tooltip: t.expenseReports.tooltips.archived,
      };
    default:
      return {
        badge: <Badge variant="outline">{report.status}</Badge>,
        tooltip: '',
      };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════

export default function LiquidacionsPage() {
  const router = useRouter();
  const { organization, organizationId, userRole } = useCurrentOrganization();
  const { firestore, storage } = useFirebase();
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Feature flag check
  const isPendingDocsEnabled = organization?.features?.pendingDocs ?? false;

  // Només admins poden operar
  const canOperate = userRole === 'admin';

  // Tab principal (liquidacions, tickets o quilometratge)
  const [mainTab, setMainTab] = React.useState<'liquidacions' | 'tickets' | 'quilometratge'>('liquidacions');

  // Tab de liquidacions
  const [activeTab, setActiveTab] = React.useState<'draft' | 'submitted' | 'matched' | 'archived'>('draft');

  // Liquidacions
  const [reports, setReports] = React.useState<ExpenseReport[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Creació
  const [isCreating, setIsCreating] = React.useState(false);

  // Modal confirmació esborrar
  const [reportToDelete, setReportToDelete] = React.useState<ExpenseReport | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Subscripció a liquidacions
  React.useEffect(() => {
    if (!organizationId || !firestore || !isPendingDocsEnabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = listenExpenseReports(
      firestore,
      organizationId,
      {}, // Tots els estats
      (data) => {
        setReports(data);
        setIsLoading(false);
      },
      (error) => {
        console.error('[LiquidacionsPage] Error:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [organizationId, firestore, isPendingDocsEnabled]);

  // Filtrar per tab
  const filteredReports = React.useMemo(() => {
    return reports.filter((r) => r.status === activeTab);
  }, [reports, activeTab]);

  // Comptadors
  const counts = React.useMemo(() => ({
    draft: reports.filter((r) => r.status === 'draft').length,
    submitted: reports.filter((r) => r.status === 'submitted').length,
    matched: reports.filter((r) => r.status === 'matched').length,
    archived: reports.filter((r) => r.status === 'archived').length,
  }), [reports]);

  // Crear nova liquidació
  const handleCreate = async () => {
    if (!organizationId || !firestore) return;

    setIsCreating(true);
    try {
      const reportId = await createExpenseReportDraft(firestore, organizationId);
      toast({
        title: t.expenseReports.toasts.created,
        description: t.expenseReports.toasts.createdDesc,
      });
      // Navegar al detall
      router.push(buildUrl(`/dashboard/movimientos/liquidacions/${reportId}`));
    } catch (error) {
      console.error('[handleCreate] Error:', error);
      toast({
        title: t.expenseReports.toasts.error,
        description: t.expenseReports.toasts.errorCreate,
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Arxivar
  const handleArchive = async (report: ExpenseReport) => {
    if (!organizationId || !firestore) return;

    try {
      await archiveExpenseReport(firestore, organizationId, report.id);
      toast({ title: t.expenseReports.toasts.archived });
    } catch (error) {
      console.error('[handleArchive] Error:', error);
      toast({
        title: t.expenseReports.toasts.error,
        description: t.expenseReports.toasts.errorArchive,
        variant: 'destructive',
      });
    }
  };

  // Restaurar
  const handleRestore = async (report: ExpenseReport) => {
    if (!organizationId || !firestore) return;

    try {
      await restoreExpenseReport(firestore, organizationId, report.id, 'draft');
      toast({ title: t.expenseReports.toasts.restored });
    } catch (error) {
      console.error('[handleRestore] Error:', error);
      toast({
        title: t.expenseReports.toasts.error,
        description: t.expenseReports.toasts.errorRestore,
        variant: 'destructive',
      });
    }
  };

  // Esborrar (amb confirmació)
  const handleDelete = async () => {
    if (!organizationId || !firestore || !reportToDelete) return;

    setIsDeleting(true);
    try {
      await deleteExpenseReport(firestore, organizationId, reportToDelete.id);
      toast({ title: t.expenseReports.toasts.deleted });
      setReportToDelete(null);
    } catch (error) {
      console.error('[handleDelete] Error:', error);
      toast({
        title: t.expenseReports.toasts.error,
        description: t.expenseReports.toasts.errorDelete,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Editar (navegar al detall)
  const handleEdit = (report: ExpenseReport) => {
    router.push(buildUrl(`/dashboard/movimientos/liquidacions/${report.id}`));
  };

  // Si no té el feature activat, mostrar missatge
  if (!isPendingDocsEnabled) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={buildUrl('/dashboard/movimientos')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold font-headline">{t.expenseReports.title}</h1>
        </div>
        <EmptyState
          icon={FileText}
          title={t.expenseReports.featureDisabled}
          description={t.expenseReports.featureDisabledDesc}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={buildUrl('/dashboard/movimientos')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold font-headline">{t.expenseReports.title}</h1>
            <p className="text-muted-foreground text-sm">
              {t.expenseReports.subtitle}
            </p>
          </div>
        </div>
        {canOperate && mainTab === 'liquidacions' && (
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t.expenseReports.actions.create}
          </Button>
        )}
      </div>

      {/* Tabs principals: Liquidacions / Tickets */}
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as typeof mainTab)}>
        <TabsList>
          <TabsTrigger value="liquidacions" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Liquidacions
          </TabsTrigger>
          <TabsTrigger value="tickets" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Tickets
          </TabsTrigger>
          <TabsTrigger value="quilometratge" className="flex items-center gap-2">
            <Car className="h-4 w-4" />
            Quilometratge
          </TabsTrigger>
        </TabsList>

        {/* Tab Liquidacions */}
        <TabsContent value="liquidacions" className="mt-4 space-y-4">
          {/* Banner pre-banc */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>{t.expenseReports.banners.prebank}</AlertTitle>
            <AlertDescription>
              {t.expenseReports.banners.prebankDescription}
            </AlertDescription>
          </Alert>

          {/* Subtabs de liquidacions */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList>
              <TabsTrigger value="draft">
                {t.expenseReports.tabs.draft}
                {counts.draft > 0 && <Badge variant="outline" className="ml-2">{counts.draft}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="submitted">
                {t.expenseReports.tabs.submitted}
                {counts.submitted > 0 && <Badge variant="outline" className="ml-2">{counts.submitted}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="matched">
                {t.expenseReports.tabs.matched}
                {counts.matched > 0 && <Badge variant="outline" className="ml-2">{counts.matched}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="archived">
                {t.expenseReports.tabs.archived}
                {counts.archived > 0 && <Badge variant="outline" className="ml-2">{counts.archived}</Badge>}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredReports.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={(t.expenseReports.empty as Record<string, string>)[activeTab]}
                  description={(t.expenseReports.empty as Record<string, string>)[`${activeTab}Desc`]}
                />
              ) : (
                <div className="space-y-2">
                  {filteredReports.map((report) => (
                    <Card
                      key={report.id}
                      className="hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => router.push(buildUrl(`/dashboard/movimientos/liquidacions/${report.id}`))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {report.title || t.expenseReports.empty.noTitle}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateRange(report.dateFrom, report.dateTo)}
                                {report.receiptDocIds.length > 0 && (
                                  <span className="ml-2">· {t.expenseReports.details.receipts({ count: report.receiptDocIds.length })}</span>
                                )}
                                {report.mileage?.km && (
                                  <span className="ml-2">· {t.expenseReports.details.km({ km: report.mileage.km })}</span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground/70 mt-0.5">
                                {getStatusInfo(report, t).tooltip}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold">
                              {formatCurrencyEU(report.totalAmount)}
                            </span>
                            <div className="flex items-center gap-1" title={getStatusInfo(report, t).tooltip}>
                              {getStatusInfo(report, t).badge}
                            </div>
                            {/* Editar - draft i submitted */}
                            {(report.status === 'draft' || report.status === 'submitted') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(report);
                                }}
                                title={t.common.edit}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Esborrar - draft i submitted (sense SEPA) */}
                            {(report.status === 'draft' || report.status === 'submitted') && !report.sepa && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReportToDelete(report);
                                }}
                                title={t.common.delete}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {/* Arxivar - draft sense SEPA */}
                            {report.status === 'draft' && !report.sepa && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleArchive(report);
                                }}
                                title={t.common.archive}
                              >
                                <Archive className="h-4 w-4" />
                              </Button>
                            )}
                            {report.status === 'archived' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRestore(report);
                                }}
                                title={t.common.restore}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Tab Tickets */}
        <TabsContent value="tickets" className="mt-4">
          {organizationId && firestore && storage && (
            <TicketsInbox
              firestore={firestore}
              storage={storage}
              organizationId={organizationId}
              canOperate={canOperate}
            />
          )}
        </TabsContent>

        {/* Tab Quilometratge */}
        <TabsContent value="quilometratge" className="mt-4 space-y-4">
          <Alert>
            <Car className="h-4 w-4" />
            <AlertTitle>Quilometratge</AlertTitle>
            <AlertDescription>
              Gestiona el quilometratge de cada liquidació. Selecciona una liquidació per afegir o editar línies de quilometratge.
            </AlertDescription>
          </Alert>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reports.filter((r) => r.status === 'draft' || r.status === 'submitted').length === 0 ? (
            <EmptyState
              icon={Car}
              title="Cap liquidació disponible"
              description="Crea una liquidació per poder afegir quilometratge."
            />
          ) : (
            <div className="space-y-2">
              {reports
                .filter((r) => r.status === 'draft' || r.status === 'submitted')
                .map((report) => {
                  const mileageTotal = report.mileageItems?.reduce((sum, item) => sum + item.totalEur, 0) ?? 0;
                  const mileageCount = report.mileageItems?.length ?? 0;

                  return (
                    <Card
                      key={report.id}
                      className="hover:shadow-sm transition-shadow cursor-pointer"
                      onClick={() => router.push(buildUrl(`/dashboard/movimientos/liquidacions/${report.id}#quilometratge`))}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Car className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <p className="font-medium">
                                {report.title || t.expenseReports.empty.noTitle}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {formatDateRange(report.dateFrom, report.dateTo)}
                                {mileageCount > 0 && (
                                  <span className="ml-2">
                                    · {mileageCount} {mileageCount === 1 ? 'línia' : 'línies'}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {mileageCount > 0 && (
                              <span className="font-semibold">
                                {formatCurrencyEU(mileageTotal)}
                              </span>
                            )}
                            <div className="flex items-center gap-1">
                              {getStatusInfo(report, t).badge}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(buildUrl(`/dashboard/movimientos/liquidacions/${report.id}#quilometratge`));
                              }}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Gestionar
                            </Button>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal confirmació esborrar */}
      <AlertDialog open={!!reportToDelete} onOpenChange={(open) => !open && setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.expenseReports.confirmDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.expenseReports.confirmDelete.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              {t.expenseReports.confirmDelete.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {t.expenseReports.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
