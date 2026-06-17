'use client';

import * as React from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, Circle, Split, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslations } from '@/i18n';
import {
  formatEuropeanCurrency,
  getProjectBudgetLineForExpense,
  getProjectImputedAmountForExpense,
  getFundingExpenseStatus,
  sumFundingExpenseAllocations,
  type ProjectFundingImputedAmountResolver,
} from '@/lib/project-module-funding';
import type {
  BudgetLine,
  ProjectFundingExpenseAllocation,
  ProjectFundingExpenseAllocationFormLine,
  ProjectFundingSource,
  UnifiedExpenseWithLink,
} from '@/lib/project-module-types';
import { ProjectFundingExpenseDialog } from './project-funding-expense-dialog';

function formatAmount(amount: number): string {
  return formatEuropeanCurrency(amount);
}

function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
}

function imputedAmount(
  expense: UnifiedExpenseWithLink,
  projectId: string,
  resolveAssignmentAmountEUR?: ProjectFundingImputedAmountResolver
): number {
  return expense.link
    ? getProjectImputedAmountForExpense(expense.link, projectId, {
      expense: expense.expense,
      resolveAssignmentAmountEUR,
    })
    : 0;
}

function budgetLineLabel(expense: UnifiedExpenseWithLink, budgetLines: BudgetLine[], projectId: string): string {
  const id = expense.link ? getProjectBudgetLineForExpense(expense.link, projectId) : null;
  const line = budgetLines.find((item) => item.id === id);
  if (!line) return '-';
  return line.code ? `${line.code} - ${line.name}` : line.name;
}

