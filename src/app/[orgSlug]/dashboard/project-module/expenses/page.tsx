// src/app/[orgSlug]/dashboard/project-module/expenses/page.tsx
// Inbox de despeses assignables a projectes

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useUnifiedExpenseFeed, useProjects, useSaveExpenseLink, useProjectBudgetLines, useUpdateOffBankExpense } from '@/hooks/use-project-module';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useFirebase, useStorage } from '@/firebase/provider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, RefreshCw, ChevronRight, FolderPlus, Check, MoreHorizontal, Split, X, Plus, Landmark, Globe, ArrowLeft, FolderKanban, Filter, Pencil, Trash2, Search, FileText, Upload, Camera, MoreVertical } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { formatDateDMY, formatDateShort } from '@/lib/normalize';
import { AssignmentEditor } from '@/components/project-module/assignment-editor';
import type { ExpenseStatus, UnifiedExpenseWithLink, Project, ExpenseAssignment, BudgetLine, OffBankAttachment } from '@/lib/project-module-types';
import { useTranslations } from '@/i18n';
import { OffBankExpenseModal } from '@/components/project-module/add-off-bank-expense-modal';
import { buildDocumentFilename } from '@/lib/build-document-filename';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { MobileListItem } from '@/components/mobile/mobile-list-item';

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

  // Mapping segons contracte: 0%=neutral, parcial=ambre, 100%=verd
  const badgeClass = status === 'assigned'
    ? 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
    : 'bg-amber-500 text-black hover:bg-amber-600 cursor-pointer';

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
                  aria-label="Eliminar aquesta assignació"
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
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/40"
          disabled={isAssigning}
          aria-label={assignTooltip}
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

