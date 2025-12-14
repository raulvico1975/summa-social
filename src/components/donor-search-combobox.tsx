'use client';

import * as React from 'react';
import { Check, Heart, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslations } from '@/i18n';
import type { Donor } from '@/lib/data';

interface DonorSearchComboboxProps {
  donors: Donor[];
  value: string | null;
  onSelect: (donorId: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function DonorSearchCombobox({
  donors,
  value,
  onSelect,
  placeholder,
  className,
}: DonorSearchComboboxProps) {
  const { t } = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const placeholderText = placeholder || t.movements.table.selectDonor;
  const selectedDonor = donors.find((donor) => donor.id === value);

  // Filtra donants per nom o DNI
  const filteredDonors = React.useMemo(() => {
    if (!search.trim()) return donors;
    const searchLower = search.toLowerCase().trim();
    return donors.filter((donor) =>
      donor.name.toLowerCase().includes(searchLower) ||
      (donor.taxId && donor.taxId.toLowerCase().includes(searchLower))
    );
  }, [donors, search]);

  // Tancar quan es clica fora
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const handleSelect = (donorId: string) => {
    onSelect(donorId === value ? null : donorId);
    setOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(null);
    setSearch('');
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="w-full justify-between"
      >
        {selectedDonor ? (
          <span className="flex items-center gap-2 truncate">
            <Heart className="h-4 w-4 text-red-500 shrink-0" />
            <span className="truncate">{selectedDonor.name}</span>
            {selectedDonor.taxId && (
              <span className="text-muted-foreground text-xs">({selectedDonor.taxId})</span>
            )}
          </span>
        ) : (
          <span className="text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4" />
            {placeholderText}
          </span>
        )}
        {selectedDonor ? (
          <X
            className="h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={handleClear}
          />
        ) : (
          <Search className="h-4 w-4 shrink-0 opacity-50" />
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[9999] bg-popover border rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b">
            <Input
              placeholder={t.donorSearchCombobox?.searchPlaceholder || "Cerca per nom o DNI..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
              autoFocus
            />
          </div>

          {/* Results */}
          <ScrollArea className="h-[250px]">
            <div className="p-1">
              {filteredDonors.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {t.donorSearchCombobox?.noResults || "Cap resultat"}
                </div>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    {t.donorSearchCombobox?.donors || "Donants"} ({filteredDonors.length})
                  </div>
                  {filteredDonors.slice(0, 50).map((donor) => (
                    <button
                      key={donor.id}
                      type="button"
                      onClick={() => handleSelect(donor.id)}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm",
                        "hover:bg-accent hover:text-accent-foreground",
                        "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                        value === donor.id && "bg-accent"
                      )}
                    >
                      <Check
                        className={cn(
                          'h-4 w-4 shrink-0',
                          value === donor.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Heart className="h-3 w-3 text-red-500 shrink-0" />
                      <div className="flex flex-col min-w-0 flex-1 text-left">
                        <span className="truncate">{donor.name}</span>
                        {donor.taxId && (
                          <span className="text-xs text-muted-foreground">{donor.taxId}</span>
                        )}
                      </div>
                    </button>
                  ))}
                  {filteredDonors.length > 50 && (
                    <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                      {t.donorSearchCombobox?.showingFirst50 || "Mostrant els primers 50"}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
