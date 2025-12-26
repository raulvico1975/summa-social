// src/app/[orgSlug]/dashboard/project-module/projects/[projectId]/budget/page.tsx
// Pressupost del projecte amb partides i execució

'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useProjectDetail,
  useProjectBudgetLines,
  useSaveBudgetLine,
  useProjectExpenseLinks,
  useUnifiedExpenseFeed,
  useSaveProjectFx,
} from '@/hooks/use-project-module';
import { useOrgUrl } from '@/hooks/organization-provider';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Download,
  Loader2,
  Eye,
  Info,
  FileArchive,
  Compass,
  DollarSign,
} from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { doc, getDoc } from 'firebase/firestore';
import { buildProjectJustificationFundingXlsx } from '@/lib/project-justification-export';
import { exportProjectJustificationZip } from '@/lib/project-justification-attachments-zip';
import { trackUX } from '@/lib/ux/trackUX';
import { useRouter } from 'next/navigation';
import type { BudgetLine, BudgetLineFormData } from '@/lib/project-module-types';
import { BalanceProjectModal } from '@/components/project-module/balance-project-modal';

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

// Component per al formulari de partida
function BudgetLineForm({
  open,
  onOpenChange,
  onSave,
  isSaving,
  initialData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: BudgetLineFormData) => Promise<void>;
  isSaving: boolean;
  initialData?: BudgetLine | null;
}) {
  const { t } = useTranslations();
  const [name, setName] = React.useState('');
  const [code, setCode] = React.useState('');
  const [budgetedAmountEUR, setBudgetedAmountEUR] = React.useState('');
  const [order, setOrder] = React.useState('');
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setCode(initialData.code ?? '');
        setBudgetedAmountEUR(initialData.budgetedAmountEUR.toString());
        setOrder(initialData.order?.toString() ?? '');
      } else {
        setName('');
        setCode('');
        setBudgetedAmountEUR('');
        setOrder('');
      }
      setErrors({});
    }
  }, [open, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t.projectModule?.nameRequired ?? 'El nom és obligatori';
    }

    const amount = parseFloat(budgetedAmountEUR.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      newErrors.budgetedAmountEUR = t.projectModule?.amountPositive ?? 'L\'import ha de ser positiu';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    await onSave({
      name: name.trim(),
      code: code.trim(),
      budgetedAmountEUR: budgetedAmountEUR.replace(',', '.'),
      order,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {initialData ? (t.projectModule?.editBudgetLine ?? 'Editar partida') : (t.projectModule?.addBudgetLine ?? 'Afegir partida')}
          </DialogTitle>
          <DialogDescription>
            {t.projectModule?.budgetLineDescription ?? 'Defineix una partida del pressupost'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t.projectModule?.lineName ?? 'Nom de la partida'} *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="p.ex. Personal, Materials, Viatges..."
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="code">{t.projectModule?.lineCode ?? 'Codi'}</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="p.ex. A1, B2..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="budgetedAmountEUR">{t.projectModule?.budgetedAmount ?? 'Import pressupostat (€)'} *</Label>
            <Input
              id="budgetedAmountEUR"
              type="text"
              inputMode="decimal"
              value={budgetedAmountEUR}
              onChange={(e) => setBudgetedAmountEUR(e.target.value)}
              placeholder="0,00"
              className={errors.budgetedAmountEUR ? 'border-destructive' : ''}
            />
            {errors.budgetedAmountEUR && <p className="text-sm text-destructive">{errors.budgetedAmountEUR}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="order">{t.projectModule?.lineOrder ?? 'Ordre'}</Label>
            <Input
              id="order"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              placeholder="1, 2, 3..."
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {t.common?.cancel ?? 'Cancel·lar'}
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (t.common?.saving ?? 'Desant...') : (t.common?.save ?? 'Desar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProjectBudgetPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();
  const { t } = useTranslations();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  // Track page open
  React.useEffect(() => {
    trackUX('budget.open', { projectId });
  }, [projectId]);

  const { project, isLoading: projectLoading, error: projectError, refresh: refreshProject } = useProjectDetail(projectId);
  const { budgetLines, isLoading: linesLoading, error: linesError, refresh: refreshLines } = useProjectBudgetLines(projectId);
  const { expenseLinks, isLoading: linksLoading } = useProjectExpenseLinks(projectId);
  const { expenses: allExpenses, isLoading: expensesLoading } = useUnifiedExpenseFeed({ projectId });
  // Pool complet per al modal de justificació (inclou TOTES les despeses, no només les linkades al projecte)
  const { expenses: allExpensesForModal, isLoading: allExpensesLoading } = useUnifiedExpenseFeed();
  const { save, remove, isSaving } = useSaveBudgetLine();
  const { saveFx, isSaving: isSavingFx } = useSaveProjectFx();

  const [formOpen, setFormOpen] = React.useState(false);
  const [editingLine, setEditingLine] = React.useState<BudgetLine | null>(null);
  const [deleteConfirm, setDeleteConfirm] = React.useState<BudgetLine | null>(null);
  const [isExportingFunding, setIsExportingFunding] = React.useState(false);
  const [isExportingZip, setIsExportingZip] = React.useState(false);
  const [zipProgress, setZipProgress] = React.useState<{ current: number; total: number } | null>(null);
  const [justificationModalOpen, setJustificationModalOpen] = React.useState(false);

  // Estat per edició FX
  const [fxEditMode, setFxEditMode] = React.useState(false);
  const [fxRateInput, setFxRateInput] = React.useState('');
  const [fxCurrencyInput, setFxCurrencyInput] = React.useState('');

  // Inicialitzar inputs FX quan es carrega el projecte
  React.useEffect(() => {
    if (project) {
      setFxRateInput(project.fxRate?.toString() ?? '');
      setFxCurrencyInput(project.fxCurrency ?? '');
    }
  }, [project]);

  // Calcular execució per partida
  const executionByLine = React.useMemo(() => {
    const map = new Map<string, number>();

    for (const link of expenseLinks) {
      for (const assignment of link.assignments) {
        if (assignment.budgetLineId) {
          const current = map.get(assignment.budgetLineId) ?? 0;
          map.set(assignment.budgetLineId, current + Math.abs(assignment.amountEUR));
        }
      }
    }

    return map;
  }, [expenseLinks]);

  // Calcular totals
  const totals = React.useMemo(() => {
    let budgeted = 0;
    let executed = 0;

    for (const line of budgetLines) {
      budgeted += line.budgetedAmountEUR;
      executed += executionByLine.get(line.id) ?? 0;
    }

    return { budgeted, executed, difference: executed - budgeted };
  }, [budgetLines, executionByLine]);

  const handleSave = async (data: BudgetLineFormData) => {
    try {
      await save(projectId, data, editingLine?.id);
      toast({
        title: editingLine ? 'Partida actualitzada' : 'Partida creada',
        description: `La partida "${data.name}" s'ha desat correctament.`,
      });
      setFormOpen(false);
      setEditingLine(null);
      await refreshLines();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desant partida',
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await remove(projectId, deleteConfirm.id);
      toast({
        title: 'Partida eliminada',
        description: `La partida "${deleteConfirm.name}" s'ha eliminat.`,
      });
      setDeleteConfirm(null);
      await refreshLines();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error eliminant partida',
      });
    }
  };

  const openEdit = (line: BudgetLine, e?: React.MouseEvent) => {
    e?.stopPropagation();
    trackUX('budget.editLine.open', { lineId: line.id, lineName: line.name });
    setEditingLine(line);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingLine(null);
    setFormOpen(true);
  };

  const handleRowClick = (line: BudgetLine) => {
    trackUX('budget.row.click', { lineId: line.id, lineName: line.name });
    const url = buildUrl(`/dashboard/project-module/expenses?projectId=${projectId}&budgetLineId=${line.id}`);
    router.push(url);
  };

  const handleViewExpenses = () => {
    trackUX('budget.viewExpenses.click', { projectId });
    const url = buildUrl(`/dashboard/project-module/expenses?projectId=${projectId}`);
    router.push(url);
  };

  const handleExportFunding = async () => {
    if (!organizationId || !project) return;

    setIsExportingFunding(true);
    try {
      // Construir mapa de despeses per buildJustificationRows
      const expenseMap = new Map(allExpenses.map((e) => [e.expense.txId, e.expense]));

      const { blob, filename } = buildProjectJustificationFundingXlsx({
        projectId,
        projectCode: project.code ?? '',
        projectName: project.name,
        budgetLines,
        expenseLinks,
        expenses: expenseMap,
      });

      // Descarregar fitxer
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Excel generat',
        description: `S'ha descarregat el fitxer ${filename}`,
      });
    } catch (err) {
      console.error('Error exporting funding:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error generant Excel',
      });
    } finally {
      setIsExportingFunding(false);
    }
  };

  // Comptar assignacions del projecte (per decidir si el botó s'ha de desactivar)
  const projectAssignmentsCount = React.useMemo(() => {
    let count = 0;
    for (const link of expenseLinks) {
      for (const assignment of link.assignments) {
        if (assignment.projectId === projectId) {
          count++;
        }
      }
    }
    return count;
  }, [expenseLinks, projectId]);

  const handleExportZip = async () => {
    if (!organizationId || !project) return;

    trackUX('budget.downloadZip.click', { projectId, entriesCount: projectAssignmentsCount });
    setIsExportingZip(true);
    setZipProgress(null);

    try {
      // Obtenir nom de l'organització
      const orgDoc = await getDoc(doc(firestore, 'organizations', organizationId));
      const orgName = orgDoc.data()?.name ?? 'Organitzacio';

      // Extreure les despeses del feed (que ja té tota la info)
      const expenses = allExpenses.map((e) => e.expense);

      const result = await exportProjectJustificationZip(
        {
          organizationId,
          organizationName: orgName,
          projectId,
          projectCode: project.code ?? '',
          projectName: project.name,
          allowedDeviationPct: project.allowedDeviationPct ?? 10,
          budgetLines,
          expenses,
          expenseLinks,
        },
        (current, total) => {
          setZipProgress({ current, total });
        }
      );

      trackUX('budget.downloadZip.done', {
        entriesCount: result.entriesCount,
        okCount: result.okCount,
        missingCount: result.missingCount,
        fetchErrorCount: result.fetchErrorCount,
      });

      toast({
        title: t.projectModule?.zipGenerated ?? 'ZIP generat',
        description: `${result.okCount} comprovants descarregats. ${result.missingCount > 0 ? `${result.missingCount} sense document.` : ''}`,
      });
    } catch (err) {
      console.error('Error exporting ZIP:', err);
      trackUX('budget.downloadZip.error', { message: err instanceof Error ? err.message : 'Error desconegut' });
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error generant ZIP',
      });
    } finally {
      setIsExportingZip(false);
      setZipProgress(null);
    }
  };

  if (projectLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (projectError || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Error carregant projecte</p>
        <p className="text-muted-foreground text-sm">{projectError?.message ?? 'Projecte no trobat'}</p>
        <Link href={buildUrl('/dashboard/project-module/projects')}>
          <Button variant="outline">Tornar a projectes</Button>
        </Link>
      </div>
    );
  }

  const allowedDeviation = project.allowedDeviationPct ?? 10;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={buildUrl('/dashboard/project-module/projects')}>
          <Button variant="ghost" size="icon" title={t.projectModule?.backToProjects ?? 'Tornar a projectes'}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Gestió Econòmica</h1>
          <p className="text-muted-foreground">
            {project.name} {project.code && `(${project.code})`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              trackUX('budget.justification.open', { projectId });
              setJustificationModalOpen(true);
            }}
          >
            <Compass className="h-4 w-4 mr-2" />
            Iniciar justificació
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleViewExpenses}
            title={t.projectModule?.viewExpensesTooltip ?? 'Veure despeses del projecte'}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportFunding}
            disabled={isExportingFunding || expensesLoading || projectAssignmentsCount === 0}
            title={t.projectModule?.exportExcel ?? 'Exportar justificació (Excel)'}
          >
            {isExportingFunding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleExportZip}
            disabled={isExportingZip || expensesLoading || projectAssignmentsCount === 0}
            title={t.projectModule?.downloadAttachments ?? 'Baixar comprovants (ZIP)'}
          >
            {isExportingZip ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileArchive className="h-4 w-4" />
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={openNew} title={t.projectModule?.addBudgetLine ?? 'Afegir partida'}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resum */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.projectModule?.budgetTotalLabel ?? 'Pressupost total del projecte'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(totals.budgeted)}</p>
            {budgetLines.length > 0 && totals.budgeted > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {t.projectModule?.budgetTotalHintFromLines ?? 'Calculat automàticament a partir de les partides.'}
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t.projectModule?.executed ?? 'Executat'}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatAmount(totals.executed)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {totals.difference > 0
                ? (t.projectModule?.overspend ?? 'Sobreexecució')
                : (t.projectModule?.pending ?? 'Pendent')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${totals.difference > 0 ? 'text-red-600' : ''}`}>
              {formatAmount(Math.abs(totals.budgeted - totals.executed))}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Configuració FX per despeses off-bank */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t.projectModule?.fxConfig ?? 'Tipus de canvi del projecte'}</CardTitle>
            </div>
            {!fxEditMode && (
              <Button variant="ghost" size="sm" onClick={() => setFxEditMode(true)} title={t.projectModule?.editFx ?? 'Editar tipus de canvi'}>
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
          <CardDescription className="text-xs">
            {t.projectModule?.fxConfigDesc ?? 'Per despeses de terreny (off-bank) en moneda local. Ex: 655.957 XOF = 1 EUR'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fxEditMode ? (
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1">
                <Label htmlFor="fxRate" className="text-xs">{t.projectModule?.fxRate ?? 'Tipus de canvi'}</Label>
                <Input
                  id="fxRate"
                  type="text"
                  inputMode="decimal"
                  value={fxRateInput}
                  onChange={(e) => setFxRateInput(e.target.value)}
                  placeholder="655.957"
                  className="h-9"
                />
              </div>
              <div className="w-24 space-y-1">
                <Label htmlFor="fxCurrency" className="text-xs">{t.projectModule?.currency ?? 'Moneda'}</Label>
                <Input
                  id="fxCurrency"
                  type="text"
                  value={fxCurrencyInput}
                  onChange={(e) => setFxCurrencyInput(e.target.value.toUpperCase())}
                  placeholder="XOF"
                  maxLength={3}
                  className="h-9 font-mono"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFxEditMode(false);
                    setFxRateInput(project.fxRate?.toString() ?? '');
                    setFxCurrencyInput(project.fxCurrency ?? '');
                  }}
                  disabled={isSavingFx}
                >
                  {t.common?.cancel ?? 'Cancel·lar'}
                </Button>
                <Button
                  size="sm"
                  onClick={async () => {
                    const rate = fxRateInput ? parseFloat(fxRateInput.replace(',', '.')) : null;
                    if (fxRateInput && (isNaN(rate!) || rate! <= 0)) {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: t.projectModule?.fxRatePositive ?? 'El tipus de canvi ha de ser positiu',
                      });
                      return;
                    }
                    try {
                      await saveFx(projectId, rate, fxCurrencyInput || null);
                      toast({
                        title: t.projectModule?.fxSaved ?? 'Tipus de canvi desat',
                        description: rate ? `${rate} ${fxCurrencyInput} = 1 EUR` : 'Tipus de canvi eliminat',
                      });
                      setFxEditMode(false);
                      await refreshProject();
                    } catch (err) {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description: err instanceof Error ? err.message : 'Error desant tipus de canvi',
                      });
                    }
                  }}
                  disabled={isSavingFx}
                >
                  {isSavingFx ? <Loader2 className="h-4 w-4 animate-spin" /> : (t.common?.save ?? 'Desar')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              {project.fxRate ? (
                <>
                  <span className="font-mono font-medium">{project.fxRate}</span>
                  <span className="text-muted-foreground">{project.fxCurrency ?? ''}</span>
                  <span className="text-muted-foreground">= 1 EUR</span>
                </>
              ) : (
                <span className="text-muted-foreground italic">
                  {t.projectModule?.noFxConfigured ?? 'No configurat. Les despeses off-bank es registraran directament en EUR.'}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Taula de partides */}
      <Card>
        <CardHeader>
          <CardTitle>{t.projectModule?.budgetLines ?? 'Seguiment Econòmic'}</CardTitle>
        </CardHeader>
        <CardContent>
          {linesLoading || linksLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : linesError ? (
            <div className="text-center py-8 text-destructive">
              Error carregant partides: {linesError.message}
            </div>
          ) : budgetLines.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t.projectModule?.noBudgetDefined ?? 'Aquest projecte encara no té pressupost.'}</p>
              <Button onClick={openNew} variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                {t.projectModule?.addBudgetLine ?? 'Afegir partida'}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">{t.projectModule?.lineCode ?? 'Codi'}</TableHead>
                  <TableHead>{t.projectModule?.lineName ?? 'Partida'}</TableHead>
                  <TableHead className="text-right">{t.projectModule?.budgeted ?? 'Pressupostat'}</TableHead>
                  <TableHead className="text-right">{t.projectModule?.executed ?? 'Executat'}</TableHead>
                  <TableHead className="text-right">%</TableHead>
                  <TableHead className="text-right">{t.projectModule?.pending ?? 'Pendent'}</TableHead>
                  <TableHead className="w-[100px]">{t.projectModule?.status ?? 'Estat'}</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgetLines.map((line) => {
                  const executed = executionByLine.get(line.id) ?? 0;
                  const pending = line.budgetedAmountEUR - executed; // pendent = pressupostat - executat
                  const percentExec = line.budgetedAmountEUR > 0 ? (executed / line.budgetedAmountEUR) * 100 : 0;

                  // Estat: OK si executat <= pressupostat * (1 + allowedDeviationPct/100)
                  // ALERTA si executat > pressupostat * (1 + allowedDeviationPct/100)
                  // INFO si executat === 0
                  const maxAllowed = line.budgetedAmountEUR * (1 + allowedDeviation / 100);
                  const isOverspend = executed > maxAllowed;
                  const hasNoExecution = executed === 0;

                  // Determinar què mostrar a la columna Pendent/Sobreexecució
                  const showOverspend = pending < 0;

                  return (
                    <TableRow
                      key={line.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleRowClick(line)}
                    >
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {line.code ?? '-'}
                      </TableCell>
                      <TableCell className="font-medium">{line.name}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(line.budgetedAmountEUR)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(executed)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatPercent(percentExec)}
                      </TableCell>
                      <TableCell className={`text-right font-mono ${showOverspend ? 'text-red-600' : ''}`}>
                        {showOverspend
                          ? `${t.projectModule?.overspend ?? 'Sobreexecució'}: ${formatAmount(Math.abs(pending))}`
                          : formatAmount(pending)}
                      </TableCell>
                      <TableCell>
                        {hasNoExecution ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Info className="h-3 w-3 mr-1" />
                            {t.projectModule?.noExecution ?? 'Sense execució'}
                          </Badge>
                        ) : isOverspend ? (
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            ALERTA
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => openEdit(line, e)}
                            title={t.projectModule?.editBudgetLine ?? 'Editar partida'}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(line);
                            }}
                            title={t.projectModule?.deleteBudgetLine ?? 'Eliminar partida'}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Form Modal */}
      <BudgetLineForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingLine(null);
        }}
        onSave={handleSave}
        isSaving={isSaving}
        initialData={editingLine}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar partida</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs segur que vols eliminar la partida &quot;{deleteConfirm?.name}&quot;?
              Aquesta acció no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Quadrar projecte */}
      <BalanceProjectModal
        open={justificationModalOpen}
        onOpenChange={setJustificationModalOpen}
        guidedMode={true}
        project={project}
        budgetLines={budgetLines}
        expenseLinks={expenseLinks}
        allExpenses={allExpensesForModal}
        onSuccess={async () => {
          await refreshLines();
        }}
      />
    </div>
  );
}
