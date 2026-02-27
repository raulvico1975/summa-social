'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Filter, X, Undo2, Circle, User } from 'lucide-react';
import type { TableFilter } from './TransactionsFilters';
import type { SourceFilter } from '@/lib/constants';

// =============================================================================
// TYPES
// =============================================================================

interface FiltersSheetProps {
  // Filters state
  currentFilter: TableFilter;
  onFilterChange: (filter: TableFilter) => void;
  sourceFilter: SourceFilter;
  onSourceFilterChange: (filter: SourceFilter) => void;
  bankAccountFilter: string;
  onBankAccountFilterChange: (accountId: string) => void;
  // Counts for badges
  totalCount: number;
  returnsCount: number;
  pendingReturnsCount: number;
  expensesWithoutDocCount: number;
  uncategorizedCount: number;
  donationsNoContactCount: number;
  // Translations
  t: {
    all: string;
    returns: string;
    pendingReturns: string;
    withoutDocument: string;
    uncategorized: string;
    donationsNoContact: string;
    allAccounts: string;
    filtersTitle: string;
    filtersDescription: string;
    clearFilters: string;
    applyFilters: string;
    filterByType: string;
    filterBySource: string;
    filterByAccount: string;
    pendingTasks: string;
    // Source filter labels
    sourceAll?: string;
    sourceBank?: string;
    sourceRemittance?: string;
    sourceManual?: string;
    sourceStripe?: string;
    sourceEmpty?: string;
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export const FiltersSheet = React.memo(function FiltersSheet({
  currentFilter,
  onFilterChange,
  sourceFilter,
  onSourceFilterChange,
  bankAccountFilter,
  onBankAccountFilterChange,
  totalCount,
  pendingReturnsCount,
  expensesWithoutDocCount,
  donationsNoContactCount,
  t,
}: FiltersSheetProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  // Count active filters (excluding 'all' and '__all__')
  const activeFiltersCount = React.useMemo(() => {
    let count = 0;
    if (currentFilter !== 'all') count++;
    if (sourceFilter !== 'all') count++;
    if (bankAccountFilter !== '__all__') count++;
    return count;
  }, [currentFilter, sourceFilter, bankAccountFilter]);

  // Clear all filters
  const handleClearFilters = React.useCallback(() => {
    onFilterChange('all');
    onSourceFilterChange('all');
    onBankAccountFilterChange('__all__');
  }, [onFilterChange, onSourceFilterChange, onBankAccountFilterChange]);

  // Filter options for type filter
  const typeOptions: Array<{ value: TableFilter; label: string; count?: number; icon?: React.ReactNode; color?: string }> = [
    { value: 'all', label: t.all, count: totalCount },
    { value: 'pendingReturns', label: t.pendingReturns, count: pendingReturnsCount, icon: <Undo2 className="h-4 w-4" />, color: 'text-red-500' },
    { value: 'missing', label: t.withoutDocument, count: expensesWithoutDocCount, icon: <Circle className="h-4 w-4" />, color: 'text-muted-foreground' },
    { value: 'donationsNoContact', label: t.donationsNoContact, count: donationsNoContactCount, icon: <User className="h-4 w-4" />, color: 'text-orange-500' },
  ];

  // Source filter options
  const sourceOptions = [
    { value: 'all', label: t.sourceAll ?? 'Tots' },
    { value: 'bank', label: t.sourceBank ?? 'Banc' },
    { value: 'remittance', label: t.sourceRemittance ?? 'Remesa' },
    { value: 'manual', label: t.sourceManual ?? 'Manual' },
    { value: 'stripe', label: t.sourceStripe ?? 'Stripe' },
    { value: 'null', label: t.sourceEmpty ?? '(buit)' },
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          {t.filtersTitle}
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t.filtersTitle}
          </SheetTitle>
          <SheetDescription>
            {t.filtersDescription}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Type filter (pending tasks) */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t.filterByType}</Label>
            <RadioGroup
              value={currentFilter}
              onValueChange={(value) => onFilterChange(value as TableFilter)}
              className="space-y-2"
            >
              {typeOptions.map((option) => (
                <div
                  key={option.value}
                  className={`flex items-center space-x-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                    currentFilter === option.value ? 'border-primary bg-primary/5' : 'hover:bg-accent'
                  }`}
                  onClick={() => onFilterChange(option.value)}
                >
                  <RadioGroupItem value={option.value} id={option.value} />
                  <div className="flex-1 flex items-center gap-2">
                    {option.icon && <span className={option.color}>{option.icon}</span>}
                    <Label htmlFor={option.value} className="cursor-pointer flex-1">
                      {option.label}
                    </Label>
                    {option.count !== undefined && option.count > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {option.count}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Source filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">{t.filterBySource}</Label>
            <Select value={sourceFilter} onValueChange={(v) => onSourceFilterChange(v as SourceFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sourceOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            disabled={activeFiltersCount === 0}
            className="gap-1"
          >
            <X className="h-4 w-4" />
            {t.clearFilters}
          </Button>
          <SheetClose asChild>
            <Button size="sm">
              {t.applyFilters}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
});
