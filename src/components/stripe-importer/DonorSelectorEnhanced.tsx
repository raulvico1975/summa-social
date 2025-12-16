'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Heart, UserPlus } from 'lucide-react';
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
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface Contact {
  id: string;
  name: string;
  type: 'donor' | 'supplier' | 'employee';
  email?: string;
}

interface DonorSelectorEnhancedProps {
  donors: Contact[];
  value: string | null;
  onSelect: (contactId: string | null) => void;
  onCreateNew: () => void;
  emailToMatch?: string; // Email from CSV for exact matching
}

/**
 * Enhanced DonorSelector for StripeImporter with:
 * - Create new donor option
 * - Email exact match prioritization
 * - Better UX with donor-specific language
 */
export const DonorSelectorEnhanced = React.memo(function DonorSelectorEnhanced({
  donors,
  value,
  onSelect,
  onCreateNew,
  emailToMatch,
}: DonorSelectorEnhancedProps) {
  const { t } = useTranslations();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const selectedDonor = donors.find((donor) => donor.id === value);

  // Filter and sort donors
  const filteredAndSortedDonors = React.useMemo(() => {
    const searchLower = search.toLowerCase();
    const emailLower = emailToMatch?.toLowerCase();

    // Filter donors by search
    const filtered = donors.filter(
      (donor) =>
        donor.name.toLowerCase().includes(searchLower) ||
        donor.email?.toLowerCase().includes(searchLower)
    );

    // Sort: exact email match first, then by name
    return filtered.sort((a, b) => {
      // Priority 1: Exact email match
      if (emailLower) {
        const aExactMatch = a.email?.toLowerCase() === emailLower;
        const bExactMatch = b.email?.toLowerCase() === emailLower;

        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
      }

      // Priority 2: Name match
      const aNameMatch = a.name.toLowerCase().includes(searchLower);
      const bNameMatch = b.name.toLowerCase().includes(searchLower);

      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;

      // Priority 3: Alphabetical by name
      return a.name.localeCompare(b.name);
    });
  }, [donors, search, emailToMatch]);

  const handleSelect = (donorId: string) => {
    onSelect(donorId === value ? null : donorId);
    setOpen(false);
    setSearch('');
  };

  const handleUnlink = () => {
    onSelect(null);
    setOpen(false);
    setSearch('');
  };

  const handleCreateNew = () => {
    setOpen(false);
    setSearch('');
    onCreateNew();
  };

  const hasExactEmailMatch = emailToMatch
    ? filteredAndSortedDonors.some(
        (d) => d.email?.toLowerCase() === emailToMatch.toLowerCase()
      )
    : false;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {selectedDonor ? (
          <Button
            variant="ghost"
            className="h-auto p-0 text-left font-normal flex items-center gap-1"
          >
            <Heart className="h-3 w-3 text-red-500 shrink-0" />
            <span className="text-sm truncate max-w-[90px]" title={selectedDonor.name}>
              {selectedDonor.name}
            </span>
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground ml-1" />
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="text-muted-foreground h-7 text-xs px-2">
            <UserPlus className="mr-1 h-3 w-3" />
            {t.importers.stripeImporter.donorSelector.selectDonor}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t.importers.stripeImporter.donorSelector.searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            {filteredAndSortedDonors.length === 0 ? (
              <CommandEmpty>{t.importers.stripeImporter.donorSelector.emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredAndSortedDonors.map((donor) => {
                  const isExactEmailMatch =
                    emailToMatch && donor.email?.toLowerCase() === emailToMatch.toLowerCase();

                  return (
                    <CommandItem
                      key={donor.id}
                      value={donor.id}
                      onSelect={() => handleSelect(donor.id)}
                    >
                      <Check
                        className={cn(
                          'mr-2 h-4 w-4',
                          value === donor.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                      <Heart className="mr-2 h-3 w-3 text-red-500" />
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium truncate">{donor.name}</span>
                        {donor.email && (
                          <span className="text-xs text-muted-foreground truncate">
                            {donor.email}
                            {isExactEmailMatch && (
                              <span className="ml-2 text-green-600 font-medium">
                                ({t.importers.stripeImporter.donorSelector.emailMatch})
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {/* Create new donor option */}
            <CommandSeparator />
            <CommandGroup>
              <CommandItem onSelect={handleCreateNew}>
                <UserPlus className="mr-2 h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">
                  {t.importers.stripeImporter.donorSelector.createNew}
                </span>
              </CommandItem>
            </CommandGroup>

            {/* Unlink option */}
            {value && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleUnlink}>
                    Desvincular
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
