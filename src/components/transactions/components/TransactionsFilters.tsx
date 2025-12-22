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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sparkles,
  Loader2,
  Circle,
  AlertTriangle,
  Undo2,
  Download,
  Search,
  X,
  ChevronDown,
  User,
  FileUp,
  Info,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import type { TransactionUrlFilter } from '@/lib/constants';

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
  hasUncategorized: boolean;
  isBatchCategorizing: boolean;
  onBatchCategorize: () => void;
  onExportExpensesWithoutDoc: () => void;
  hideRemittanceItems: boolean;
  onHideRemittanceItemsChange: (value: boolean) => void;
  onOpenReturnImporter?: () => void;
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
    pendingFilters: string;
    exportTooltip: string;
    searchPlaceholder: string;
    hideRemittanceItems: string;
    importReturnsFile?: string;
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
  returnsCount,
  pendingReturnsCount,
  expensesWithoutDocCount,
  uncategorizedCount,
  noContactCount,
  hasUncategorized,
  isBatchCategorizing,
  onBatchCategorize,
  onExportExpensesWithoutDoc,
  hideRemittanceItems,
  onHideRemittanceItemsChange,
  onOpenReturnImporter,
  isSuperAdmin,
  isBulkMode,
  onBulkModeChange,
  batchProgress,
  t,
}: TransactionsFiltersProps) {
  // Calcular quants tipus de pendents tenen elements
  const pendingTypesCount = [
    returnsCount > 0,
    expensesWithoutDocCount > 0,
    uncategorizedCount > 0,
    noContactCount > 0,
  ].filter(Boolean).length;

  // Comprovar si un filtre de pendents està actiu
  const isPendingFilterActive = ['returns', 'pendingReturns', 'missing', 'uncategorized', 'noContact'].includes(currentFilter);

  // Obtenir el nom del filtre actiu per mostrar al botó
  const getActiveFilterLabel = (): string => {
    switch (currentFilter) {
      case 'returns': return t.returns;
      case 'pendingReturns': return t.pendingReturns;
      case 'missing': return t.withoutDocument;
      case 'uncategorized': return t.uncategorized;
      case 'noContact': return t.noContact;
      default: return t.pendingFilters;
    }
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Cercador intel·ligent */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-9"
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

      {/* Filtres i accions */}
      <div className="flex gap-2 items-center flex-wrap">
        {/* Categorize All button */}
        <Button
          onClick={onBatchCategorize}
          disabled={!hasUncategorized || isBatchCategorizing}
          variant="default"
          size="sm"
        >
          {isBatchCategorizing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {batchProgress
            ? `${batchProgress.current} / ${batchProgress.total}`
            : t.categorizeAll}
        </Button>

        {/* Bulk mode toggle (SuperAdmin only) */}
        {isSuperAdmin && onBulkModeChange && (
          <div className="flex items-center gap-2">
            <Switch
              id="bulk-mode"
              checked={isBulkMode ?? false}
              onCheckedChange={onBulkModeChange}
              disabled={isBatchCategorizing}
            />
            <Label htmlFor="bulk-mode" className="text-sm cursor-pointer whitespace-nowrap">
              Mode ràpid
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Accelera la categorització. Pot esgotar quota i degradarà automàticament.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        <div className="h-4 w-px bg-border" />

        {/* All filter */}
        <Button
          variant={currentFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('all')}
        >
          {t.all} ({totalCount})
        </Button>

        {/* Pending filters dropdown */}
        {pendingTypesCount > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={isPendingFilterActive ? 'default' : 'outline'}
                size="sm"
                className={!isPendingFilterActive && pendingReturnsCount > 0 ? 'border-red-300 text-red-600' : ''}
              >
                {isPendingFilterActive ? getActiveFilterLabel() : t.pendingFilters} ({pendingTypesCount})
                <ChevronDown className="ml-1.5 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {/* Pending Returns filter (only unassigned returns, excludes fees) */}
              {pendingReturnsCount > 0 && (
                <DropdownMenuItem
                  onClick={() => onFilterChange('pendingReturns')}
                  className={currentFilter === 'pendingReturns' ? 'bg-accent' : ''}
                >
                  <Undo2 className="mr-2 h-4 w-4 text-red-500" />
                  {t.pendingReturns} ({pendingReturnsCount})
                  <Badge variant="destructive" className="ml-auto h-5 px-1.5">
                    !
                  </Badge>
                </DropdownMenuItem>
              )}

              {/* All Returns filter (returns + fees) */}
              {returnsCount > 0 && (
                <DropdownMenuItem
                  onClick={() => onFilterChange('returns')}
                  className={currentFilter === 'returns' ? 'bg-accent' : ''}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {t.returns} ({returnsCount})
                </DropdownMenuItem>
              )}

              {/* Without document filter */}
              {expensesWithoutDocCount > 0 && (
                <DropdownMenuItem
                  onClick={() => onFilterChange('missing')}
                  className={currentFilter === 'missing' ? 'bg-accent' : ''}
                >
                  <Circle className="mr-2 h-4 w-4 fill-muted-foreground text-muted-foreground" />
                  {t.withoutDocument} ({expensesWithoutDocCount})
                </DropdownMenuItem>
              )}

              {/* Uncategorized filter */}
              {uncategorizedCount > 0 && (
                <DropdownMenuItem
                  onClick={() => onFilterChange('uncategorized')}
                  className={currentFilter === 'uncategorized' ? 'bg-accent' : ''}
                >
                  <AlertTriangle className="mr-2 h-4 w-4 text-orange-500" />
                  {t.uncategorized} ({uncategorizedCount})
                </DropdownMenuItem>
              )}

              {/* No contact filter */}
              {noContactCount > 0 && (
                <DropdownMenuItem
                  onClick={() => onFilterChange('noContact')}
                  className={currentFilter === 'noContact' ? 'bg-accent' : ''}
                >
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  {t.noContact} ({noContactCount})
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* CTA: Importar fitxer del banc (visible quan filtre pendingReturns actiu) */}
        {currentFilter === 'pendingReturns' && onOpenReturnImporter && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenReturnImporter}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            <FileUp className="mr-1 h-4 w-4" />
            {t.importReturnsFile || 'Importar fitxer del banc'}
          </Button>
        )}

        {/* Export button */}
        {expensesWithoutDocCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={onExportExpensesWithoutDoc}
              >
                <Download className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t.exportTooltip}
            </TooltipContent>
          </Tooltip>
        )}

        {/* Hide remittance items checkbox */}
        <div className="flex items-center space-x-2 ml-auto">
          <Checkbox
            id="hideRemittanceItems"
            checked={hideRemittanceItems}
            onCheckedChange={(checked) => onHideRemittanceItemsChange(checked === true)}
          />
          <Label htmlFor="hideRemittanceItems" className="text-sm text-muted-foreground cursor-pointer">
            {t.hideRemittanceItems}
          </Label>
        </div>
      </div>
    </div>
  );
});
