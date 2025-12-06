'use client';

import * as React from 'react';
import type { Transaction } from '@/lib/data';
import type { DateFilterValue } from '@/components/date-filter';

export function useTransactionFilters(
  transactions: Transaction[] | undefined,
  filter: DateFilterValue
) {
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];
    if (filter.type === 'all') return transactions;

    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);

      if (filter.type === 'year' && filter.year) {
        return txDate.getFullYear() === filter.year;
      }

      if (filter.type === 'quarter' && filter.year && filter.quarter) {
        const txYear = txDate.getFullYear();
        const txMonth = txDate.getMonth() + 1; // 1-12
        const quarterMonth = (filter.quarter - 1) * 3 + 1;
        const quarterEndMonth = filter.quarter * 3;

        return (
          txYear === filter.year &&
          txMonth >= quarterMonth &&
          txMonth <= quarterEndMonth
        );
      }

      if (filter.type === 'month' && filter.year && filter.month) {
        return (
          txDate.getFullYear() === filter.year &&
          txDate.getMonth() + 1 === filter.month
        );
      }

      if (filter.type === 'custom' && filter.customRange) {
        const { from, to } = filter.customRange;
        if (!from && !to) return true;
        if (from && !to) return txDate >= from;
        if (!from && to) return txDate <= to;
        if (from && to) return txDate >= from && txDate <= to;
      }

      return true;
    });
  }, [transactions, filter]);

  return filteredTransactions;
}
