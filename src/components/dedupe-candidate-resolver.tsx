'use client';

import * as React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useTranslations } from '@/i18n';
import type { ClassifiedRow } from '@/lib/transaction-dedupe';

interface DedupeCandidateResolverProps {
  candidates: ClassifiedRow[];
  newCount: number;
  safeDuplicatesCount: number;
  candidateCount: number;
  totalCount: number;
  onContinue: () => void;
  onCancel: () => void;
  open: boolean;
}

export function DedupeCandidateResolver({
  candidates,
  newCount,
  safeDuplicatesCount,
  candidateCount,
  totalCount,
  onContinue,
  onCancel,
  open,
}: DedupeCandidateResolverProps) {
  const { t, tr } = useTranslations();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('ca-ES');
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (value?: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        onCancel();
      }
    }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {tr('importers.transaction.preImportSummaryTitle', 'Resum pre-importació')}
          </DialogTitle>
          <DialogDescription>
            {tr('importers.transaction.preImportSummaryDescription', 'Revisa el resum abans de confirmar la importació.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{tr('importers.transaction.preImportSummaryNew', 'Nous')}</p>
            <p className="text-xl font-semibold">{newCount}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{tr('importers.transaction.preImportSummaryDuplicates', 'Duplicats')}</p>
            <p className="text-xl font-semibold">{safeDuplicatesCount}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{tr('importers.transaction.preImportSummaryConflicts', 'Conflictes')}</p>
            <p className="text-xl font-semibold">{candidateCount}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{tr('importers.transaction.preImportSummaryTotal', 'Total')}</p>
            <p className="text-xl font-semibold">{totalCount}</p>
          </div>
        </div>

        {candidateCount > 0 ? (
          <>
            <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
              <p className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {tr('importers.transaction.preImportConflictsHint', "S'han detectat conflictes: revisa'ls abans de continuar.")}
              </p>
            </div>

            <ScrollArea className="max-h-[380px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Data</TableHead>
                    <TableHead className="w-[120px] text-right">Import</TableHead>
                    <TableHead className="w-[120px] text-right">Saldo (nou)</TableHead>
                    <TableHead className="w-[120px] text-right">Saldo (existent)</TableHead>
                    <TableHead>Descripció</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.map((candidate, index) => {
                    const existing = candidate.matchedExisting[0];
                    return (
                      <TableRow key={`${candidate.tx.description}-${candidate.tx.date}-${index}`}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(candidate.tx.operationDate ?? candidate.tx.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                          {formatAmount(candidate.tx.amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                          {formatAmount(candidate.tx.balanceAfter)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                          {formatAmount(existing?.balanceAfter)}
                        </TableCell>
                        <TableCell className="text-xs">{candidate.tx.description}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        ) : (
          <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
            {tr('importers.transaction.preImportSummaryNoConflicts', "No s'han detectat conflictes. Pots continuar amb la importació.")}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t.importers?.transaction?.cancel ?? 'Cancel·lar'}
          </Button>
          <Button onClick={onContinue}>
            {t.common?.continue ?? 'Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
