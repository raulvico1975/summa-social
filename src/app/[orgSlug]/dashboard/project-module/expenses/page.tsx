// src/app/[orgSlug]/dashboard/project-module/expenses/page.tsx
// Inbox de despeses assignables a projectes

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useExpenseFeed, useProjects, useSaveExpenseLink } from '@/hooks/use-project-module';
import { useOrgUrl } from '@/hooks/organization-provider';
import { useToast } from '@/hooks/use-toast';
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
import { AlertCircle, RefreshCw, ChevronRight, FolderPlus, Check, MoreHorizontal, Split, X } from 'lucide-react';
import { formatDateDMY } from '@/lib/normalize';
import { AssignmentEditor } from '@/components/project-module/assignment-editor';
import type { ExpenseStatus, ExpenseWithLink, Project, ExpenseAssignment } from '@/lib/project-module-types';

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function StatusBadge({ status, assignedAmount, totalAmount }: { status: ExpenseStatus; assignedAmount: number; totalAmount: number }) {
  const percentage = totalAmount > 0 ? Math.round((assignedAmount / totalAmount) * 100) : 0;

  switch (status) {
    case 'assigned':
      return <Badge variant="default" className="bg-green-600">100%</Badge>;
    case 'partial':
      return <Badge variant="secondary" className="bg-yellow-500 text-black">{percentage}%</Badge>;
    case 'unassigned':
    default:
      return <Badge variant="outline">0%</Badge>;
  }
}

// Component per Quick Assign amb Popover
function QuickAssignPopover({
  expense,
  projects,
  onAssign100,
  onOpenSplitModal,
  isAssigning,
}: {
  expense: ExpenseWithLink;
  projects: Project[];
  onAssign100: (txId: string, project: Project) => Promise<void>;
  onOpenSplitModal: (expense: ExpenseWithLink) => void;
  isAssigning: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.code && p.code.toLowerCase().includes(search.toLowerCase()))
  );

  const handleSelect = async (project: Project) => {
    setOpen(false);
    await onAssign100(expense.expense.id, project);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-7 px-2"
          disabled={isAssigning}
        >
          <FolderPlus className="h-3.5 w-3.5 mr-1" />
          Assignar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
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
                  onSelect={() => handleSelect(project)}
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
      </PopoverContent>
    </Popover>
  );
}

export default function ExpensesInboxPage() {
  const { expenses, isLoading, error, hasMore, loadMore, refresh } = useExpenseFeed();
  const { projects, isLoading: projectsLoading, error: projectsError } = useProjects(true);
  const { save, isSaving } = useSaveExpenseLink();
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();

  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [splitModalExpense, setSplitModalExpense] = React.useState<ExpenseWithLink | null>(null);
  const [bulkAssignOpen, setBulkAssignOpen] = React.useState(false);
  const [isBulkAssigning, setIsBulkAssigning] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setSelectedIds(new Set());
    setIsRefreshing(false);
  };

  // Quick Assign 100%
  const handleAssign100 = async (txId: string, project: Project) => {
    const expense = expenses.find(e => e.expense.id === txId);
    if (!expense) return;

    try {
      const assignments: ExpenseAssignment[] = [{
        projectId: project.id,
        projectName: project.name,
        amountEUR: expense.expense.amountEUR, // ja és negatiu
      }];

      await save(txId, assignments, null);
      await refresh();
      toast({
        title: 'Assignada',
        description: `Despesa assignada a "${project.name}"`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error assignant despesa',
      });
    }
  };

  // Split Modal save
  const handleSplitSave = async (assignments: ExpenseAssignment[], note: string | null) => {
    if (!splitModalExpense) return;

    try {
      await save(splitModalExpense.expense.id, assignments, note);
      await refresh();
      setSplitModalExpense(null);
      toast({
        title: 'Assignació desada',
        description: 'La despesa s\'ha assignat correctament.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error desant assignació',
      });
    }
  };

  // Bulk Assign
  const handleBulkAssign = async (project: Project) => {
    setIsBulkAssigning(true);

    try {
      const selectedExpenses = expenses.filter(e => selectedIds.has(e.expense.id));

      for (const expense of selectedExpenses) {
        const assignments: ExpenseAssignment[] = [{
          projectId: project.id,
          projectName: project.name,
          amountEUR: expense.expense.amountEUR,
        }];
        await save(expense.expense.id, assignments, null);
      }

      await refresh();
      setSelectedIds(new Set());
      setBulkAssignOpen(false);
      toast({
        title: 'Assignació massiva completada',
        description: `${selectedExpenses.length} despeses assignades a "${project.name}"`,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err instanceof Error ? err.message : 'Error en assignació massiva',
      });
    } finally {
      setIsBulkAssigning(false);
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map(e => e.expense.id)));
    }
  };

  const hasSelection = selectedIds.size > 0;
  const allSelected = expenses.length > 0 && selectedIds.size === expenses.length;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Error carregant despeses</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button onClick={handleRefresh} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Despeses per assignar</h1>
          <p className="text-muted-foreground">
            Despeses elegibles per vincular a projectes
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualitzar
        </Button>
      </div>

      {/* Taula */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  aria-label="Seleccionar tot"
                />
              </TableHead>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Descripció</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Origen / Destinatari</TableHead>
              <TableHead className="text-right">Import</TableHead>
              <TableHead className="w-[80px]">Estat</TableHead>
              <TableHead className="w-[120px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && expenses.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-7 w-20" /></TableCell>
                </TableRow>
              ))
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No hi ha despeses elegibles per assignar
                </TableCell>
              </TableRow>
            ) : (
              expenses.map((item) => {
                const { expense, status, assignedAmount } = item;
                const isSelected = selectedIds.has(expense.id);

                return (
                  <TableRow
                    key={expense.id}
                    className={`group hover:bg-muted/50 ${isSelected ? 'bg-muted/30' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(expense.id)}
                        aria-label={`Seleccionar despesa ${expense.id}`}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDateDMY(expense.date)}
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      {expense.description || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {expense.categoryName || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {expense.counterpartyName || '-'}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium text-red-600">
                      {formatAmount(expense.amountEUR)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={status} assignedAmount={assignedAmount} totalAmount={Math.abs(expense.amountEUR)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 justify-end">
                        {!projectsLoading && projects.length > 0 && (
                          <QuickAssignPopover
                            expense={item}
                            projects={projects}
                            onAssign100={handleAssign100}
                            onOpenSplitModal={setSplitModalExpense}
                            isAssigning={isSaving}
                          />
                        )}
                        <Link href={buildUrl(`/dashboard/project-module/expenses/${expense.id}`)}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Veure detall"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Carrega més */}
      {hasMore && !isLoading && (
        <div className="flex justify-center">
          <Button onClick={loadMore} variant="outline">
            Carrega més
          </Button>
        </div>
      )}

      {isLoading && expenses.length > 0 && (
        <div className="flex justify-center py-4">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
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
    </div>
  );
}
