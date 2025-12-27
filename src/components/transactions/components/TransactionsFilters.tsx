'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Sparkles,
  Search,
  X,
  Info,
  Square,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import type { SourceFilter } from '@/lib/constants';
import type { BankAccount } from '@/lib/data';
import { FiltersSheet } from './FiltersSheet';
import { TableOptionsMenu } from './TableOptionsMenu';

// =============================================================================
// TYPES
// =============================================================================

export type TableFilter =
  | 'all'
  | 'missing'
  | 'returns'
  | 'pendingReturns'
  | 'pendingRemittances'
  | 'pendingIndividuals'
  | 'uncategorized'
  | 'noContact'
  | 'donationsNoContact'
  | 'income'
  | 'operatingExpenses'
  | 'missionTransfers'
  | 'donations'
  | 'memberFees';

interface TransactionsFiltersProps {
  currentFilter: TableFilter;
  onFilterChange: (filter: TableFilter) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalCount: number;
  returnsCount: number;
  pendingReturnsCount: number;
  expensesWithoutDocCount: number;
  uncategorizedCount: number;
  noContactCount: number;
  donationsNoContactCount: number;
  hasUncategorized: boolean;
  isBatchCategorizing: boolean;
  onBatchCategorize: () => void;
  onCancelBatch?: () => void;
  onExportExpensesWithoutDoc: () => void;
  hideRemittanceItems: boolean;
  onHideRemittanceItemsChange: (value: boolean) => void;
  showProjectColumn: boolean;
  onShowProjectColumnChange: (value: boolean) => void;
  onOpenReturnImporter?: () => void;
  // Source filter
  sourceFilter: SourceFilter;
  onSourceFilterChange: (filter: SourceFilter) => void;
  // Bank account filter
  bankAccountFilter: string;
  onBankAccountFilterChange: (accountId: string) => void;
  bankAccounts: BankAccount[];
  // Bulk mode (SuperAdmin only)
  isSuperAdmin?: boolean;
  isBulkMode?: boolean;
  onBulkModeChange?: (enabled: boolean) => void;
  batchProgress?: { current: number; total: number } | null;
  t: {
    categorizeAll: string;
    all: string;
    returns: string;
    pendingReturns: string;
    withoutDocument: string;
    uncategorized: string;
    noContact: string;
    donationsNoContact: string;
    pendingFilters: string;
    exportTooltip: string;
    searchPlaceholder: string;
    hideRemittanceItems: string;
    importReturnsFile?: string;
    allAccounts: string;
    // New translations for reorganized UI
    filtersTitle: string;
    filtersDescription: string;
    clearFilters: string;
    applyFilters: string;
    filterByType: string;
    filterBySource: string;
    filterByAccount: string;
    pendingTasks: string;
    tableOptions: string;
    showProjectColumn: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TransactionsFilters = React.memo(function TransactionsFilters({
  currentFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalCount,
  pendingReturnsCount,
  expensesWithoutDocCount,
  uncategorizedCount,
  donationsNoContactCount,
  hasUncategorized,
  isBatchCategorizing,
  onBatchCategorize,
  onCancelBatch,
  hideRemittanceItems,
  onHideRemittanceItemsChange,
  showProjectColumn,
  onShowProjectColumnChange,
  sourceFilter,
  onSourceFilterChange,
  bankAccountFilter,
  onBankAccountFilterChange,
  bankAccounts,
  isSuperAdmin,
  isBulkMode,
  onBulkModeChange,
  batchProgress,
  t,
}: TransactionsFiltersProps) {
  // Count active filters for badge
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (currentFilter !== 'all') count++;
    if (sourceFilter !== 'all') count++;
    if (bankAccountFilter !== '__all__') count++;
    return count;
  }, [currentFilter, sourceFilter, bankAccountFilter]);

  return (
    <div className="flex items-center gap-3 w-full flex-wrap">
      {/* ═══════════════════════════════════════════════════════════════════
          FRANJA 2: Treball actiu (Cerca + Classificar pendents + Mode ràpid)
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Cercador intel·ligent */}
      <div className="relative w-[280px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9 h-9"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Separador visual */}
      <div className="h-6 w-px bg-border" />

      {/* Suggerir categories + Mode ràpid (junts) */}
      <div className="flex items-center gap-2">
        {isBatchCategorizing ? (
          <div className="flex items-center gap-3">
            {/* Progress bar visual */}
            {batchProgress && batchProgress.total > 0 && (
              <div className="flex items-center gap-2 min-w-[140px]">
                <Progress
                  value={(batchProgress.current / batchProgress.total) * 100}
                  className="h-2 w-24"
                />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {batchProgress.current}/{batchProgress.total}
                </span>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={onCancelBatch}
                  variant="outline"
                  size="sm"
                  aria-label="Aturar procés"
                  className="border-destructive text-destructive hover:bg-destructive/10"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Aturar
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Prem per aturar el procés. Els canvis aplicats fins ara es mantenen.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onBatchCategorize}
                disabled={!hasUncategorized}
                variant="default"
                size="sm"
                aria-label="Suggerir categories amb IA"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {t.categorizeAll}
                {uncategorizedCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 px-1.5 bg-primary-foreground/20">
                    {uncategorizedCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">Genera suggeriments i els aplica a mesura que avança. Pots revisar i ajustar després.</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Mode ràpid toggle (només SuperAdmin, adjunt al botó de suggeriments) */}
        {isSuperAdmin && onBulkModeChange && (
          <div className="flex items-center gap-1.5 pl-2 border-l border-border/50">
            <Switch
              id="bulk-mode"
              checked={isBulkMode ?? false}
              onCheckedChange={onBulkModeChange}
              disabled={isBatchCategorizing}
              className="h-4 w-7"
              aria-label="Mode ràpid"
            />
            <Label htmlFor="bulk-mode" className="text-xs cursor-pointer whitespace-nowrap text-muted-foreground">
              Ràpid
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs" side="bottom">
                <p className="text-xs">Accelera el procés reduint el temps entre suggeriments. Pot ser menys precís.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ESPAI FLEXIBLE + ACCIONS DRETA (Filtres + Opcions taula)
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="ml-auto flex items-center gap-2">
        {/* Botó Filtres (obre Sheet) */}
        <FiltersSheet
          currentFilter={currentFilter}
          onFilterChange={onFilterChange}
          sourceFilter={sourceFilter}
          onSourceFilterChange={onSourceFilterChange}
          bankAccountFilter={bankAccountFilter}
          onBankAccountFilterChange={onBankAccountFilterChange}
          bankAccounts={bankAccounts}
          totalCount={totalCount}
          returnsCount={0}
          pendingReturnsCount={pendingReturnsCount}
          expensesWithoutDocCount={expensesWithoutDocCount}
          uncategorizedCount={uncategorizedCount}
          donationsNoContactCount={donationsNoContactCount}
          t={{
            all: t.all,
            returns: t.returns,
            pendingReturns: t.pendingReturns,
            withoutDocument: t.withoutDocument,
            uncategorized: t.uncategorized,
            donationsNoContact: t.donationsNoContact,
            allAccounts: t.allAccounts,
            filtersTitle: t.filtersTitle,
            filtersDescription: t.filtersDescription,
            clearFilters: t.clearFilters,
            applyFilters: t.applyFilters,
            filterByType: t.filterByType,
            filterBySource: t.filterBySource,
            filterByAccount: t.filterByAccount,
            pendingTasks: t.pendingTasks,
          }}
        />

        {/* Opcions de taula */}
        <TableOptionsMenu
          hideRemittanceItems={hideRemittanceItems}
          onHideRemittanceItemsChange={onHideRemittanceItemsChange}
          showProjectColumn={showProjectColumn}
          onShowProjectColumnChange={onShowProjectColumnChange}
          t={{
            tableOptions: t.tableOptions,
            hideRemittanceItems: t.hideRemittanceItems,
            showProjectColumn: t.showProjectColumn,
          }}
        />
      </div>
    </div>
  );
});
