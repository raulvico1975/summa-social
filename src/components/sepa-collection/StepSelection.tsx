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
import { CheckCircle2, XCircle, AlertTriangle, Users } from 'lucide-react';
import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';
import type { Donor } from '@/lib/data';
import { determineSequenceType } from '@/lib/sepa/pain008';

export interface SelectionData {
  selectedIds: Set<string>;
}

interface StepSelectionProps {
  eligible: Donor[];
  excluded: Array<{ donor: Donor; reason: string }>;
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  totalAmountCents: number;
}

export function StepSelection({
  eligible,
  excluded,
  selectedIds,
  onSelectionChange,
  totalAmountCents,
}: StepSelectionProps) {
  const { t } = useTranslations();
  const [showExcludedOnly, setShowExcludedOnly] = React.useState(false);

  const handleSelectAll = () => {
    onSelectionChange(new Set(eligible.map(d => d.id)));
  };

  const handleDeselectAll = () => {
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

  // Map reason to i18n key
  const getReasonLabel = (reason: string): string => {
    const reasonMap: Record<string, string> = {
      'Sense IBAN': t.sepaCollection.selection.reasons.noIban,
      'Sense mandat SEPA': t.sepaCollection.selection.reasons.noMandate,
      'Mandat SEPA inactiu': t.sepaCollection.selection.reasons.mandateInactive,
      'Sense UMR': t.sepaCollection.selection.reasons.noUmr,
      'Sense data signatura': t.sepaCollection.selection.reasons.noSignatureDate,
      'Donant inactiu': t.sepaCollection.selection.reasons.donorInactive,
    };
    return reasonMap[reason] || reason;
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.sepaCollection.selection.title}</h3>

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
          <span>{eligible.length} elegibles</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <XCircle className="h-5 w-5 text-orange-500" />
          <span>{excluded.length} exclosos</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-bold text-lg">{formatCurrency(totalAmountCents)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            {t.sepaCollection.selection.selectAll}
          </Button>
          <Button variant="outline" size="sm" onClick={handleDeselectAll}>
            {t.sepaCollection.selection.deselectAll}
          </Button>
        </div>

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

      {/* Table */}
      {!showExcludedOnly ? (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.name}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.amount}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.iban}</TableHead>
                <TableHead>UMR</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.sequence}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {eligible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    {t.sepaCollection.selection.noEligible}
                  </TableCell>
                </TableRow>
              ) : (
                eligible.map((donor) => {
                  const isSelected = selectedIds.has(donor.id);
                  const seqType = donor.sepaMandate ? determineSequenceType(donor) : '-';
                  return (
                    <TableRow
                      key={donor.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
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
                        {donor.monthlyAmount ? formatCurrency(Math.round(donor.monthlyAmount * 100)) : '-'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {donor.iban ? formatIban(donor.iban) : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {donor.sepaMandate?.umr || '-'}
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
