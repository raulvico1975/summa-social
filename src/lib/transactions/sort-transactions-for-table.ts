import type { Transaction } from '@/lib/data';

type SortTransactionsForTableOptions = {
  sortDateAsc: boolean;
  getDisplayDate: (tx: Transaction) => string;
};

type GroupSign = 'income' | 'expense' | 'mixed';

type GroupMeta = {
  allHaveBalance: boolean;
  allSameSign: boolean;
  sign: GroupSign;
};

type DecoratedTransaction = {
  tx: Transaction;
  originalIndex: number;
};

function getGroupKey(tx: Transaction): string | null {
  if (!tx.bankAccountId || !tx.operationDate) return null;
  return `${tx.bankAccountId}::${tx.operationDate}`;
}

function buildGroupMeta(items: DecoratedTransaction[]): Map<string, GroupMeta> {
  const grouped = new Map<string, DecoratedTransaction[]>();
  for (const item of items) {
    const key = getGroupKey(item.tx);
    if (!key) continue;

    const group = grouped.get(key);
    if (group) {
      group.push(item);
    } else {
      grouped.set(key, [item]);
    }
  }

  const meta = new Map<string, GroupMeta>();
  for (const [key, group] of grouped.entries()) {
    const allHaveBalance = group.every(
      (item) => typeof item.tx.balanceAfter === 'number' && Number.isFinite(item.tx.balanceAfter)
    );
    const allPositive = group.every((item) => item.tx.amount > 0);
    const allNegative = group.every((item) => item.tx.amount < 0);
    const allSameSign = allPositive || allNegative;
    const sign: GroupSign = allPositive ? 'income' : allNegative ? 'expense' : 'mixed';

    meta.set(key, { allHaveBalance, allSameSign, sign });
  }

  return meta;
}

export function sortTransactionsForTable(
  transactions: Transaction[],
  options: SortTransactionsForTableOptions
): Transaction[] {
  const { sortDateAsc, getDisplayDate } = options;
  const decorated: DecoratedTransaction[] = transactions.map((tx, originalIndex) => ({
    tx,
    originalIndex,
  }));
  const groupMeta = buildGroupMeta(decorated);

  decorated.sort((a, b) => {
    const dateA = new Date(getDisplayDate(a.tx)).getTime();
    const dateB = new Date(getDisplayDate(b.tx)).getTime();
    const dateDiff = sortDateAsc ? dateA - dateB : dateB - dateA;

    if (Number.isFinite(dateDiff) && dateDiff !== 0) {
      return dateDiff;
    }

    if (
      a.tx.bankAccountId &&
      a.tx.bankAccountId === b.tx.bankAccountId &&
      a.tx.operationDate &&
      a.tx.operationDate === b.tx.operationDate
    ) {
      const key = `${a.tx.bankAccountId}::${a.tx.operationDate}`;
      const meta = groupMeta.get(key);

      if (meta?.allHaveBalance && meta.allSameSign) {
        const balanceA = a.tx.balanceAfter as number;
        const balanceB = b.tx.balanceAfter as number;
        const balanceDiff = meta.sign === 'income' ? balanceA - balanceB : balanceB - balanceA;

        if (balanceDiff !== 0) {
          return balanceDiff;
        }
      }
    }

    return a.originalIndex - b.originalIndex;
  });

  return decorated.map((item) => item.tx);
}
