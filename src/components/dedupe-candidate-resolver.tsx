'use client';

import * as React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useTranslations } from '@/i18n';
import type { ClassifiedRow } from '@/lib/transaction-dedupe';
import { getSafeDuplicateUi } from '@/lib/safe-duplicate-ui';
import type { ParseSummary, ParsedBankStatementRow } from '@/lib/importers/bank/bankStatementParser';

interface DedupeCandidateResolverProps {
  candidates: ClassifiedRow[];
  safeDuplicates: ClassifiedRow[];
  parseSummary: ParseSummary | null;
  sampleRows: ParsedBankStatementRow[];
  hasMappedBalance: boolean;
  onContinue: () => void;
  onCancel: () => void;
  open: boolean;
}

export function DedupeCandidateResolver({
  candidates,
  safeDuplicates,
  parseSummary,
  sampleRows,
  hasMappedBalance,
  onContinue,
  onCancel,
  open,
}: DedupeCandidateResolverProps) {
  const { t, tr } = useTranslations();
  const candidateCount = candidates.length;
  const warningsLabelByCode: Record<string, string> = {
    operationDateDerived: tr('importers.transaction.preview.warning.operationDateDerived', 'Data derivada de columna alternativa'),
    debitCreditFallback: tr('importers.transaction.preview.warning.debitCreditFallback', 'Import calculat amb Debe/Haber'),
    balanceMismatch: tr('importers.transaction.preview.warning.balanceMismatch', 'Possible incoherència de saldo'),
  };
  const movementCounts = React.useMemo(() => {
    const detectedRows = parseSummary?.dataRowsCount ?? 0;
    const preparedRows = parseSummary?.parsedRowsCount ?? 0;
    return {
      toImport: preparedRows,
      discarded: Math.max(detectedRows - preparedRows, 0),
    };
  }, [parseSummary]);
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
    const dateOnlyMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      return `${dateOnlyMatch[3]}/${dateOnlyMatch[2]}/${dateOnlyMatch[1]}`;
    }
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

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{tr('importers.transaction.preview.movementsToImport', 'Moviments a importar')}</p>
            <p className="text-xl font-semibold">{movementCounts.toImport}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">{tr('importers.transaction.preview.movementsDiscarded', 'Moviments descartats')}</p>
            <p className="text-xl font-semibold">{movementCounts.discarded}</p>
            {movementCounts.discarded > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {tr('importers.transaction.preview.discardedReason', 'Capçalera/totals/valors buits')}
              </p>
            )}
          </div>
        </div>

        {parseSummary && (
          <div className={`grid grid-cols-1 gap-2 ${hasMappedBalance ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">{tr('importers.transaction.preview.dateRange', 'Rang de dates de l’extracte importat')}</p>
              {parseSummary.dateRange ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between gap-3 text-muted-foreground">
                    <span className="text-xs uppercase tracking-wide">
                      {tr('importers.transaction.preview.fromDate', 'Des de')}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatDate(parseSummary.dateRange.from)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-muted-foreground">
                    <span className="text-xs uppercase tracking-wide">
                      {tr('importers.transaction.preview.toDate', 'Fins a')}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatDate(parseSummary.dateRange.to)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">—</p>
              )}
            </div>
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">{tr('importers.transaction.preview.totals', 'Totals de l’extracte importat')}</p>
              <div className="mt-2 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {tr('importers.transaction.preview.income', 'Ingressos')}
                  </span>
                  <span className="font-medium tabular-nums text-emerald-700 dark:text-emerald-300">
                    {formatAmount(parseSummary.totals.income)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">
                    {tr('importers.transaction.preview.expense', 'Despeses')}
                  </span>
                  <span className="font-medium tabular-nums text-rose-700 dark:text-rose-300">
                    {formatAmount(-Math.abs(parseSummary.totals.expense))}
                  </span>
                </div>
              </div>
            </div>
            {hasMappedBalance && parseSummary.balances && (
              <div className="rounded-md border p-3 text-sm">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {tr('importers.transaction.preview.balanceFirstInExtract', 'Saldo del primer moviment de l’extracte importat')}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-4 w-4 items-center justify-center rounded text-muted-foreground hover:text-foreground"
                        aria-label={tr('importers.transaction.preview.balanceTooltipAria', 'Informació sobre saldos de l’extracte importat')}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      {tr(
                        'importers.transaction.preview.balanceExtractTooltip',
                        'Aquests valors corresponen al saldo que apareix al primer i a l’últim moviment inclòs a l’extracte que has importat. No necessàriament coincideixen amb el saldo actual del compte.'
                      )}
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-muted-foreground">{formatAmount(parseSummary.balances.initial)}</p>
                <p className="mt-3 font-medium">
                  {tr('importers.transaction.preview.balanceLastInExtract', 'Saldo de l’últim moviment de l’extracte importat')}
                </p>
                <p className="text-muted-foreground">{formatAmount(parseSummary.balances.final)}</p>
              </div>
            )}
          </div>
        )}

        {hasMappedBalance && (parseSummary?.warnings.balanceMismatchCount ?? 0) > 0 && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
            {tr(
              'importers.transaction.preview.balanceMismatchSummary',
              'Hi ha {count} moviments amb saldo no coherent. Revisa’ls a la taula.'
            ).replace('{count}', String(parseSummary?.warnings.balanceMismatchCount ?? 0))}
          </div>
        )}

        {sampleRows.length > 0 && (
          <TooltipProvider>
            <ScrollArea className="max-h-[260px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">{tr('importers.transaction.preview.date', 'Data')}</TableHead>
                    <TableHead>{tr('importers.transaction.preview.description', 'Descripció')}</TableHead>
                    <TableHead className="w-[120px] text-right">{tr('importers.transaction.preview.amount', 'Import')}</TableHead>
                    {hasMappedBalance && (
                      <TableHead className="w-[120px] text-right">{tr('importers.transaction.preview.balanceColumn', 'Saldo')}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sampleRows.map((row) => {
                    const warningText = row.warnings.map((warning) => warningsLabelByCode[warning] ?? warning).join(' · ');

                    return (
                      <TableRow key={`preview-${row.rowIndex}`} className={row.warnings.length > 0 ? 'bg-amber-50/40 dark:bg-amber-950/20' : undefined}>
                        <TableCell className="text-xs">{formatDate(row.operationDate)}</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-2">
                            <span>{row.description}</span>
                            {row.warnings.length > 0 && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="inline-flex h-4 w-4 items-center justify-center rounded text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200"
                                    aria-label={tr('importers.transaction.preview.sampleWarnings', 'Veure incidències de la fila')}
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {warningText}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">{formatAmount(row.amount)}</TableCell>
                        {hasMappedBalance && (
                          <TableCell className="text-right text-xs">{formatAmount(row.balanceAfter)}</TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </TooltipProvider>
        )}

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

        {candidateCount > 0 && (
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
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t.importers?.transaction?.cancel ?? 'Cancel·lar'}
          </Button>
          <Button onClick={onContinue}>
            {tr('importers.transaction.confirmImport', 'Confirmar importació')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
