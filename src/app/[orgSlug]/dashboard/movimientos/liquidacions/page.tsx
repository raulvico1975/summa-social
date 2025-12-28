'use client';

import * as React from 'react';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  FileText,
  Plus,
  Info,
  Loader2,
  Archive,
  RotateCcw,
  ChevronRight,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/ui/empty-state';
import {
  listenExpenseReports,
  createExpenseReportDraft,
  archiveExpenseReport,
  restoreExpenseReport,
  type ExpenseReport,
  type ExpenseReportStatus,
} from '@/lib/expense-reports';
import { formatCurrencyEU } from '@/lib/normalize';
import { format } from 'date-fns';
import { ca } from 'date-fns/locale';

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

function getStatusInfo(report: ExpenseReport): StatusInfo {
  const derived = getDerivedStatus(report);

  switch (derived) {
    case 'draft':
      return {
        badge: <Badge variant="outline" className="bg-gray-50 text-gray-700">Esborrany</Badge>,
        tooltip: 'En preparació. Encara no hi ha PDF ni pagament.',
      };
    case 'ready':
      return {
        badge: <Badge variant="outline" className="bg-amber-50 text-amber-700">Preparada</Badge>,
        tooltip: 'PDF generat. Llesta per generar el pagament.',
      };
    case 'sepa_generated':
      return {
        badge: <Badge variant="outline" className="bg-blue-50 text-blue-700">SEPA generat</Badge>,
        tooltip: 'Fitxer de pagament generat. Pendent d\'importar l\'extracte bancari.',
      };
    case 'matched':
      return {
        badge: <Badge variant="outline" className="bg-green-50 text-green-700">Conciliada</Badge>,
        tooltip: 'Pagament conciliat amb el banc.',
      };
    case 'archived':
      return {
        badge: <Badge variant="outline" className="bg-slate-100 text-slate-500">Arxivada</Badge>,
        tooltip: 'Liquidació tancada sense conciliació.',
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
  const { organization, organizationId, userRole } = useCurrentOrganization();
  const { firestore } = useFirebase();
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();

  // Feature flag check
  const isPendingDocsEnabled = organization?.features?.pendingDocs ?? false;

  // Només admins poden operar
  const canOperate = userRole === 'admin';

  // Tab actiu
  const [activeTab, setActiveTab] = React.useState<'draft' | 'submitted' | 'matched' | 'archived'>('draft');

  // Liquidacions
  const [reports, setReports] = React.useState<ExpenseReport[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Creació
  const [isCreating, setIsCreating] = React.useState(false);

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
        title: 'Liquidació creada',
        description: 'Ara pots afegir tiquets i quilometratge.',
      });
      // Navegar al detall (TODO: implementar)
      // router.push(buildUrl(`/dashboard/movimientos/liquidacions/${reportId}`));
    } catch (error) {
      console.error('[handleCreate] Error:', error);
      toast({
        title: 'Error',
        description: 'No s\'ha pogut crear la liquidació.',
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
      toast({ title: 'Liquidació arxivada' });
    } catch (error) {
      console.error('[handleArchive] Error:', error);
      toast({
        title: 'Error',
        description: 'No s\'ha pogut arxivar.',
        variant: 'destructive',
      });
    }
  };

  // Restaurar
  const handleRestore = async (report: ExpenseReport) => {
    if (!organizationId || !firestore) return;

    try {
      await restoreExpenseReport(firestore, organizationId, report.id, 'draft');
      toast({ title: 'Liquidació restaurada' });
    } catch (error) {
      console.error('[handleRestore] Error:', error);
      toast({
        title: 'Error',
        description: 'No s\'ha pogut restaurar.',
        variant: 'destructive',
      });
    }
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
          <h1 className="text-2xl font-bold font-headline">Liquidacions</h1>
        </div>
        <EmptyState
          icon={FileText}
          title="Funcionalitat no activada"
          description="Contacta amb l'administrador per activar el mòdul de documents pendents."
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
            <h1 className="text-2xl font-bold font-headline">Liquidacions</h1>
            <p className="text-muted-foreground text-sm">
              Agrupa tiquets i quilometratge per a reemborsament
            </p>
          </div>
        </div>
        {canOperate && (
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Nova liquidació
          </Button>
        )}
      </div>

      {/* Banner pre-banc */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Pre-banc</AlertTitle>
        <AlertDescription>
          Les liquidacions s'usen per agrupar tiquets i quilometratge abans de fer el reemborsament.
          Quan el banc executi el pagament, podràs conciliar-ho automàticament.
        </AlertDescription>
      </Alert>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList>
          <TabsTrigger value="draft">
            Esborrany
            {counts.draft > 0 && <Badge variant="outline" className="ml-2">{counts.draft}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="submitted">
            Enviades
            {counts.submitted > 0 && <Badge variant="outline" className="ml-2">{counts.submitted}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="matched">
            Conciliades
            {counts.matched > 0 && <Badge variant="outline" className="ml-2">{counts.matched}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="archived">
            Arxivades
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
              title={activeTab === 'draft' ? 'Cap esborrany' : `Cap liquidació ${activeTab}`}
              description={activeTab === 'draft' ? 'Crea una nova liquidació per començar.' : 'No hi ha liquidacions en aquest estat.'}
            />
          ) : (
            <div className="space-y-2">
              {filteredReports.map((report) => (
                <Card key={report.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {report.title || 'Liquidació sense títol'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDateRange(report.dateFrom, report.dateTo)}
                            {report.receiptDocIds.length > 0 && (
                              <span className="ml-2">· {report.receiptDocIds.length} tiquets</span>
                            )}
                            {report.mileage?.km && (
                              <span className="ml-2">· {report.mileage.km} km</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {getStatusInfo(report).tooltip}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold">
                          {formatCurrencyEU(report.totalAmount)}
                        </span>
                        <div className="flex items-center gap-1" title={getStatusInfo(report).tooltip}>
                          {getStatusInfo(report).badge}
                        </div>
                        {report.status === 'draft' && !report.sepa && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleArchive(report)}
                          >
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        {report.status === 'archived' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestore(report)}
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
    </div>
  );
}
