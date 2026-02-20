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
  safeDuplicatesCount: number;
  onContinue: () => void;
  onCancel: () => void;
  open: boolean;
}

export function DedupeCandidateResolver({
  candidates,
  safeDuplicatesCount,
  onContinue,
  onCancel,
  open,
}: DedupeCandidateResolverProps) {
  const { t } = useTranslations();

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

  if (!open || candidates.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(value) => {
      if (!value) {
        onCancel();
      }
    }}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {'Possibles duplicats detectats'}
          </DialogTitle>
          <DialogDescription>
            {`S'han detectat ${candidates.length} possibles duplicats. Es deixaran importar amb avis d'incidència.`}
          </DialogDescription>
        </DialogHeader>

        {safeDuplicatesCount > 0 && (
          <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <p className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {`${safeDuplicatesCount} duplicats marcats com segurs (DUPLICATE_SAFE) — es deixen importar.`}
            </p>
          </div>
        )}

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
