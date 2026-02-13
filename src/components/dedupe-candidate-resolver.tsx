'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Info } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { ClassifiedRow } from '@/lib/transaction-dedupe';

interface DedupeCandidateResolverProps {
  candidates: ClassifiedRow[];
  safeDuplicatesCount: number;
  onResolved: (resolved: ClassifiedRow[]) => void;
  onCancel: () => void;
  open: boolean;
}

export function DedupeCandidateResolver({
  candidates,
  safeDuplicatesCount,
  onResolved,
  onCancel,
  open,
}: DedupeCandidateResolverProps) {
  const { t } = useTranslations();
  const [decisions, setDecisions] = React.useState<Map<number, 'import' | 'skip'>>(new Map());

  // Reset decisions quan canvien els candidats
  React.useEffect(() => {
    setDecisions(new Map());
  }, [candidates]);

  const resolvedCount = decisions.size;
  const totalCandidates = candidates.length;
  const allResolved = resolvedCount === totalCandidates;

  const toImportCount = Array.from(decisions.values()).filter(d => d === 'import').length;
  const toSkipCount = Array.from(decisions.values()).filter(d => d === 'skip').length;

  const handleDecision = (index: number, decision: 'import' | 'skip') => {
    setDecisions(prev => {
      const next = new Map(prev);
      next.set(index, decision);
      return next;
    });
  };

  const handleBulkImport = () => {
    const next = new Map<number, 'import' | 'skip'>();
    candidates.forEach((_, i) => next.set(i, 'import'));
    setDecisions(next);
  };

  const handleBulkSkip = () => {
    const next = new Map<number, 'import' | 'skip'>();
    candidates.forEach((_, i) => next.set(i, 'skip'));
    setDecisions(next);
  };

  const handleClear = () => {
    setDecisions(new Map());
  };

  const handleContinue = () => {
    const resolved = candidates.map((c, i) => ({
      ...c,
      userDecision: decisions.get(i) ?? null,
    }));
    onResolved(resolved);
  };

  const formatDate = (dateStr: string) => {
    try {
      // Afegir hora per evitar desplaçament timezone en dates YYYY-MM-DD
      const d = dateStr.includes('T') ? new Date(dateStr) : new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('ca-ES');
    } catch {
      return dateStr;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  const truncate = (str: string, max: number) => {
    if (str.length <= max) return str;
    return str.slice(0, max) + '…';
  };

  // Columnes opcionals: només mostrar si algun candidat les té
  const hasOpDate = candidates.some(c => c.rawRow._opDate);
  const hasBalance = candidates.some(c => typeof c.rawRow._balance === 'number');

  if (totalCandidates === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel(); }}>
      <DialogContent className={hasOpDate || hasBalance ? 'max-w-5xl' : 'max-w-4xl'}>
        <DialogHeader>
          <DialogTitle>
            {t.importers?.transaction?.dedupe?.candidateDialogTitle ?? 'Possibles duplicats trobats'}
          </DialogTitle>
          <DialogDescription>
            {t.importers?.transaction?.dedupe?.candidateDialogDescription?.(totalCandidates)
              ?? `S'han trobat ${totalCandidates} moviments que coincideixen amb transaccions existents. Revisa cada un i decideix si s'ha d'importar o ometre.`}
          </DialogDescription>
        </DialogHeader>

        {safeDuplicatesCount > 0 && (
          <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
            <Info className="h-4 w-4 flex-shrink-0" />
            <span>
              {t.importers?.transaction?.dedupe?.safeDupesSkipped?.(safeDuplicatesCount)
                ?? `${safeDuplicatesCount} duplicats segurs omesos automàticament.`}
            </span>
          </div>
        )}

        <ScrollArea className="max-h-[400px] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[90px]">
                  {t.importers?.transaction?.dedupe?.columnDate ?? 'Data'}
                </TableHead>
                {hasOpDate && (
                  <TableHead className="w-[80px]">
                    {t.importers?.transaction?.dedupe?.executionDate ?? 'F. exec.'}
                  </TableHead>
                )}
                <TableHead className="w-[90px] text-right">
                  {t.importers?.transaction?.dedupe?.columnAmount ?? 'Import'}
                </TableHead>
                {hasBalance && (
                  <TableHead className="w-[100px] text-right">
                    {t.importers?.transaction?.dedupe?.balance ?? 'Saldo'}
                  </TableHead>
                )}
                <TableHead>
                  {t.importers?.transaction?.dedupe?.columnDescription ?? 'Descripció'}
                </TableHead>
                <TableHead>
                  {t.importers?.transaction?.dedupe?.columnExisting ?? 'Ja existent'}
                </TableHead>
                <TableHead className="w-[160px]">
                  {t.importers?.transaction?.dedupe?.columnDecision ?? 'Decisió'}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate, index) => {
                const decision = decisions.get(index);
                const firstMatch = candidate.matchedExisting[0];
                const extraCount = candidate.matchedExisting.length - 1;

                return (
                  <TableRow
                    key={index}
                    className={
                      decision === 'import'
                        ? 'bg-green-50 dark:bg-green-950/30'
                        : decision === 'skip'
                          ? 'bg-red-50 dark:bg-red-950/30'
                          : ''
                    }
                  >
                    <TableCell className="text-xs">
                      {formatDate(candidate.tx.date)}
                    </TableCell>
                    {hasOpDate && (
                      <TableCell className="text-xs">
                        {candidate.rawRow._opDate ? formatDate(candidate.rawRow._opDate) : ''}
                      </TableCell>
                    )}
                    <TableCell className="text-right text-xs font-mono">
                      {formatAmount(candidate.tx.amount)}
                    </TableCell>
                    {hasBalance && (
                      <TableCell className="text-right text-xs font-mono">
                        {typeof candidate.rawRow._balance === 'number'
                          ? formatAmount(candidate.rawRow._balance)
                          : ''}
                      </TableCell>
                    )}
                    <TableCell className="text-xs" title={candidate.tx.description}>
                      {truncate(candidate.tx.description, 50)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {firstMatch && (
                        <span title={firstMatch.description}>
                          {formatDate(firstMatch.date)} · {truncate(firstMatch.description, 30)}
                          {extraCount > 0 && (
                            <Badge variant="secondary" className="ml-1 text-[10px]">
                              +{extraCount}
                            </Badge>
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <RadioGroup
                        value={decision ?? ''}
                        onValueChange={(val) => handleDecision(index, val as 'import' | 'skip')}
                        className="flex gap-3"
                      >
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="import" id={`import-${index}`} />
                          <Label htmlFor={`import-${index}`} className="text-xs cursor-pointer">
                            {t.importers?.transaction?.dedupe?.importAction ?? 'Importar'}
                          </Label>
                        </div>
                        <div className="flex items-center space-x-1">
                          <RadioGroupItem value="skip" id={`skip-${index}`} />
                          <Label htmlFor={`skip-${index}`} className="text-xs cursor-pointer">
                            {t.importers?.transaction?.dedupe?.skipAction ?? 'Ometre'}
                          </Label>
                        </div>
                      </RadioGroup>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Bulk actions + comptador */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleBulkImport}>
              {t.importers?.transaction?.dedupe?.importAll ?? 'Importar tots'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleBulkSkip}>
              {t.importers?.transaction?.dedupe?.skipAll ?? 'Ometre tots'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              {t.importers?.transaction?.dedupe?.clearAll ?? 'Netejar'}
            </Button>
          </div>
          <span className="text-sm text-muted-foreground">
            {t.importers?.transaction?.dedupe?.resolvedCount?.(resolvedCount, totalCandidates)
              ?? `${resolvedCount} de ${totalCandidates} resolts`}
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            {t.importers?.transaction?.dedupe?.cancelImport ?? 'Cancel·lar importació'}
          </Button>
          <Button onClick={handleContinue} disabled={!allResolved}>
            {allResolved
              ? (t.importers?.transaction?.dedupe?.continueButton?.(toImportCount, toSkipCount)
                  ?? `Continuar (${toImportCount} per importar, ${toSkipCount} per ometre)`)
              : (t.importers?.transaction?.dedupe?.resolvedCount?.(resolvedCount, totalCandidates)
                  ?? `${resolvedCount} de ${totalCandidates} resolts`)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
