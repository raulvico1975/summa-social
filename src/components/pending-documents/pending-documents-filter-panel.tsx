'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Check, Search, CalendarIcon, X, Filter, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { ca } from 'date-fns/locale';
import type { Contact, Category } from '@/lib/data';
import type { PendingDocument } from '@/lib/pending-documents/types';
import { useTranslations } from '@/i18n';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface PendingDocumentsFilters {
  search: string;
  supplierId: string | null;
  categoryId: string | null;
  dateFrom: string | null;  // YYYY-MM-DD
  dateTo: string | null;    // YYYY-MM-DD
  amountMin: number | null;
  amountMax: number | null;
}

export const EMPTY_FILTERS: PendingDocumentsFilters = {
  search: '',
  supplierId: null,
  categoryId: null,
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
};

interface PendingDocumentsFilterPanelProps {
  filters: PendingDocumentsFilters;
  onFiltersChange: (filters: PendingDocumentsFilters) => void;
  contacts: Contact[];
  categories: Category[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function hasActiveFilters(filters: PendingDocumentsFilters): boolean {
  return (
    filters.search !== '' ||
    filters.supplierId !== null ||
    filters.categoryId !== null ||
    filters.dateFrom !== null ||
    filters.dateTo !== null ||
    filters.amountMin !== null ||
    filters.amountMax !== null
  );
}

/**
 * Client-side filter function for pending documents.
 * This is exported so page.tsx can use it.
 */
export function filterPendingDocuments(
  docs: PendingDocument[],
  filters: PendingDocumentsFilters,
  contacts: Contact[]
): PendingDocument[] {
  return docs.filter(doc => {
    // Search filter (invoice number, filename, supplier name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const invoiceMatch = doc.invoiceNumber?.toLowerCase().includes(searchLower) ?? false;
      const filenameMatch = doc.file.filename.toLowerCase().includes(searchLower);

      // Get supplier name for search
      let supplierMatch = false;
      if (doc.supplierId) {
        const supplier = contacts.find(c => c.id === doc.supplierId);
        supplierMatch = supplier?.name.toLowerCase().includes(searchLower) ?? false;
      }

      if (!invoiceMatch && !filenameMatch && !supplierMatch) {
        return false;
      }
    }

    // Supplier filter
    if (filters.supplierId && doc.supplierId !== filters.supplierId) {
      return false;
    }

    // Category filter
    if (filters.categoryId && doc.categoryId !== filters.categoryId) {
      return false;
    }

    // Date range filter
    if (filters.dateFrom && doc.invoiceDate) {
      if (doc.invoiceDate < filters.dateFrom) {
        return false;
      }
    }
    if (filters.dateTo && doc.invoiceDate) {
      if (doc.invoiceDate > filters.dateTo) {
        return false;
      }
    }

    // Amount range filter
    if (filters.amountMin !== null && doc.amount !== null) {
      if (doc.amount < filters.amountMin) {
        return false;
      }
    }
    if (filters.amountMax !== null && doc.amount !== null) {
      if (doc.amount > filters.amountMax) {
        return false;
      }
    }

    return true;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function PendingDocumentsFilterPanel({
  filters,
  onFiltersChange,
  contacts,
  categories,
}: PendingDocumentsFilterPanelProps) {
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;

  // Combobox open states
  const [supplierOpen, setSupplierOpen] = React.useState(false);
  const [categoryOpen, setCategoryOpen] = React.useState(false);
  const [dateFromOpen, setDateFromOpen] = React.useState(false);
  const [dateToOpen, setDateToOpen] = React.useState(false);
  const [showAmountFilter, setShowAmountFilter] = React.useState(false);

  // Debounce for search
  const searchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const [localSearch, setLocalSearch] = React.useState(filters.search);

  React.useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleSearchChange = (value: string) => {
    setLocalSearch(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    searchTimeoutRef.current = setTimeout(() => {
      onFiltersChange({ ...filters, search: value });
    }, 300);
  };

  React.useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Filter suppliers
  const suppliers = React.useMemo(() =>
    contacts.filter(c => c.type === 'supplier' || c.roles?.supplier),
    [contacts]
  );

  // Filter expense categories
  const expenseCategories = React.useMemo(() =>
    categories.filter(c => c.type === 'expense'),
    [categories]
  );

  // Parse dates
  const dateFrom = filters.dateFrom ? parseISO(filters.dateFrom) : undefined;
  const dateTo = filters.dateTo ? parseISO(filters.dateTo) : undefined;
  const validDateFrom = dateFrom && isValid(dateFrom) ? dateFrom : undefined;
  const validDateTo = dateTo && isValid(dateTo) ? dateTo : undefined;

  // Get selected names for display
  const selectedSupplierName = filters.supplierId
    ? suppliers.find(s => s.id === filters.supplierId)?.name
    : null;
  const selectedCategoryName = filters.categoryId
    ? (() => {
        const cat = expenseCategories.find(c => c.id === filters.categoryId);
        return cat ? (categoryTranslations[cat.name] || cat.name) : null;
      })()
    : null;

  const hasFilters = hasActiveFilters(filters);

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Search */}
      <div className="relative w-full sm:w-auto">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t.pendingDocs.filters.search}
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-8 w-full sm:w-[200px] h-9"
        />
      </div>

      {/* Supplier filter */}
      <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            size="sm"
            className={cn(
              'flex-1 sm:flex-none sm:w-[150px] justify-between h-9',
              !filters.supplierId && 'text-muted-foreground'
            )}
          >
            <span className="truncate">
              {selectedSupplierName || t.pendingDocs.filters.supplier}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t.pendingDocs.filters.searchSupplier} className="h-9" />
            <CommandList>
              <CommandEmpty>{t.pendingDocs.filters.noSupplierFound}</CommandEmpty>
              <CommandGroup>
                {suppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.id}
                    value={supplier.name}
                    onSelect={() => {
                      onFiltersChange({
                        ...filters,
                        supplierId: filters.supplierId === supplier.id ? null : supplier.id,
                      });
                      setSupplierOpen(false);
                    }}
                  >
                    {supplier.name}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        filters.supplierId === supplier.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Category filter */}
      <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            size="sm"
            className={cn(
              'flex-1 sm:flex-none sm:w-[140px] justify-between h-9',
              !filters.categoryId && 'text-muted-foreground'
            )}
          >
            <span className="truncate">
              {selectedCategoryName || t.pendingDocs.filters.category}
            </span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <Command>
            <CommandInput placeholder={t.pendingDocs.filters.searchCategory} className="h-9" />
            <CommandList>
              <CommandEmpty>{t.pendingDocs.filters.noCategoryFound}</CommandEmpty>
              <CommandGroup>
                {expenseCategories.map((category) => (
                  <CommandItem
                    key={category.id}
                    value={categoryTranslations[category.name] || category.name}
                    onSelect={() => {
                      onFiltersChange({
                        ...filters,
                        categoryId: filters.categoryId === category.id ? null : category.id,
                      });
                      setCategoryOpen(false);
                    }}
                  >
                    {categoryTranslations[category.name] || category.name}
                    <Check
                      className={cn(
                        'ml-auto h-4 w-4',
                        filters.categoryId === category.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Date from */}
      <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-[120px] justify-start h-9',
              !filters.dateFrom && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-1 h-3 w-3" />
            {validDateFrom ? format(validDateFrom, 'dd/MM/yy') : t.pendingDocs.filters.dateFrom}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={validDateFrom}
            onSelect={(date) => {
              onFiltersChange({
                ...filters,
                dateFrom: date ? format(date, 'yyyy-MM-dd') : null,
              });
              setDateFromOpen(false);
            }}
            locale={ca}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Date to */}
      <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-[120px] justify-start h-9',
              !filters.dateTo && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-1 h-3 w-3" />
            {validDateTo ? format(validDateTo, 'dd/MM/yy') : t.pendingDocs.filters.dateTo}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={validDateTo}
            onSelect={(date) => {
              onFiltersChange({
                ...filters,
                dateTo: date ? format(date, 'yyyy-MM-dd') : null,
              });
              setDateToOpen(false);
            }}
            locale={ca}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      {/* Amount filter toggle */}
      <Popover open={showAmountFilter} onOpenChange={setShowAmountFilter}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9',
              (filters.amountMin !== null || filters.amountMax !== null) && 'border-primary'
            )}
          >
            <Filter className="mr-1 h-3 w-3" />
            {t.pendingDocs.filters.amount}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-3" align="start">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t.pendingDocs.filters.amountMin}
                value={filters.amountMin ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onFiltersChange({
                    ...filters,
                    amountMin: val ? parseFloat(val) : null,
                  });
                }}
                className="h-8"
              />
              <span className="text-muted-foreground">€</span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t.pendingDocs.filters.amountMax}
                value={filters.amountMax ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onFiltersChange({
                    ...filters,
                    amountMax: val ? parseFloat(val) : null,
                  });
                }}
                className="h-8"
              />
              <span className="text-muted-foreground">€</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange(EMPTY_FILTERS)}
          className="h-9 text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-3 w-3" />
          {t.pendingDocs.filters.clear}
        </Button>
      )}
    </div>
  );
}