// Component per a fila amb suport drag & drop de documents
interface DroppableExpenseRowProps {
  expense: UnifiedExpenseWithLink;
  children: React.ReactNode;
  onUploadDocument: (expense: UnifiedExpenseWithLink, file: File) => Promise<void>;
  isUploading: boolean;
  isSelected: boolean;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

function DroppableExpenseRow({
  expense,
  children,
  onUploadDocument,
  isUploading,
  isSelected,
}: DroppableExpenseRowProps) {
  const [isDragging, setIsDragging] = React.useState(false);

  const handleDragOver = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isUploading) {
      setIsDragging(true);
    }
  }, [isUploading]);

  const handleDragLeave = React.useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = React.useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (isUploading) return;

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f =>
      ACCEPTED_TYPES.includes(f.type) || f.type.startsWith('image/')
    );

    if (validFile) {
      await onUploadDocument(expense, validFile);
    }
  }, [expense, onUploadDocument, isUploading]);

  return (
    <TableRow
      className={`group hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted/30' : ''} ${isDragging ? 'bg-primary/10 ring-2 ring-primary ring-inset' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {isDragging && (
        <td className="absolute inset-0 flex items-center justify-center bg-primary/5 pointer-events-none z-10">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Upload className="h-5 w-5" />
            <span>Deixa anar per pujar</span>
          </div>
        </td>
      )}
    </TableRow>
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
  const storage = useStorage();
  const isMobile = useIsMobile();

  // Llegir filtres de query params
  const projectIdFilter = searchParams.get('projectId');
  const budgetLineIdFilter = searchParams.get('budgetLineId');

  const { expenses, isLoading, isLoadingMore, error, refresh, loadMore, hasMore, isFiltered, usedFallback } = useUnifiedExpenseFeed({
    projectId: projectIdFilter,
    budgetLineId: budgetLineIdFilter,
  });
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects(true);
  const { save, remove, isSaving } = useSaveExpenseLink();
  const { update: updateOffBankExpense } = useUpdateOffBankExpense();
  const { firestore } = useFirebase();

  // Estat per controlar loading d'eliminació de document
  const [deletingDocTxId, setDeletingDocTxId] = React.useState<string | null>(null);
  // Estat per controlar uploading de document per drag & drop
  const [uploadingDocTxId, setUploadingDocTxId] = React.useState<string | null>(null);

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

  // Handler per eliminar document/attachments d'una despesa
  const handleDeleteDocument = async (expense: UnifiedExpenseWithLink) => {
    if (!organizationId) return;

    const txId = expense.expense.txId;
    setDeletingDocTxId(txId);

    try {
      if (expense.expense.source === 'offBank') {
        // Off-bank: eliminar attachments (posar array buit)
        const offBankId = txId.replace('off_', '');
        await updateOffBankExpense(offBankId, { attachments: [] });
      } else {
        // Bank: actualitzar document a null
        const txRef = doc(firestore, 'organizations', organizationId, 'transactions', txId);
        await updateDoc(txRef, { document: null });
      }

      await refresh();
      trackUX('expenses.deleteDocument', { txId, source: expense.expense.source });
      toast({
        title: t.movements?.table?.documentDeleted ?? 'Document eliminat',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: ep.toastError,
        description: err instanceof Error ? err.message : 'Error eliminant document',
      });
    } finally {
      setDeletingDocTxId(null);
    }
  };

  // Handler per pujar document via drag & drop
  const handleUploadDocument = React.useCallback(async (expense: UnifiedExpenseWithLink, file: File) => {
    if (!organizationId) return;

    const txId = expense.expense.txId;
    setUploadingDocTxId(txId);

    try {
      // Generar nom automàtic basat en data i descripció de la despesa
      const fileName = buildDocumentFilename({
        dateISO: expense.expense.date,
        concept: expense.expense.description || 'document',
        originalName: file.name,
      });

      if (expense.expense.source === 'offBank') {
        // Off-bank: afegir a attachments[]
        const offBankId = txId.replace('off_', '');
        const storagePath = `organizations/${organizationId}/offBankExpenses/${offBankId}/${fileName}`;
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        const newAttachment: OffBankAttachment = {
          url: downloadURL,
          name: fileName,
          contentType: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString().split('T')[0],
        };

        // Afegir al array existent (o crear-ne un de nou)
        const existingAttachments = expense.expense.attachments ?? [];
        await updateOffBankExpense(offBankId, {
          attachments: [...existingAttachments, newAttachment],
        });
      } else {
        // Bank: actualitzar document (objecte amb url, name, storagePath)
        const storagePath = `organizations/${organizationId}/transactions/${txId}/${fileName}`;
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(uploadResult.ref);

        const txRef = doc(firestore, 'organizations', organizationId, 'transactions', txId);
        await updateDoc(txRef, {
          document: {
            url: downloadURL,
            name: fileName,
            storagePath: storagePath,
          },
        });
      }

      await refresh();
      trackUX('expenses.uploadDocument', { txId, source: expense.expense.source });
      toast({
        title: 'Document pujat',
        description: file.name,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: ep.toastError,
        description: err instanceof Error ? err.message : 'Error pujant document',
      });
    } finally {
      setUploadingDocTxId(null);
    }
  }, [organizationId, storage, firestore, updateOffBankExpense, refresh, toast, t, ep]);

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
    <TooltipProvider>
    <div className="space-y-6 pb-24 md:pb-0">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={buildUrl('/dashboard/project-module/projects')}>
                {t.breadcrumb?.projects ?? 'Projectes'}
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{t.breadcrumb?.expenseAssignment ?? 'Assignació de despeses'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">{ep.title}</h1>
          <p className="text-muted-foreground">
            {ep.subtitle}
          </p>
        </div>
        {/* Mobile: CTA + dropdown menu */}
        {isMobile ? (
          <div className="flex flex-col gap-2">
            <Button
              onClick={() => setAddOffBankOpen(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.projectModule?.addExpense ?? 'Afegir despesa'}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full">
                  <MoreVertical className="h-4 w-4 mr-2" />
                  {'Més accions'}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => router.push(buildUrl('/quick-expense'))}>
                  <Camera className="h-4 w-4 mr-2" />
                  {t.projectModule?.quickExpenseTooltip ?? 'Despesa ràpida'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(buildUrl('/dashboard/project-module/projects'))}>
                  <FolderKanban className="h-4 w-4 mr-2" />
                  {t.breadcrumb?.projects ?? 'Projectes'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTableFilter(tableFilter === 'needsReview' ? 'all' : 'needsReview')}>
                  <AlertCircle className="h-4 w-4 mr-2" />
                  {t.projectModule.pendingReview}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          /* Desktop: row of buttons */
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => router.push(buildUrl('/quick-expense'))}
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t.projectModule?.quickExpenseTooltip ?? 'Registrar una despesa ràpidament des del mòbil (foto del rebut)'}
              </TooltipContent>
            </Tooltip>
            <Button
              onClick={() => setAddOffBankOpen(true)}
              variant="default"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t.projectModule?.addExpense ?? 'Afegir despesa'}
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
        )}
      </div>

      {/* Barra de cerca i filtres */}
      <div className="flex flex-col gap-3">
        {/* Cercador */}
        <div className="relative w-full md:max-w-md">
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

        {/* Filtres ràpids - Select on mobile, buttons on desktop */}
        {isMobile ? (
          <Select
            value={tableFilter}
            onValueChange={(value) => setTableFilter(value as ExpenseTableFilter)}
          >
            <SelectTrigger className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{ep.filterAll} ({expenses.length})</SelectItem>
              <SelectItem value="withoutDocument">{ep.filterWithoutDocument}</SelectItem>
              <SelectItem value="uncategorized">{ep.filterUncategorized}</SelectItem>
              <SelectItem value="unassigned">{ep.filterUnassigned}</SelectItem>
              <SelectItem value="offBank">{ep.filterOffBank}</SelectItem>
              <SelectItem value="bank">{ep.filterBank}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
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
        )}
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

      {/* Vista mòbil */}
      {isMobile ? (
        <div className="flex flex-col gap-2">
          {isLoading && filteredExpenses.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="border border-border/50 rounded-lg p-3">
                <Skeleton className="h-4 w-48 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {tableFilter !== 'all' || searchQuery
                ? ep.filterNoResults
                : t.projectModule.noEligibleExpenses}
            </div>
          ) : (
            filteredExpenses.map((item) => {
              const { expense, status, assignedAmount } = item;
              const percentage = Math.abs(expense.amountEUR) > 0
                ? Math.round((assignedAmount / Math.abs(expense.amountEUR)) * 100)
                : 0;

              return (
                <MobileListItem
                  key={expense.txId}
                  title={expense.description || '-'}
                  leadingIcon={
                    expense.source === 'bank'
                      ? <Landmark className="h-4 w-4" />
                      : <Globe className="h-4 w-4 text-blue-500" />
                  }
                  badges={[
                    <Badge
                      key="status"
                      variant={status === 'assigned' ? 'default' : status === 'partial' ? 'secondary' : 'outline'}
                      className={
                        status === 'assigned'
                          ? 'bg-emerald-600 text-xs'
                          : status === 'partial'
                          ? 'bg-amber-500 text-black text-xs'
                          : 'text-xs'
                      }
                    >
                      {status === 'assigned' ? '100%' : status === 'partial' ? `${percentage}%` : '0%'}
                    </Badge>,
                    expense.documentUrl && (
                      <Badge key="doc" variant="outline" className="text-xs">
                        <FileText className="h-3 w-3 mr-1" />
                        Doc
                      </Badge>
                    ),
                  ].filter(Boolean)}
                  meta={[
                    { value: formatDateShort(expense.date) },
                    {
                      value: expense.pendingConversion || expense.amountEUR === 0
                        ? <span className="text-amber-600">Import pendent</span>
                        : <span className="font-mono font-medium text-red-600">{formatAmount(expense.amountEUR)}</span>
                    },
                    expense.counterpartyName && { value: expense.counterpartyName },
                  ].filter(Boolean) as { label?: string; value: React.ReactNode }[]}
                  actions={
                    <div className="flex items-center gap-1">
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
                          className="h-8 w-8"
                          onClick={() => handleEditOffBank(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {/* Detall despesa bank */}
                      {expense.source === 'bank' && (
                        <Link href={buildUrl(`/dashboard/project-module/expenses/${expense.txId}`)}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  }
                  onClick={expense.source === 'bank'
                    ? () => router.push(buildUrl(`/dashboard/project-module/expenses/${expense.txId}`))
                    : () => handleEditOffBank(item)
                  }
                />
              );
            })
          )}
        </div>
      ) : (
        /* Vista desktop - Taula amb jerarquia de columnes responsive */
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[36px] px-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleSelectAll}
                    aria-label={ep.tableSelectAll}
                  />
                </TableHead>
                <TableHead className="w-[28px] px-1 text-center hidden xl:table-cell">{ep.tableDoc}</TableHead>
                <TableHead className="w-[80px] px-2">{ep.tableDate}</TableHead>
                <TableHead className="px-2">{ep.tableDescription}</TableHead>
                <TableHead className="hidden xl:table-cell px-2">{ep.tableCategory}</TableHead>
                <TableHead className="hidden xl:table-cell px-2">{ep.tableCounterparty}</TableHead>
                <TableHead className="text-right px-2 w-[100px]">{ep.tableAmount}</TableHead>
                <TableHead className="w-[70px] px-2">{ep.tableStatus}</TableHead>
                <TableHead className="w-[90px] px-1"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && filteredExpenses.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="px-2"><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell className="hidden xl:table-cell px-1"><Skeleton className="h-3 w-3 rounded-full" /></TableCell>
                    <TableCell className="px-2"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="px-2"><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell className="hidden xl:table-cell px-2"><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell className="hidden xl:table-cell px-2"><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell className="px-2"><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell className="px-2"><Skeleton className="h-5 w-12" /></TableCell>
                    <TableCell className="px-1"><Skeleton className="h-7 w-16" /></TableCell>
                  </TableRow>
                ))
              ) : filteredExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    {tableFilter !== 'all' || searchQuery
                      ? ep.filterNoResults
                      : t.projectModule.noEligibleExpenses}
                  </TableCell>
                </TableRow>
              ) : (
                filteredExpenses.map((item) => {
                  const { expense, status, assignedAmount } = item;
                  const isSelected = selectedIds.has(expense.txId);
                  const isUploading = uploadingDocTxId === expense.txId;

                  return (
                    <DroppableExpenseRow
                      key={expense.txId}
                      expense={item}
                      onUploadDocument={handleUploadDocument}
                      isUploading={isUploading}
                      isSelected={isSelected}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-2">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(expense.txId)}
                          aria-label={`${ep.tableSelectExpense} ${expense.txId}`}
                        />
                      </TableCell>

                      {/* Document - visible només en xl+ */}
                      <TableCell className="hidden xl:table-cell px-1 text-center">
                        {isUploading ? (
                          <RefreshCw className="h-3 w-3 animate-spin text-primary inline-block" />
                        ) : deletingDocTxId === expense.txId ? (
                          <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground inline-block" />
                        ) : expense.documentUrl ? (
                          <div className="inline-flex items-center gap-0.5">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => window.open(expense.documentUrl!, '_blank', 'noopener,noreferrer')}
                                  className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-colors"
                                >
                                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>{ep.tooltipOpenDocument}</TooltipContent>
                            </Tooltip>
                            {expense.source !== 'bank' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(item)}
                                    className="inline-flex items-center justify-center h-4 w-4 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{t.movements?.table?.deleteDocument ?? 'Eliminar document'}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        ) : (
                          <FileText className="h-3.5 w-3.5 text-muted-foreground/30 inline-block" />
                        )}
                      </TableCell>

                      {/* Data */}
                      <TableCell className="px-2 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateShort(expense.date)}
                      </TableCell>

                      {/* Descripció - amb info secundària inline en < xl */}
                      <TableCell className="px-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Icona font */}
                          {expense.source === 'bank' ? (
                            <Landmark className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <Globe className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[13px] truncate max-w-[220px]" title={expense.description || undefined}>
                              {expense.description || '-'}
                            </div>
                            {/* Categoria i contrapart - visible només en < xl */}
                            <div className="xl:hidden flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {expense.categoryName && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 max-w-[120px] truncate">
                                  {getCategoryLabel(expense.categoryName)}
                                </Badge>
                              )}
                              {expense.counterpartyName && (
                                <span className="truncate max-w-[100px]">{expense.counterpartyName}</span>
                              )}
                              {/* Icona document inline en < xl */}
                              {expense.documentUrl && (
                                <button
                                  type="button"
                                  onClick={() => window.open(expense.documentUrl!, '_blank', 'noopener,noreferrer')}
                                  className="shrink-0"
                                >
                                  <FileText className="h-3 w-3 text-emerald-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      {/* Categoria - visible només en xl+ */}
                      <TableCell className="hidden xl:table-cell px-2">
                        {expense.categoryName ? (
                          <Badge variant="outline" className="text-[11px] px-1.5 py-0 max-w-[140px] truncate">
                            {getCategoryLabel(expense.categoryName)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      {/* Contrapart - visible només en xl+ */}
                      <TableCell className="hidden xl:table-cell px-2 text-muted-foreground text-[13px] max-w-[160px] truncate">
                        {expense.counterpartyName || '-'}
                      </TableCell>

                      {/* Import */}
                      <TableCell className="px-2 text-right font-mono text-[13px] whitespace-nowrap tabular-nums">
                        {expense.pendingConversion || expense.amountEUR === 0 ? (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                            Pendent
                          </Badge>
                        ) : (
                          <span className="text-red-600 font-medium">{formatAmount(expense.amountEUR)}</span>
                        )}
                      </TableCell>

                      {/* Estat */}
                      <TableCell className="px-2">
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

                      {/* Accions */}
                      <TableCell className="px-1">
                        <div className="flex items-center gap-0.5 justify-end">
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
                          {expense.source === 'offBank' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => handleEditOffBank(item)}
                              aria-label={t.projectModule?.editExpense ?? 'Editar despesa'}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {expense.source === 'bank' && (
                            <Link href={buildUrl(`/dashboard/project-module/expenses/${expense.txId}`)}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                aria-label={t.projectModule?.viewDetail ?? 'Veure detall'}
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </DroppableExpenseRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

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
    </TooltipProvider>
  );
}
