'use client';

import * as React from 'react';
import { TransactionImporter } from '@/components/transaction-importer';
import { TransactionsTable } from '@/components/transactions-table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction } from '@/lib/data';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

export default function MovimientosPage() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();

  const transactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">{t.movements.title}</h1>
          <p className="text-muted-foreground">{t.movements.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TransactionImporter existingTransactions={transactions || []} />
        </div>
      </div>

      {isLoading ? (
        <p>{t.common.loading}</p>
      ) : (
        <TransactionsTable />
      )}
    </div>
  );
}
