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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Transaction } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { Loader2 } from 'lucide-react';

interface SplitDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentTransaction: Transaction | null;
  splitParts: Transaction[];
  onUndoSplit: (parentTxId: string) => void;
  isUndoing?: boolean;
}

type SplitChildWithLegacyNote = Transaction & {
  notes?: string | null;
  contactName?: string | null;
};

export function SplitDetailDialog({
  open,
  onOpenChange,
  parentTransaction,
  splitParts,
  onUndoSplit,
  isUndoing = false,
}: SplitDetailDialogProps) {
  const totalParts = React.useMemo(
    () => splitParts.reduce((sum, item) => sum + item.amount, 0),
    [splitParts]
  );

  if (!parentTransaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Detall del desglossament</DialogTitle>
          <DialogDescription>
            El moviment bancari pare no es modifica. Pots revisar les parts i desfer el desglossament.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto pr-1">
          <div className="rounded-md border p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Import original</span>
              <span className="font-medium">{formatCurrencyEU(parentTransaction.amount)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Total parts</span>
              <span className="font-medium">{formatCurrencyEU(totalParts)}</span>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px] text-right">Import</TableHead>
                  <TableHead className="w-[120px]">Tipus</TableHead>
                  <TableHead>Contacte</TableHead>
                  <TableHead>Nota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {splitParts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No hi ha línies actives.
                    </TableCell>
                  </TableRow>
                ) : (
                  splitParts.map((item) => {
                    const itemWithLegacy = item as SplitChildWithLegacyNote;
                    const itemNote = item.note ?? itemWithLegacy.notes ?? '';
                    const contactLabel = itemWithLegacy.contactName || '—';
                    const isDonationLine = item.transactionType === 'donation';

                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-right font-mono">{formatCurrencyEU(item.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={isDonationLine ? 'default' : 'secondary'}>
                            {isDonationLine ? 'Donació' : 'Altres'}
                          </Badge>
                        </TableCell>
                        <TableCell>{contactLabel}</TableCell>
                        <TableCell className="max-w-[280px] truncate" title={itemNote || ''}>
                          {itemNote || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="text-orange-600 border-orange-300 hover:bg-orange-50"
            disabled={isUndoing}
            onClick={() => onUndoSplit(parentTransaction.id)}
          >
            {isUndoing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Desfer desglossament
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
