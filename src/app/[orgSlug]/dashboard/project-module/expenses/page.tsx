// src/app/[orgSlug]/dashboard/project-module/expenses/page.tsx
// Inbox de despeses assignables a projectes

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUnifiedExpenseFeed, useProjects, useSaveExpenseLink, useProjectBudgetLines } from '@/hooks/use-project-module';
import { useOrgUrl, useCurrentOrganization } from '@/hooks/organization-provider';
import { useToast } from '@/hooks/use-toast';
import { trackUX } from '@/lib/ux/trackUX';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, RefreshCw, ChevronRight, FolderPlus, Check, MoreHorizontal, Split, X, Plus, Landmark, Globe, ArrowLeft, FolderKanban, Filter, Pencil, Trash2, Search, Circle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDateDMY } from '@/lib/normalize';
import { AssignmentEditor } from '@/components/project-module/assignment-editor';
import type { ExpenseStatus, UnifiedExpenseWithLink, Project, ExpenseAssignment, BudgetLine } from '@/lib/project-module-types';
import { useTranslations } from '@/i18n';
import { OffBankExpenseModal } from '@/components/project-module/add-off-bank-expense-modal';

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Component per mostrar i gestionar assignacions amb popover
function AssignmentStatusPopover({
  expense,
  status,
  assignedAmount,
  totalAmount,
  assignments,
  onRemoveAssignment,
  onUnassignAll,
  onEditAssignment,
  isSaving,
}: {
  expense: UnifiedExpenseWithLink;
  status: ExpenseStatus;
  assignedAmount: number;
  totalAmount: number;
  assignments?: ExpenseAssignment[];
  onRemoveAssignment: (txId: string, assignmentIndex: number) => Promise<void>;
  onUnassignAll: (txId: string) => Promise<void>;
  onEditAssignment: (expense: UnifiedExpenseWithLink) => void;
  isSaving: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const percentage = totalAmount > 0 ? Math.round((assignedAmount / totalAmount) * 100) : 0;

  // Si no té assignacions, mostrar badge simple
  if (status === 'unassigned' || !assignments || assignments.length === 0) {
    return <Badge variant="outline">0%</Badge>;
  }

  const badgeClass = status === 'assigned'
    ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
    : 'bg-yellow-500 text-black hover:bg-yellow-600 cursor-pointer';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Badge variant="default" className={badgeClass}>
          {status === 'assigned' ? '100%' : `${percentage}%`}
        </Badge>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">Assignacions</span>
            <span className="text-xs text-muted-foreground font-mono">
              {formatAmount(assignedAmount)} / {formatAmount(totalAmount)}
            </span>
          </div>
        </div>
        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
          {assignments.map((assignment, index) => (
            <div
              key={`${assignment.projectId}-${assignment.budgetLineId ?? 'none'}-${index}`}
              className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50 group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{assignment.projectName}</div>
                {assignment.budgetLineName && (
                  <div className="text-xs text-muted-foreground truncate">
                    {assignment.budgetLineName}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-mono text-muted-foreground">
                  {formatAmount(Math.abs(assignment.amountEUR))}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  onClick={async (e) => {
                    e.stopPropagation();
                    await onRemoveAssignment(expense.expense.txId, index);
                    if (assignments.length === 1) {
                      setOpen(false);
                    }
                  }}
                  disabled={isSaving}
                  title="Eliminar aquesta assignació"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 border-t flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => {
              setOpen(false);
              onEditAssignment(expense);
            }}
          >
            <Split className="h-3 w-3 mr-1" />
            Editar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 text-xs text-destructive hover:text-destructive"
            onClick={async () => {
              await onUnassignAll(expense.expense.txId);
              setOpen(false);
            }}
            disabled={isSaving}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Eliminar tot
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Component per Quick Assign amb Popover (amb selecció de partida)
function QuickAssignPopover({
  expense,
  projects,
  onAssign100,
  onOpenSplitModal,
  isAssigning,
  assignTooltip,
}: {
  expense: UnifiedExpenseWithLink;
  projects: Project[];
  onAssign100: (txId: string, project: Project, budgetLine?: BudgetLine | null) => Promise<void>;
  onOpenSplitModal: (expense: UnifiedExpenseWithLink) => void;
  isAssigning: boolean;
  assignTooltip: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [selectedProject, setSelectedProject] = React.useState<Project | null>(null);

  // Carregar partides quan es selecciona un projecte
  const { budgetLines, isLoading: budgetLinesLoading } = useProjectBudgetLines(selectedProject?.id ?? '');

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setSearch('');
  };

  const handleSelectBudgetLine = async (budgetLine: BudgetLine | null) => {
    if (!selectedProject) return;
    setOpen(false);
    setSelectedProject(null);
    setSearch('');
    await onAssign100(expense.expense.txId, selectedProject, budgetLine);
  };

  const handleBack = () => {
    setSelectedProject(null);
    setSearch('');
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSelectedProject(null);
      setSearch('');
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          disabled={isAssigning}
          title={assignTooltip}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        {!selectedProject ? (
          // Pas 1: Seleccionar projecte
          <Command>
            <CommandInput
              placeholder="Cerca projecte..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>No s'han trobat projectes</CommandEmpty>
              <CommandGroup heading="Assignar 100%">
                {filteredProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() => handleSelectProject(project)}
                    className="cursor-pointer"
                  >
                    <ChevronRight className="mr-2 h-4 w-4" />
                    <div className="flex-1">
                      <span>{project.name}</span>
                      {project.code && (
                        <span className="ml-2 text-muted-foreground text-xs">({project.code})</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    onOpenSplitModal(expense);
                  }}
                  className="cursor-pointer"
                >
                  <Split className="mr-2 h-4 w-4" />
                  Assignació múltiple...
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          // Pas 2: Seleccionar partida
          <Command>
            <div className="flex items-center border-b px-3 py-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 mr-2"
                onClick={handleBack}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium truncate">{selectedProject.name}</span>
            </div>
            <CommandList>
              {budgetLinesLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Carregant partides...
                </div>
              ) : budgetLines.length === 0 ? (
                <CommandGroup heading="Sense partides">
                  <CommandItem
                    onSelect={() => handleSelectBudgetLine(null)}
                    className="cursor-pointer"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Assignar sense partida
                  </CommandItem>
                </CommandGroup>
              ) : (
                <>
                  <CommandGroup heading="Selecciona partida">
                    {budgetLines.map((line) => (
                      <CommandItem
                        key={line.id}
                        onSelect={() => handleSelectBudgetLine(line)}
                        className="cursor-pointer"
                      >
                        <Check className="mr-2 h-4 w-4 opacity-0" />
                        <div className="flex-1">
                          <span>{line.code ? `${line.code} - ` : ''}{line.name}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  <CommandSeparator />
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => handleSelectBudgetLine(null)}
                      className="cursor-pointer text-muted-foreground"
                    >
                      <X className="mr-2 h-4 w-4" />
                      Sense partida
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function ExpensesInboxPage() {
  const { t } = useTranslations();
  const ep = t.projectModule.expensesPage;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { buildUrl } = useOrgUrl();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();

  // Llegir filtres de query params
  const projectIdFilter = searchParams.get('projectId');
  const budgetLineIdFilter = searchParams.get('budgetLineId');

  const { expenses, isLoading, isLoadingMore, error, refresh, loadMore, hasMore, isFiltered, usedFallback } = useUnifiedExpenseFeed({
    projectId: projectIdFilter,
    budgetLineId: budgetLineIdFilter,
  });
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects(true);
  const { save, remove, isSaving } = useSaveExpenseLink();

  // Track page open
  React.useEffect(() => {
    trackUX('expenses.open', {
      filtered: isFiltered,
      projectId: projectIdFilter,
      budgetLineId: budgetLineIdFilter,
    });
  }, [isFiltered, projectIdFilter, budgetLineIdFilter]);

  // Track fallback used
  React.useEffect(() => {
    if (usedFallback) {
      trackUX('expenses.filter.fallback_used', {
        projectId: projectIdFilter,
        budgetLineId: budgetLineIdFilter,
      });
    }
  }, [usedFallback, projectIdFilter, budgetLineIdFilter]);

  // Handler per treure filtre
  const handleClearFilter = () => {
    trackUX('expenses.filter.clear', {
      projectId: projectIdFilter,
      budgetLineId: budgetLineIdFilter,
    });
    router.push(buildUrl('/dashboard/project-module/expenses'));
  };

  // Tradueix el nom de categoria (si és una clau coneguda)
  const getCategoryLabel = (categoryName: string | null): string => {
    if (!categoryName) return '-';
    const translated = (t.categories as Record<string, string>)?.[categoryName];
    return translated ?? categoryName;
  };

  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [splitModalExpense, setSplitModalExpense] = React.useState<UnifiedExpenseWithLink | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = React.useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = React.useState(false);
  const [addOffBankOpen, setAddOffBankOpen] = React.useState(false);
  const [editOffBankExpense, setEditOffBankExpense] = React.useState<UnifiedExpenseWithLink | null>(null);

  // Filtres locals (cerca + filtre ràpid)
  const [searchQuery, setSearchQuery] = React.useState('');
  type ExpenseTableFilter =
    | 'all'
    | 'withDocument'
    | 'withoutDocument'
    | 'uncategorized'
    | 'noContact'
    | 'bank'
    | 'offBank'
    | 'assigned'
    | 'unassigned'
    | 'needsReview';
  const [tableFilter, setTableFilter] = React.useState<ExpenseTableFilter>('all');

  // Filtratge combinat: tableFilter + searchQuery
  const filteredExpenses = React.useMemo(() => {
    let result = expenses;

    // 1. Filtre per tableFilter
    if (tableFilter !== 'all') {
      result = result.filter(e => {
        const exp = e.expense;
        switch (tableFilter) {
          case 'needsReview':
            return exp.needsReview === true;
          case 'withDocument':
            return !!exp.documentUrl;
          case 'withoutDocument':
            return !exp.documentUrl;
          case 'uncategorized':
            return !exp.categoryName;
          case 'noContact':
            return !exp.counterpartyName;
          case 'bank':
            return exp.source === 'bank';
          case 'offBank':
            return exp.source === 'offBank';
          case 'assigned':
            return e.status === 'assigned';
          case 'unassigned':
            return e.status === 'unassigned';
          default:
            return true;
        }
      });
    }

    // 2. Filtre per searchQuery (case-insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(e => {
        const exp = e.expense;
        const searchableText = [
          exp.description,
          exp.counterpartyName,
          exp.categoryName,
          String(exp.amountEUR),
          exp.txId,
        ].filter(Boolean).join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    return result;
  }, [expenses, tableFilter, searchQuery]);

  // Quick Assign 100%
  const handleAssign100 = async (txId: string, project: Project, budgetLine?: BudgetLine | null) => {
    const expense = expenses.find(e => e.expense.txId === txId);
    if (!expense) return;

    try {
      const assignments: ExpenseAssignment[] = [{
        projectId: project.id,
        projectName: project.name,
        amountEUR: expense.expense.amountEUR, // ja és negatiu
        budgetLineId: budgetLine?.id ?? null,
        budgetLineName: budgetLine?.name ?? null,
      }];

      await save(txId, assignments, null);
      await refresh();

      const budgetInfo = budgetLine ? ` → ${budgetLine.name}` : '';
      toast({
        title: ep.toastAssigned,
        description: ep.toastAssignedDesc(project.name, budgetInfo),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: ep.toastError,
        description: err instanceof Error ? err.message : ep.toastErrorAssigning,
      });
    }
  };

  // Split Modal save
  const handleSplitSave = async (assignments: ExpenseAssignment[], note: string | null) => {
    if (!splitModalExpense) return;

    try {
      await save(splitModalExpense.expense.txId, assignments, note);
      await refresh();
      setSplitModalExpense(null);
      toast({
        title: ep.toastAssignmentSaved,
        description: ep.toastAssignmentSavedDesc,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: ep.toastError,
        description: err instanceof Error ? err.message : ep.toastErrorSaving,
      });
    }
  };

  // Bulk Assign
  const handleBulkAssign = async (project: Project) => {
    setIsBulkAssigning(true);

    try {
      const selectedExpenses = expenses.filter(e => selectedIds.has(e.expense.txId));

      for (const expense of selectedExpenses) {
        const assignments: ExpenseAssignment[] = [{
          projectId: project.id,
          projectName: project.name,
          amountEUR: expense.expense.amountEUR,
        }];
        await save(expense.expense.txId, assignments, null);
      }

      await refresh();
      setSelectedIds(new Set());
      setBulkAssignOpen(false);
      toast({
        title: ep.toastBulkAssigned,
        description: ep.toastBulkAssignedDesc(selectedExpenses.length, project.name),
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: ep.toastError,
        description: err instanceof Error ? err.message : ep.toastErrorBulk,
      });
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Selection handlers
  const toggleSelect = (txId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(txId)) {
      newSet.delete(txId);
    } else {
      newSet.add(txId);
    }
    setSelectedIds(newSet);
  };

  // Handler per obrir edició de despesa off-bank
  const handleEditOffBank = (expense: UnifiedExpenseWithLink) => {
    trackUX('expenses.offBank.edit.open', { expenseId: expense.expense.txId });
    setEditOffBankExpense(expense);
  };

  // Handler per des-assignar completament (amb confirmació)
  const handleUnassign = async (txId: string) => {
    if (!confirm(ep.confirmUnassign)) return;
    await handleUnassignAll(txId);
  };

  // Handler per des-assignar completament (sense confirmació, per ús des del popover)
  const handleUnassignAll = async (txId: string) => {
    try {
      await remove(txId);
      await refresh();
      trackUX('expenses.unassign', { txId });
      toast({
        title: ep.toastUnassigned,
        description: ep.toastUnassignedDesc,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: ep.toastError,
        description: err instanceof Error ? err.message : ep.toastErrorRemoving,
      });
    }
  };

  // Handler per eliminar una assignació específica (per index)
  const handleRemoveSingleAssignment = async (txId: string, assignmentIndex: number) => {
    // Buscar la despesa per obtenir les assignacions actuals
    const expenseItem = expenses.find(e => e.expense.txId === txId);
    if (!expenseItem?.link?.assignments) return;

    const currentAssignments = expenseItem.link.assignments;

    // Si només queda una assignació, eliminar tot el link
    if (currentAssignments.length <= 1) {
      await handleUnassignAll(txId);
      return;
    }

    // Filtrar l'assignació per índex
    const newAssignments = currentAssignments.filter((_, idx) => idx !== assignmentIndex);

    try {
      await save(txId, newAssignments, expenseItem.link.note, expenseItem.link.justification);
      await refresh();
      trackUX('expenses.removeAssignment', { txId, assignmentIndex });
      toast({
        title: ep.toastAssignmentRemoved,
        description: ep.toastAssignmentRemovedDesc,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: ep.toastError,
        description: err instanceof Error ? err.message : ep.toastErrorRemoving,
      });
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredExpenses.map(e => e.expense.txId)));
    }
  };

  const hasSelection = selectedIds.size > 0;
  const allSelected = filteredExpenses.length > 0 && selectedIds.size === filteredExpenses.length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">{ep.errorLoading}</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button onClick={() => window.location.reload()} variant="outline">
          {ep.retry}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ep.title}</h1>
          <p className="text-muted-foreground">
            {ep.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setAddOffBankOpen(true)}
            variant="default"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            {ep.addOffBank}
          </Button>
          <Link href={buildUrl('/dashboard/project-module/projects')}>
            <Button variant="outline" size="sm">
              <FolderKanban className="h-4 w-4 mr-2" />
              {t.breadcrumb?.projects ?? 'Projectes'}
            </Button>
          </Link>
          <Button
            onClick={() => setTableFilter(tableFilter === 'needsReview' ? 'all' : 'needsReview')}
            variant={tableFilter === 'needsReview' ? 'default' : 'outline'}
            size="sm"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            {t.projectModule.pendingReview}
          </Button>
        </div>
      </div>

      {/* Barra de cerca i filtres */}
      <div className="flex flex-col gap-3">
        {/* Cercador */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={ep.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filtres ràpids */}
        <div className="flex gap-2 items-center flex-wrap">
          <Button
            variant={tableFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('all')}
          >
            {ep.filterAll} ({expenses.length})
          </Button>
          <Button
            variant={tableFilter === 'withoutDocument' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('withoutDocument')}
          >
            {ep.filterWithoutDocument}
          </Button>
          <Button
            variant={tableFilter === 'uncategorized' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('uncategorized')}
          >
            {ep.filterUncategorized}
          </Button>
          <Button
            variant={tableFilter === 'unassigned' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('unassigned')}
          >
            {ep.filterUnassigned}
          </Button>
          <Button
            variant={tableFilter === 'offBank' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('offBank')}
          >
            <Globe className="h-4 w-4 mr-1" />
            {ep.filterOffBank}
          </Button>
          <Button
            variant={tableFilter === 'bank' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTableFilter('bank')}
          >
            <Landmark className="h-4 w-4 mr-1" />
            {ep.filterBank}
          </Button>
        </div>
      </div>

      {/* Franja de filtre actiu */}
      {isFiltered && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {t.projectModule?.filtered ?? 'Filtrat'}
            </span>
            {budgetLineIdFilter && (
              <span className="text-muted-foreground">
                ({t.projectModule?.byBudgetLine ?? 'per partida'})
              </span>
            )}
            {projectIdFilter && !budgetLineIdFilter && (
              <span className="text-muted-foreground">
                ({t.projectModule?.byProject ?? 'per projecte'})
              </span>
            )}
            {!isLoading && (
              <span className="text-muted-foreground">
                · {expenses.length} {ep.filterResults(expenses.length)}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilter}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            {t.projectModule?.clearFilter ?? 'Treure filtre'}
          </Button>
        </div>
      )}

      {/* Taula */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label={ep.tableSelectAll}
                />
              </TableHead>
              <TableHead className="w-[50px]">{ep.tableSource}</TableHead>
              <TableHead className="w-[30px] text-center">{ep.tableDoc}</TableHead>
              <TableHead className="w-[100px]">{ep.tableDate}</TableHead>
              <TableHead>{ep.tableDescription}</TableHead>
              <TableHead>{ep.tableCategory}</TableHead>
              <TableHead>{ep.tableCounterparty}</TableHead>
              <TableHead className="text-right">{ep.tableAmount}</TableHead>
              <TableHead className="w-[80px]">{ep.tableStatus}</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && filteredExpenses.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-2.5 w-2.5 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredExpenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                  {tableFilter !== 'all' || searchQuery
                    ? ep.filterNoResults
                    : t.projectModule.noEligibleExpenses}
                </TableCell>
              </TableRow>
            ) : (
              filteredExpenses.map((item) => {
                const { expense, status, assignedAmount } = item;
                const isSelected = selectedIds.has(expense.txId);

                return (
                  <TableRow
                    key={expense.txId}
                    className={`group hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(expense.txId)}
                        aria-label={`${ep.tableSelectExpense} ${expense.txId}`}
                      />
                    </TableCell>
                    <TableCell>
                      {expense.source === 'bank' ? (
                        <span title={t.projectModule?.sourceBank ?? 'Despesa bancària'}>
                          <Landmark className="h-4 w-4 text-muted-foreground" />
                        </span>
                      ) : (
                        <span title={t.projectModule?.sourceOffBank ?? 'Despesa de terreny'}>
                          <Globe className="h-4 w-4 text-blue-500" />
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {expense.documentUrl ? (
                        <button
                          type="button"
                          onClick={() => window.open(expense.documentUrl!, '_blank', 'noopener,noreferrer')}
                          className="cursor-pointer hover:scale-110 transition-transform"
                          title={ep.tooltipOpenDocument}
                          aria-label={ep.tooltipOpenDocument}
                        >
                          <Circle className="h-3.5 w-3.5 fill-green-500 text-green-500 inline-block" />
                        </button>
                      ) : (
                        <Circle className="h-3.5 w-3.5 text-muted-foreground/30 inline-block" />
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDateDMY(expense.date)}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getCategoryLabel(expense.categoryName)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {expense.counterpartyName || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-red-600">
                      {formatAmount(expense.amountEUR)}
                    </TableCell>
                    <TableCell>
                      <AssignmentStatusPopover
                        expense={item}
                        status={status}
                        assignedAmount={assignedAmount}
                        totalAmount={Math.abs(expense.amountEUR)}
                        assignments={item.link?.assignments}
                        onRemoveAssignment={handleRemoveSingleAssignment}
                        onUnassignAll={handleUnassignAll}
                        onEditAssignment={setSplitModalExpense}
                        isSaving={isSaving}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {/* Assignar (només si no té assignació) */}
                        {!projectsLoading && projects.length > 0 && status === 'unassigned' && (
                          <QuickAssignPopover
                            expense={item}
                            projects={projects}
                            onAssign100={handleAssign100}
                            onOpenSplitModal={setSplitModalExpense}
                            isAssigning={isSaving}
                            assignTooltip={t.projectModule?.assignToProject ?? 'Assignar a projecte'}
                          />
                        )}
                        {/* Editar despesa off-bank */}
                        {expense.source === 'offBank' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleEditOffBank(item)}
                            title={t.projectModule?.editExpense ?? 'Editar despesa'}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {/* Detall despesa bank */}
                        {expense.source === 'bank' && (
                          <Link href={buildUrl(`/dashboard/project-module/expenses/${expense.txId}`)}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title={t.projectModule?.viewDetail ?? 'Veure detall'}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {isLoading && expenses.length > 0 && (
        <div className="flex justify-center py-4">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Botó carregar més (només si no hi ha filtres locals) */}
      {!isLoading && hasMore && !isFiltered && tableFilter === 'all' && !searchQuery && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={loadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Carregant...
              </>
            ) : (
              <>
                Carregar més
              </>
            )}
          </Button>
        </div>
      )}

      {/* Barra inferior per bulk assign */}
      {hasSelection && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {selectedIds.size} despesa{selectedIds.size > 1 ? 's' : ''} seleccionada{selectedIds.size > 1 ? 'es' : ''}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                <X className="h-4 w-4 mr-1" />
                Deseleccionar
              </Button>
            </div>
            <Popover open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
              <PopoverTrigger asChild>
                <Button disabled={isBulkAssigning || projectsLoading}>
                  <FolderPlus className="h-4 w-4 mr-2" />
                  {isBulkAssigning ? 'Assignant...' : 'Assignar a projecte...'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="end">
                <Command>
                  <CommandInput placeholder="Cerca projecte..." />
                  <CommandList>
                    <CommandEmpty>No s'han trobat projectes</CommandEmpty>
                    <CommandGroup heading="Assignar 100% a totes">
                      {projects.map((project) => (
                        <CommandItem
                          key={project.id}
                          onSelect={() => handleBulkAssign(project)}
                          className="cursor-pointer"
                        >
                          <Check className="mr-2 h-4 w-4 opacity-0" />
                          <div className="flex-1">
                            <span>{project.name}</span>
                            {project.code && (
                              <span className="ml-2 text-muted-foreground text-xs">({project.code})</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Split Modal */}
      <Dialog open={!!splitModalExpense} onOpenChange={(open) => !open && setSplitModalExpense(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assignació múltiple</DialogTitle>
            <DialogDescription>
              Distribueix la despesa entre diversos projectes
            </DialogDescription>
          </DialogHeader>
          {splitModalExpense && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Import total</span>
                  <span className="font-mono font-medium text-red-600">
                    {formatAmount(splitModalExpense.expense.amountEUR)}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatDateDMY(splitModalExpense.expense.date)} · {splitModalExpense.expense.description || '-'}
                </div>
              </div>
              <AssignmentEditor
                projects={projects}
                projectsLoading={projectsLoading}
                projectsError={projectsError}
                currentAssignments={splitModalExpense.link?.assignments ?? []}
                currentNote={splitModalExpense.link?.note ?? null}
                totalAmount={Math.abs(splitModalExpense.expense.amountEUR)}
                onSave={handleSplitSave}
                onCancel={() => setSplitModalExpense(null)}
                isSaving={isSaving}
                createProjectUrl={buildUrl('/dashboard/project-module/projects/new')}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Off-Bank Expense Modal */}
      <OffBankExpenseModal
        open={addOffBankOpen}
        onOpenChange={setAddOffBankOpen}
        onSuccess={refresh}
        mode="create"
        organizationId={organizationId ?? ''}
      />

      {/* Edit Off-Bank Expense Modal */}
      <OffBankExpenseModal
        open={!!editOffBankExpense}
        onOpenChange={(open) => !open && setEditOffBankExpense(null)}
        onSuccess={() => {
          setEditOffBankExpense(null);
          refresh();
        }}
        mode="edit"
        expenseId={editOffBankExpense?.expense.txId.replace('off_', '')}
        organizationId={organizationId ?? ''}
        initialValues={editOffBankExpense ? {
          date: editOffBankExpense.expense.date,
          amountEUR: Math.abs(editOffBankExpense.expense.amountEUR).toString().replace('.', ','),
          concept: editOffBankExpense.expense.description ?? '',
          counterpartyName: editOffBankExpense.expense.counterpartyName ?? '',
          categoryName: editOffBankExpense.expense.categoryName ?? '',
          // FX
          currency: editOffBankExpense.expense.currency ?? undefined,
          amountOriginal: editOffBankExpense.expense.amountOriginal?.toString().replace('.', ',') ?? undefined,
          fxRateOverride: editOffBankExpense.expense.fxRateUsed?.toString() ?? undefined,
          useFxOverride: !!editOffBankExpense.expense.fxRateUsed,
          // Justificació
          invoiceNumber: editOffBankExpense.expense.invoiceNumber ?? undefined,
          issuerTaxId: editOffBankExpense.expense.issuerTaxId ?? undefined,
          invoiceDate: editOffBankExpense.expense.invoiceDate ?? undefined,
          paymentDate: editOffBankExpense.expense.paymentDate ?? undefined,
          // Attachments
          attachments: editOffBankExpense.expense.attachments ?? undefined,
          needsReview: editOffBankExpense.expense.needsReview ?? undefined,
        } : undefined}
        existingAssignments={editOffBankExpense?.link?.assignments}
      />
    </div>
  );
}
