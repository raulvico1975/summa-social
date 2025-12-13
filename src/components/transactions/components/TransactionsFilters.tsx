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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

// =============================================================================
// TYPES
// =============================================================================

export type TableFilter = 'all' | 'missing' | 'returns' | 'uncategorized' | 'noContact';

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
  t: {
    categorizeAll: string;
    all: string;
    returns: string;
    withoutDocument: string;
    uncategorized: string;
    noContact: string;
    pendingFilters: string;
    exportTooltip: string;
    searchPlaceholder: string;
    hideRemittanceItems: string;
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
  const isPendingFilterActive = ['returns', 'missing', 'uncategorized', 'noContact'].includes(currentFilter);

  // Obtenir el nom del filtre actiu per mostrar al botó
  const getActiveFilterLabel = (): string => {
    switch (currentFilter) {
      case 'returns': return t.returns;
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
          {t.categorizeAll}
        </Button>

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
              {/* Returns filter */}
              {returnsCount > 0 && (
                <DropdownMenuItem
                  onClick={() => onFilterChange('returns')}
                  className={currentFilter === 'returns' ? 'bg-accent' : ''}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  {t.returns} ({returnsCount})
                  {pendingReturnsCount > 0 && (
                    <Badge variant="destructive" className="ml-auto h-5 px-1.5">
                      {pendingReturnsCount}
                    </Badge>
                  )}
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