export function ProjectFundingExpenseDistribution({
  projectId,
  expenses,
  fundingSources,
  budgetLines,
  expenseAllocations,
  isSaving,
  resolveAssignmentAmountEUR,
  onSaveExpenseAllocations,
}: {
  projectId: string;
  expenses: UnifiedExpenseWithLink[];
  fundingSources: ProjectFundingSource[];
  budgetLines: BudgetLine[];
  expenseAllocations: ProjectFundingExpenseAllocation[];
  isSaving: boolean;
  resolveAssignmentAmountEUR?: ProjectFundingImputedAmountResolver;
  onSaveExpenseAllocations: (expense: UnifiedExpenseWithLink, lines: ProjectFundingExpenseAllocationFormLine[]) => Promise<void>;
}) {
  const { tr } = useTranslations();
  const [dialogExpense, setDialogExpense] = React.useState<UnifiedExpenseWithLink | null>(null);
  const [selectedFundingSourceIds, setSelectedFundingSourceIds] = React.useState<string[]>([]);
  const [selectedBudgetLineId, setSelectedBudgetLineId] = React.useState('all');
  const activeSources = React.useMemo(
    () => fundingSources
      .filter((source) => source.archivedAt === null)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)),
    [fundingSources]
  );
  const filteredExpenses = React.useMemo(
    () => expenses.filter((expense) => {
      const budgetLineId = expense.link ? getProjectBudgetLineForExpense(expense.link, projectId) : null;
      if (selectedBudgetLineId !== 'all' && budgetLineId !== selectedBudgetLineId) return false;

      if (selectedFundingSourceIds.length === 0) return true;
      const allocationSourceIds = new Set(
        expenseAllocations
          .filter((allocation) => allocation.expenseLinkId === expense.expense.txId)
          .map((allocation) => allocation.fundingSourceId)
      );
      return selectedFundingSourceIds.some((sourceId) => allocationSourceIds.has(sourceId));
    }),
    [expenseAllocations, expenses, projectId, selectedBudgetLineId, selectedFundingSourceIds]
  );
  const selectedSourcesLabel = selectedFundingSourceIds.length === 0
    ? tr('projectModule.multiFunding.filters.allFunders')
    : selectedFundingSourceIds.length === 1
      ? activeSources.find((source) => source.id === selectedFundingSourceIds[0])?.name ?? tr('projectModule.multiFunding.filters.selectedFunders').replace('{count}', '1')
      : tr('projectModule.multiFunding.filters.selectedFunders').replace('{count}', String(selectedFundingSourceIds.length));

  function toggleFundingSource(sourceId: string) {
    setSelectedFundingSourceIds((prev) => (
      prev.includes(sourceId)
        ? prev.filter((item) => item !== sourceId)
        : [...prev, sourceId]
    ));
  }

  function clearFilters() {
    setSelectedFundingSourceIds([]);
    setSelectedBudgetLineId('all');
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{tr('projectModule.multiFunding.expensesTitle')}</CardTitle>
          <CardDescription>{tr('projectModule.multiFunding.expensesDescription')}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="grid gap-2 md:grid-cols-2">
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{tr('projectModule.multiFunding.filters.byFunder')}</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between md:w-[260px]">
                    <span className="truncate">{selectedSourcesLabel}</span>
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[280px]">
                  {activeSources.map((source) => (
                    <DropdownMenuCheckboxItem
                      key={source.id}
                      checked={selectedFundingSourceIds.includes(source.id)}
                      onSelect={(event) => event.preventDefault()}
                      onCheckedChange={() => toggleFundingSource(source.id)}
                    >
                      {source.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">{tr('projectModule.multiFunding.filters.byBudgetLine')}</div>
              <Select value={selectedBudgetLineId} onValueChange={setSelectedBudgetLineId}>
                <SelectTrigger className="w-full md:w-[300px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{tr('projectModule.multiFunding.filters.allBudgetLines')}</SelectItem>
                  {budgetLines.map((line) => (
                    <SelectItem key={line.id} value={line.id}>
                      {line.code ? `${line.code} - ${line.name}` : line.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(selectedFundingSourceIds.length > 0 || selectedBudgetLineId !== 'all') && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="mr-2 h-4 w-4" />
              {tr('projectModule.multiFunding.filters.clear')}
            </Button>
          )}
        </div>

        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">{tr('projectModule.multiFunding.noExpenses')}</p>
        ) : filteredExpenses.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
            {tr('projectModule.multiFunding.filters.noResults')}
          </p>
        ) : (
          <div className="space-y-2">
            {filteredExpenses.map((expense) => {
                const imputed = imputedAmount(expense, projectId, resolveAssignmentAmountEUR);
                const distributed = sumFundingExpenseAllocations(expenseAllocations, { expenseLinkId: expense.expense.txId });
                const status = getFundingExpenseStatus({ imputedAmountEUR: imputed, distributedAmountEUR: distributed });

                return (
                  <div key={expense.expense.txId} className="rounded-lg border px-4 py-3">
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(160px,0.8fr)_minmax(160px,0.8fr)_auto] lg:items-center">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{formatDate(expense.expense.date)}</span>
                          <StatusBadge status={status} label={tr(`projectModule.multiFunding.status.${status}`)} />
                        </div>
                        <div className="truncate text-sm font-medium leading-tight">{expense.expense.description ?? '-'}</div>
                        <div className="text-xs text-muted-foreground">{expense.expense.counterpartyName ?? '-'}</div>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs text-muted-foreground">{tr('projectModule.lineName')}</div>
                        <div className="truncate text-sm font-medium">{budgetLineLabel(expense, budgetLines, projectId)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs text-muted-foreground">{tr('projectModule.multiFunding.imputedAmount')}</div>
                          <div className="font-mono text-sm font-medium">{formatAmount(imputed)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">{tr('projectModule.multiFunding.distributedAmount')}</div>
                          <div className="font-mono text-sm font-medium">{formatAmount(distributed)}</div>
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => setDialogExpense(expense)}
                                disabled={activeSources.length === 0}
                                aria-label={tr('projectModule.multiFunding.distributeTooltip')}
                              >
                                <Split className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {tr('projectModule.multiFunding.distributeTooltip')}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </CardContent>
      <ProjectFundingExpenseDialog
        open={dialogExpense !== null}
        onOpenChange={(open) => {
          if (!open) setDialogExpense(null);
        }}
        expense={dialogExpense}
        projectId={projectId}
        fundingSources={activeSources}
        budgetLines={budgetLines}
        allocations={expenseAllocations}
        isSaving={isSaving}
        resolveAssignmentAmountEUR={resolveAssignmentAmountEUR}
        onSave={async (lines) => {
          if (!dialogExpense) return;
          await onSaveExpenseAllocations(dialogExpense, lines);
          setDialogExpense(null);
        }}
      />
    </Card>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  if (status === 'balanced') {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (status === 'undistributed') {
    return (
      <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200">
        <Circle className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
      <AlertTriangle className="mr-1 h-3 w-3" />
      {label}
    </Badge>
  );
}
