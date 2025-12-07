'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Heart, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/i18n';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

  const handleSelect = (donorId: string) => {
    onSelect(donorId === value ? null : donorId);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
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
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[350px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t.donorSearchCombobox.searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{t.donorSearchCombobox.noResults}</CommandEmpty>
            <CommandGroup heading={`${t.donorSearchCombobox.donors} (${filteredDonors.length})`}>
              {filteredDonors.slice(0, 50).map((donor) => (
                <CommandItem
                  key={donor.id}
                  value={donor.id}
                  onSelect={() => handleSelect(donor.id)}
                  className="flex items-center gap-2"
                >
                  <Check
                    className={cn(
                      'h-4 w-4 shrink-0',
                      value === donor.id ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <Heart className="h-3 w-3 text-red-500 shrink-0" />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate">{donor.name}</span>
                    {donor.taxId && (
                      <span className="text-xs text-muted-foreground">{donor.taxId}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
              {filteredDonors.length > 50 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground text-center">
                  {t.donorSearchCombobox.showingFirst50}
                </div>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
