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
import { getSafeDuplicateUi } from '@/lib/safe-duplicate-ui';

interface DedupeCandidateResolverProps {
  candidates: ClassifiedRow[];
  safeDuplicates: ClassifiedRow[];
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
  safeDuplicates,
  newCount,
  safeDuplicatesCount,
  candidateCount,
  totalCount,
  onContinue,
  onCancel,
  open,
}: DedupeCandidateResolverProps) {
  const { t, tr } = useTranslations();
  const safeReasonCounts = React.useMemo(() => {
    const counts = {
      BANK_REF: 0,
      BALANCE_AMOUNT_DATE: 0,
      INTRA_FILE: 0,
    };

    for (const row of safeDuplicates) {
      if (row.reason === 'BANK_REF') counts.BANK_REF += 1;
      if (row.reason === 'BALANCE_AMOUNT_DATE') counts.BALANCE_AMOUNT_DATE += 1;
      if (row.reason === 'INTRA_FILE') counts.INTRA_FILE += 1;
    }

    return counts;
  }, [safeDuplicates]);

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

  const getExistingId = (row: ClassifiedRow): string | null => {
    if (row.reason === 'INTRA_FILE') return null;
    return row.matchedExistingIds[0] ?? row.matchedExisting[0]?.id ?? null;
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

        {safeDuplicates.length > 0 && (
          <>
            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
              <p className="font-medium">
                {tr('movements.import.safeDuplicates.title', 'Duplicats segurs')}
              </p>
              <p className="mt-1 text-xs opacity-90">
                {tr('movements.import.safeDuplicates.counts', 'Per tipus')}
              </p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs">
                <span>
                  {tr('movements.import.safeDuplicates.reason.bankRef.label', 'Referència bancària')}: {safeReasonCounts.BANK_REF}
                </span>
                <span>
                  {tr('movements.import.safeDuplicates.reason.balanceAmountDate.label', 'Coincidència completa')}: {safeReasonCounts.BALANCE_AMOUNT_DATE}
                </span>
                <span>
                  {tr('movements.import.safeDuplicates.reason.intraFile.label', 'Línia repetida al fitxer')}: {safeReasonCounts.INTRA_FILE}
                </span>
              </div>
            </div>

            <ScrollArea className="max-h-[280px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[130px]">Data</TableHead>
                    <TableHead className="w-[120px] text-right">Import</TableHead>
                    <TableHead>
                      {tr('movements.import.safeDuplicates.columns.message', 'Missatge')}
                    </TableHead>
                    <TableHead className="w-[220px]">
                      {tr('movements.import.safeDuplicates.columns.detail', 'Detall')}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeDuplicates.map((safeRow, index) => {
                    const safeUi = getSafeDuplicateUi(safeRow.reason);
                    const existingId = getExistingId(safeRow);

                    return (
                      <TableRow key={`safe-${safeRow.tx.description}-${safeRow.tx.date}-${index}`}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {formatDate(safeRow.tx.operationDate ?? safeRow.tx.date)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right font-mono text-xs">
                          {formatAmount(safeRow.tx.amount)}
                        </TableCell>
                        <TableCell className="text-xs">
                          <p className="font-medium">{tr(safeUi.mainKey, safeUi.mainFallback)}</p>
                          <p className="text-muted-foreground">{safeRow.tx.description}</p>
                        </TableCell>
                        <TableCell className="text-xs">
                          <details>
                            <summary className="cursor-pointer text-primary underline-offset-2 hover:underline">
                              {tr('movements.import.safeDuplicates.viewWhy', 'Veure per què')}
                            </summary>
                            <div className="mt-2 space-y-1">
                              {safeUi.detailKey && safeUi.detailFallback && (
                                <p>{tr(safeUi.detailKey, safeUi.detailFallback)}</p>
                              )}
                              {safeUi.showExistingId && existingId && (
                                <p>
                                  {tr('movements.import.safeDuplicates.existingIdLabel', 'ID del moviment existent')}:{' '}
                                  <span className="font-mono">{existingId}</span>
                                </p>
                              )}
                            </div>
                          </details>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </>
        )}

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
