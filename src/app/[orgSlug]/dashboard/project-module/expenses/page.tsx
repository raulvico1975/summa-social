// src/app/[orgSlug]/dashboard/project-module/expenses/page.tsx
// Inbox de despeses assignables a projectes

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useExpenseFeed } from '@/hooks/use-project-module';
import { useOrgUrl } from '@/hooks/organization-provider';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw, ChevronRight } from 'lucide-react';
import type { ExpenseStatus } from '@/lib/project-module-types';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}.${month}.${year}`;
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function StatusBadge({ status, assignedAmount, totalAmount }: { status: ExpenseStatus; assignedAmount: number; totalAmount: number }) {
  const percentage = totalAmount > 0 ? Math.round((assignedAmount / totalAmount) * 100) : 0;

  switch (status) {
    case 'assigned':
      return <Badge variant="default" className="bg-green-600">100%</Badge>;
    case 'partial':
      return <Badge variant="secondary" className="bg-yellow-500 text-black">{percentage}%</Badge>;
    case 'unassigned':
    default:
      return <Badge variant="outline">0%</Badge>;
  }
}

export default function ExpensesInboxPage() {
  const { expenses, isLoading, error, hasMore, loadMore, refresh } = useExpenseFeed();
  const { buildUrl } = useOrgUrl();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Error carregant despeses</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button onClick={handleRefresh} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Despeses per assignar</h1>
          <p className="text-muted-foreground">
            Despeses elegibles per vincular a projectes
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Actualitzar
        </Button>
      </div>

      {/* Taula */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead>Descripció</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Origen / Destinatari</TableHead>
              <TableHead className="text-right">Import</TableHead>
              <TableHead className="w-[120px]">Estat</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && expenses.length === 0 ? (
              // Skeleton loading
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                </TableRow>
              ))
            ) : expenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  No hi ha despeses elegibles per assignar
                </TableCell>
              </TableRow>
            ) : (
              expenses.map(({ expense, status, assignedAmount }) => (
                <TableRow key={expense.id} className="group hover:bg-muted/50">
                  <TableCell className="font-mono text-sm">
                    {formatDate(expense.date)}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {expense.description || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.categoryName || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {expense.counterpartyName || '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium text-red-600">
                    {formatAmount(expense.amountEUR)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} assignedAmount={assignedAmount} totalAmount={Math.abs(expense.amountEUR)} />
                  </TableCell>
                  <TableCell>
                    <Link href={buildUrl(`/dashboard/project-module/expenses/${expense.id}`)}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Carrega més */}
      {hasMore && !isLoading && (
        <div className="flex justify-center">
          <Button onClick={loadMore} variant="outline">
            Carrega més
          </Button>
        </div>
      )}

      {isLoading && expenses.length > 0 && (
        <div className="flex justify-center py-4">
          <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
