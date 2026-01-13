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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, Calendar, Hash, Building2, AlertTriangle } from 'lucide-react';
import { useTranslations } from '@/i18n';
import type { SepaCollectionItem, SepaSequenceType } from '@/lib/data';

interface StepReviewProps {
  collectionItems: SepaCollectionItem[];
  sequenceBreakdown: Record<SepaSequenceType, { count: number; totalCents: number }>;
  totalAmountCents: number;
  collectionDate: string;
  creditorId: string;
  creditorName: string;
  creditorIban: string;
}

export function StepReview({
  collectionItems,
  sequenceBreakdown,
  totalAmountCents,
  collectionDate,
  creditorId,
  creditorName,
  creditorIban,
}: StepReviewProps) {
  const { t } = useTranslations();

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ca-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatIban = (iban: string) => {
    // Format IBAN with spaces every 4 chars
    return iban.replace(/(.{4})/g, '$1 ').trim();
  };

  // Filter out zero-count sequences
  const activeSequences = (Object.entries(sequenceBreakdown) as [SepaSequenceType, { count: number; totalCents: number }][])
    .filter(([_, data]) => data.count > 0);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">{t.sepaCollection.review.title}</h3>

      {/* Summary card */}
      <div className="rounded-lg border bg-muted/50 p-6 space-y-4">
        <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
          {t.sepaCollection.review.summary}
        </h4>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.sepaCollection.review.totalAmount}</p>
            <p className="text-2xl font-bold">{formatCurrency(totalAmountCents)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.sepaCollection.review.totalItems}</p>
            <p className="text-2xl font-bold">{collectionItems.length}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.sepaCollection.review.collectionDate}</p>
            <p className="text-lg font-medium">{formatDate(collectionDate)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t.sepaCollection.review.creditorId}</p>
            <p className="text-sm font-mono">{creditorId}</p>
          </div>
        </div>

        {/* Creditor info */}
        <div className="border-t pt-4 mt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Creditor:</span>
            <span className="font-medium">{creditorName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">IBAN:</span>
            <span className="font-mono">{formatIban(creditorIban)}</span>
          </div>
        </div>
      </div>

      {/* Sequence breakdown */}
      {activeSequences.length > 1 && (
        <div className="rounded-lg border p-4">
          <h4 className="font-medium text-sm mb-3">{t.sepaCollection.review.sequenceBreakdown}</h4>
          <div className="flex flex-wrap gap-3">
            {activeSequences.map(([seqType, data]) => (
              <div key={seqType} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
                <Badge variant={seqType === 'FRST' ? 'default' : 'secondary'}>
                  {seqType}
                </Badge>
                <span className="text-sm">
                  {data.count} · {formatCurrency(data.totalCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t.sepaCollection.review.warning}
        </AlertDescription>
      </Alert>

      {/* Items table (collapsed by default for large lists) */}
      <details className="rounded-lg border">
        <summary className="px-4 py-3 cursor-pointer hover:bg-muted/50 font-medium">
          Detall de cobraments ({collectionItems.length})
        </summary>
        <div className="border-t">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t.sepaCollection.review.itemsTable.name}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.taxId}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.amount}</TableHead>
                <TableHead>{t.sepaCollection.review.itemsTable.sequence}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collectionItems.map((item, index) => (
                <TableRow key={item.donorId || index}>
                  <TableCell className="font-medium">{item.donorName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{item.donorTaxId}</TableCell>
                  <TableCell>{formatCurrency(item.amountCents)}</TableCell>
                  <TableCell>
                    <Badge variant={item.sequenceType === 'FRST' ? 'default' : 'secondary'}>
                      {item.sequenceType}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  );
}
