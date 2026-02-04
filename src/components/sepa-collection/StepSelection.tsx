'use client';

import * as React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, AlertTriangle, Users, Search, Info } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Donor } from '@/lib/data';
import { determineSequenceType } from '@/lib/sepa/pain008';

export interface SelectionData {
  selectedIds: Set<string>;
  searchQuery: string;
  periodicityFilter: string | null;
}

interface StepSelectionProps {
  eligible: Donor[];
  excluded: Array<{ donor: Donor; reason: string }>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  totalAmountCents: number;
}

// Periodicitat en mesos per calcular "Següent recomanat"
const PERIODICITY_MONTHS: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  semiannual: 6,
  annual: 12,
};

export function StepSelection({
  eligible,
  excluded,
  selectedIds,
  onSelectionChange,
  totalAmountCents,
}: StepSelectionProps) {
  const { t, tr } = useTranslations();
  const [showExcludedOnly, setShowExcludedOnly] = React.useState(false);

  // Nous filtres
  const [searchQuery, setSearchQuery] = React.useState('');
  const [periodicityFilter, setPeriodicityFilter] = React.useState<string | null>(null);

  // Filtrar elegibles segons cerca i periodicitat
  const filteredEligible = React.useMemo(() => {
    let result = eligible;

    // Filtre de cerca (nom, NIF, IBAN)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(d =>
        d.name.toLowerCase().includes(q) ||
        d.taxId?.toLowerCase().includes(q) ||
        d.iban?.toLowerCase().replace(/\s/g, '').includes(q.replace(/\s/g, ''))
      );
    }

    // Filtre de periodicitat
    if (periodicityFilter) {
      if (periodicityFilter === '__none__') {
        // "Sense periodicitat" = periodicityQuota és null o undefined
        result = result.filter(d => !d.periodicityQuota);
      } else {
        result = result.filter(d => (d.periodicityQuota || 'monthly') === periodicityFilter);
      }
    }

    return result;
  }, [eligible, searchQuery, periodicityFilter]);

  // Calcular estat del checkbox global
  const allFilteredSelected = filteredEligible.length > 0 && filteredEligible.every(d => selectedIds.has(d.id));
  const someFilteredSelected = filteredEligible.some(d => selectedIds.has(d.id));

  // Quan canvien els filtres, netejar seleccionats que ja no són visibles
  React.useEffect(() => {
    const filteredIds = new Set(filteredEligible.map(d => d.id));
    const newSelected = new Set<string>();
    selectedIds.forEach(id => {
      if (filteredIds.has(id)) {
        newSelected.add(id);
      }
    });
    // Només actualitzar si hi ha canvis
    if (newSelected.size !== selectedIds.size) {
      onSelectionChange(newSelected);
    }
  }, [filteredEligible, selectedIds, onSelectionChange]);

  const handleToggleAllFiltered = (checked: boolean) => {
    if (checked) {
      // Afegir tots els filtrats a la selecció
      const newSet = new Set(selectedIds);
      filteredEligible.forEach(d => newSet.add(d.id));
      onSelectionChange(newSet);
    } else {
      // Treure tots els filtrats de la selecció
      const newSet = new Set(selectedIds);
      filteredEligible.forEach(d => newSet.delete(d.id));
      onSelectionChange(newSet);
    }
  };

  const handleClearSelection = () => {
    onSelectionChange(new Set());
  };

  const handleToggle = (donorId: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(donorId)) {
      newSet.delete(donorId);
    } else {
      newSet.add(donorId);
    }
    onSelectionChange(newSet);
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatIban = (iban: string) => {
    // Show last 4 digits only for privacy
    if (iban.length > 4) {
      return '···· ' + iban.slice(-4);
    }
    return iban;
  };

  // Formatar data "Últim pain" com MMM YYYY
  const formatLastRun = (date: string | null | undefined): string => {
    if (!date) return tr('sepaPain008.selection.neverRun', 'Sense historial');
    try {
      const d = new Date(date);
      return d.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
    } catch {
      return tr('sepaPain008.selection.neverRun', 'Sense historial');
    }
  };

  // Calcular "Següent recomanat" segons periodicitat
  const formatNextRecommended = (donor: Donor): string => {
    const periodicity = donor.periodicityQuota || 'monthly';

    // Manual: no mostrar recomanació
    if (periodicity === 'manual') {
      return tr('sepaPain008.selection.manualPeriodicity', 'Manual');
    }

    // Si no ha estat mai cobrat, recomanat ara
    if (!donor.sepaPain008LastRunAt) {
      return '—';
    }

    const monthsToAdd = PERIODICITY_MONTHS[periodicity] || 1;
    try {
      const lastRun = new Date(donor.sepaPain008LastRunAt);
      const nextDate = new Date(lastRun);
      nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
      return nextDate.toLocaleDateString('ca-ES', { month: 'short', year: 'numeric' });
    } catch {
      return '—';
    }
  };

  // Map reason to i18n key
  const getReasonLabel = (reason: string): string => {
    // Motiu dinàmic: IBAN_INCOMPLET:FR:24:27
    if (reason.startsWith('IBAN_INCOMPLET:')) {
      const [, country, length, expected] = reason.split(':');
      return tr('sepaCollection.selection.reasons.ibanIncomplete', 'IBAN {country} incomplet ({length}/{expected})')
        .replace('{country}', country)
        .replace('{length}', length)
        .replace('{expected}', expected);
    }

    const reasonMap: Record<string, string> = {
      'Sense IBAN': t.sepaCollection.selection.reasons.noIban,
      'No és recurrent': tr('sepaCollection.selection.reasons.notRecurring', 'No és recurrent'),
      'Sense NIF': tr('sepaCollection.selection.reasons.noTaxId', 'Sense NIF'),
      "Sense data d'alta": tr('sepaCollection.selection.reasons.noMemberSince', "Sense data d'alta"),
      'Donant inactiu': t.sepaCollection.selection.reasons.donorInactive,
    };
    return reasonMap[reason] || reason;
  };

  // Comptar invàlids
  const invalidIbanCount = excluded.filter(e =>
    e.reason === 'Sense IBAN' || e.reason.toLowerCase().includes('iban')
  ).length;
  const invalidAmountCount = filteredEligible.filter(d =>
    !d.monthlyAmount || d.monthlyAmount <= 0
  ).length;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.sepaCollection.selection.title}</h3>

      {/* Microcopy informatiu */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-700 text-sm">
          {tr('sepaPain008.selection.orientativeNote', 'Orientatiu. No selecciona automàticament.')}
        </AlertDescription>
      </Alert>

      {/* Summary stats */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/50 p-4">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <span className="font-medium">{selectedIds.size}</span>
          <span className="text-muted-foreground text-sm">
            {t.sepaCollection.selection.selected({ count: selectedIds.size })}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <span>
            {tr('sepaPain008.selection.showingOf', 'Mostrant {shown} de {total} socis')
              .replace('{shown}', String(filteredEligible.length))
              .replace('{total}', String(eligible.length))}
          </span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-orange-500" />
          <span>{excluded.length} exclosos</span>
        </div>
        {invalidAmountCount > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span className="text-amber-600 text-sm">
                {invalidAmountCount} {tr('sepaPain008.selection.invalidAmount', 'import invàlid')}
              </span>
            </div>
          </>
        )}
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-bold text-lg">{formatCurrency(totalAmountCents)}</span>
        </div>
      </div>

      {/* Barra de filtres */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Cerca */}
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder={tr('sepaPain008.selection.searchPlaceholder', 'Cercar per nom, NIF o IBAN...')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtre periodicitat */}
        <Select
          value={periodicityFilter || '__all__'}
          onValueChange={(v) => setPeriodicityFilter(v === '__all__' ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={tr('sepaPain008.selection.periodicityFilter', 'Periodicitat')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{tr('sepaPain008.selection.allPeriodicities', 'Totes')}</SelectItem>
            <SelectItem value="__none__">{tr('sepaPain008.selection.noPeriodicitySet', 'Sense periodicitat')}</SelectItem>
            <SelectItem value="monthly">{tr('donors.periodicityQuota.monthly', 'Mensual')}</SelectItem>
            <SelectItem value="quarterly">{tr('donors.periodicityQuota.quarterly', 'Trimestral')}</SelectItem>
            <SelectItem value="semiannual">{tr('donors.periodicityQuota.semiannual', 'Semestral')}</SelectItem>
            <SelectItem value="annual">{tr('donors.periodicityQuota.annual', 'Anual')}</SelectItem>
            <SelectItem value="manual">{tr('donors.periodicityQuota.manual', 'Manual')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Switch exclosos */}
        <div className="flex items-center gap-2">
          <Switch
            id="show-excluded"
            checked={showExcludedOnly}
            onCheckedChange={setShowExcludedOnly}
          />
          <Label htmlFor="show-excluded" className="text-sm">
            Mostrar només exclosos
          </Label>
        </div>
      </div>

      {/* Accions: Checkbox global + Netejar */}
      {!showExcludedOnly && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allFilteredSelected}
              // @ts-expect-error - Radix UI Checkbox suporta indeterminate però TypeScript no ho veu
              indeterminate={someFilteredSelected && !allFilteredSelected}
              onCheckedChange={handleToggleAllFiltered}
            />
            <span className="text-sm">
              {tr('sepaPain008.selection.selectAllFiltered', 'Seleccionar tots els mostrats')} ({filteredEligible.length})
            </span>
          </div>

          {selectedIds.size > 0 && (
            <Button variant="ghost" size="sm" onClick={handleClearSelection}>
              {tr('sepaPain008.selection.clearSelection', 'Netejar selecció')}
            </Button>
          )}
        </div>
      )}

      {/* Table */}
      {!showExcludedOnly ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.name}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.amount}</TableHead>
                <TableHead>{tr('sepaPain008.selection.lastRun', 'Últim pain')}</TableHead>
                <TableHead>{tr('sepaPain008.selection.nextRecommended', 'Següent recomanat')}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.iban}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.sequence}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEligible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {t.sepaCollection.selection.noEligible}
                  </TableCell>
                </TableRow>
              ) : (
                filteredEligible.map((donor) => {
                  const isSelected = selectedIds.has(donor.id);
                  const seqType = determineSequenceType(donor);
                  const hasInvalidAmount = !donor.monthlyAmount || donor.monthlyAmount <= 0;
                  return (
                    <TableRow
                      key={donor.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50',
                        hasInvalidAmount && 'opacity-60'
                      )}
                      onClick={() => handleToggle(donor.id)}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggle(donor.id)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{donor.name}</TableCell>
                      <TableCell>
                        {donor.monthlyAmount ? (
                          formatCurrency(Math.round(donor.monthlyAmount * 100))
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            {tr('sepaPain008.selection.invalidAmount', 'Import invàlid')}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatLastRun(donor.sepaPain008LastRunAt)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatNextRecommended(donor)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {donor.iban ? formatIban(donor.iban) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={seqType === 'FRST' ? 'default' : 'secondary'}>
                          {seqType}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      ) : (
        // Excluded table
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.name}</TableHead>
                <TableHead>Motiu</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {excluded.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Tots els socis són elegibles
                  </TableCell>
                </TableRow>
              ) : (
                excluded.map(({ donor, reason }) => (
                  <TableRow key={donor.id}>
                    <TableCell>
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </TableCell>
                    <TableCell className="font-medium">{donor.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        {getReasonLabel(reason)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
