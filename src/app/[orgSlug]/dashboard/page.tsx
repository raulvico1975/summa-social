'use client';
import * as React from 'react';
import { StatCard } from '@/components/stat-card';
import { ExpensesChart } from '@/components/expenses-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { DollarSign, TrendingUp, TrendingDown, Rocket, Heart, AlertTriangle } from 'lucide-react';
import type { Transaction, Contact } from '@/lib/data';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { formatCurrencyEU } from '@/lib/normalize';
import { DateFilter, type DateFilterValue } from '@/components/date-filter';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const { buildUrl } = useOrgUrl();

  const transactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ type: 'all' });
  const filteredTransactions = useTransactionFilters(transactions || undefined, dateFilter);

  const MISSION_TRANSFER_CATEGORY_KEY = 'missionTransfers';

  const { totalIncome, totalExpenses, totalMissionTransfers } = React.useMemo(() => {
    if (!filteredTransactions) return { totalIncome: 0, totalExpenses: 0, totalMissionTransfers: 0 };
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.amount > 0) {
        acc.totalIncome += tx.amount;
      } else {
        if (tx.category === MISSION_TRANSFER_CATEGORY_KEY) {
            acc.totalMissionTransfers += tx.amount;
        } else {
            acc.totalExpenses += tx.amount;
        }
      }
      return acc;
    }, { totalIncome: 0, totalExpenses: 0, totalMissionTransfers: 0 });
  }, [filteredTransactions]);

  const expenseTransactions = React.useMemo(() =>
    filteredTransactions?.filter(tx => tx.amount < 0 && tx.category !== MISSION_TRANSFER_CATEGORY_KEY) || [],
  [filteredTransactions]);

  const { totalDonations, uniqueDonors, memberFees } = React.useMemo(() => {
    if (!filteredTransactions) return { totalDonations: 0, uniqueDonors: 0, memberFees: 0 };

    const donorIds = new Set<string>();
    let donations = 0;
    let fees = 0;

    filteredTransactions.forEach(tx => {
      // Només ingressos (amount > 0)
      if (tx.amount > 0) {
        // Donacions: contactType === 'donor'
        if (tx.contactType === 'donor') {
          donations += tx.amount;
          if (tx.contactId) {
            donorIds.add(tx.contactId);
          }
        }

        // Quotes socis: categoria conté "quota" o "soci"
        if (tx.category?.toLowerCase().includes('quota') ||
            tx.category?.toLowerCase().includes('soci')) {
          fees += tx.amount;
        }
      }
    });

    return {
      totalDonations: donations,
      uniqueDonors: donorIds.size,
      memberFees: fees
    };
  }, [filteredTransactions]);

  const netBalance = totalIncome + totalExpenses;

  // Càlcul d'alertes
  const alerts = React.useMemo(() => {
    const result = [];

    // 🔴 Moviments sense categoritzar
    const uncategorizedCount = filteredTransactions?.filter(tx =>
      tx.category === null || tx.category === 'Revisar'
    ).length || 0;

    if (uncategorizedCount > 0) {
      result.push({
        type: 'uncategorized' as const,
        count: uncategorizedCount,
        label: t.dashboard.uncategorizedMovements,
        variant: 'destructive' as const,
        href: buildUrl('/dashboard/movimientos'),
      });
    }

    // 🟠 Donants amb dades incompletes
    const incompleteDonorsCount = contacts?.filter(contact =>
      contact.type === 'donor' && (!contact.taxId || !contact.zipCode)
    ).length || 0;

    if (incompleteDonorsCount > 0) {
      result.push({
        type: 'incomplete_donors' as const,
        count: incompleteDonorsCount,
        label: t.dashboard.incompleteDonors,
        variant: 'default' as const,
        href: buildUrl('/dashboard/donants'),
      });
    }

    // 🟡 Moviments sense contacte assignat (amount > 50€)
    const noContactCount = filteredTransactions?.filter(tx =>
      !tx.contactId && Math.abs(tx.amount) > 50
    ).length || 0;

    if (noContactCount > 0) {
      result.push({
        type: 'no_contact' as const,
        count: noContactCount,
        label: t.dashboard.movementsWithoutContact,
        variant: 'secondary' as const,
        href: buildUrl('/dashboard/movimientos'),
      });
    }

    return result;
  }, [filteredTransactions, contacts, t, buildUrl]);

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.description}</p>
      </div>

      <DateFilter value={dateFilter} onChange={setDateFilter} />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dashboard.totalIncome}
          value={formatCurrencyEU(totalIncome)}
          icon={TrendingUp}
          description={t.dashboard.totalIncomeDescription}
        />
        <StatCard
          title={t.dashboard.operatingExpenses}
          value={formatCurrencyEU(totalExpenses)}
          icon={TrendingDown}
          description={t.dashboard.operatingExpensesDescription}
        />
         <StatCard
          title={t.dashboard.operatingBalance}
          value={formatCurrencyEU(netBalance)}
          icon={DollarSign}
          description={t.dashboard.operatingBalanceDescription}
        />
        <StatCard
          title={t.dashboard.missionTransfers}
          value={formatCurrencyEU(totalMissionTransfers)}
          icon={Rocket}
          description={t.dashboard.missionTransfersDescription}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {t.dashboard.donationsAndMembers}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">{t.dashboard.donations}</p>
              <p className="text-2xl font-bold">{formatCurrencyEU(totalDonations)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.dashboard.activeDonors}</p>
              <p className="text-2xl font-bold">{uniqueDonors}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.dashboard.memberFees}</p>
              <p className="text-2xl font-bold">{formatCurrencyEU(memberFees)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t.dashboard.alerts}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <span className="text-2xl">✅</span>
              <span className="font-semibold">{t.dashboard.allClear}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((alert) => (
                <Link
                  key={alert.type}
                  href={alert.href}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                >
                  <span className="text-sm">{alert.label}</span>
                  <Badge variant={alert.variant}>{alert.count}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.expensesByCategory}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesChart transactions={expenseTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}
