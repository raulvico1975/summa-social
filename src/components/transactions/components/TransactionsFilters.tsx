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
  Loader2,
  Circle,
  AlertTriangle,
  Undo2,
  Download,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type TableFilter = 'all' | 'missing' | 'returns' | 'uncategorized' | 'noContact';

interface TransactionsFiltersProps {
  currentFilter: TableFilter;
  onFilterChange: (filter: TableFilter) => void;
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
  t: {
    categorizeAll: string;
    all: string;
    returns: string;
    withoutDocument: string;
    uncategorized: string;
    noContact: string;
    exportTooltip: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TransactionsFilters = React.memo(function TransactionsFilters({
  currentFilter,
  onFilterChange,
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
  t,
}: TransactionsFiltersProps) {
  return (
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

      {/* Returns filter */}
      {returnsCount > 0 && (
        <Button
          variant={currentFilter === 'returns' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('returns')}
          className={currentFilter !== 'returns' && pendingReturnsCount > 0 ? 'border-red-300 text-red-600' : ''}
        >
          <Undo2 className="mr-1.5 h-3 w-3" />
          {t.returns} ({returnsCount})
          {pendingReturnsCount > 0 && (
            <Badge variant="destructive" className="ml-2 h-5 px-1.5">
              {pendingReturnsCount}
            </Badge>
          )}
        </Button>
      )}

      {/* Without document filter */}
      {expensesWithoutDocCount > 0 && (
        <Button
          variant={currentFilter === 'missing' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('missing')}
        >
          <Circle className="mr-1.5 h-2 w-2 fill-muted-foreground text-muted-foreground" />
          {t.withoutDocument} ({expensesWithoutDocCount})
        </Button>
      )}

      {/* Uncategorized filter */}
      {uncategorizedCount > 0 && (
        <Button
          variant={currentFilter === 'uncategorized' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('uncategorized')}
          className={currentFilter !== 'uncategorized' ? 'border-orange-300 text-orange-600' : ''}
        >
          <AlertTriangle className="mr-1.5 h-3 w-3" />
          {t.uncategorized} ({uncategorizedCount})
        </Button>
      )}

      {/* No contact filter */}
      {noContactCount > 0 && (
        <Button
          variant={currentFilter === 'noContact' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('noContact')}
        >
          <Circle className="mr-1.5 h-2 w-2 fill-muted-foreground text-muted-foreground" />
          {t.noContact} ({noContactCount})
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
    </div>
  );
});
