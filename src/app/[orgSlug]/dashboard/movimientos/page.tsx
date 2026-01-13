'use client';

import * as React from 'react';
import { TransactionImporter } from '@/components/transaction-importer';
import { TransactionsTable } from '@/components/transactions-table';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Transaction } from '@/lib/data';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useSearchParams } from 'next/navigation';
import { fromPeriodQuery } from '@/lib/period-query';
import { Button } from '@/components/ui/button';
import { FileStack, Receipt } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function MovimientosPage() {
  const { firestore } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { t } = useTranslations();
  const searchParams = useSearchParams();
  const initialPeriodFilter = React.useMemo(() => fromPeriodQuery(searchParams), [searchParams]);

  // Feature flag: Documents pendents
  const isPendingDocsEnabled = organization?.features?.pendingDocs ?? false;

  const transactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const { data: transactions, isLoading } = useCollection<Transaction>(transactionsQuery);

  return (
    <div className="w-full flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">{t.movements.title}</h1>
          <p className="text-muted-foreground">{t.movements.description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <TransactionImporter existingTransactions={transactions || []} />
          {isPendingDocsEnabled && (
            <>
              <Button variant="outline" asChild>
                <Link href="movimientos/pendents">
                  <FileStack className="mr-2 h-4 w-4" />
                  {t.movements.buttons.pendingDocs}
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="movimientos/liquidacions">
                  <Receipt className="mr-2 h-4 w-4" />
                  {t.movements.buttons.settlements}
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <p>{t.common.loading}</p>
      ) : (
        <div className="w-full">
          <TransactionsTable initialDateFilter={initialPeriodFilter ?? undefined} />
        </div>
      )}
    </div>
  );
}
