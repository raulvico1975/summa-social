'use client';

import * as React from 'react';
import { StatCard } from '@/components/stat-card';
import { ExpensesChart } from '@/components/expenses-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Rocket } from 'lucide-react';
import type { Transaction } from '@/lib/data';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useTranslations } from '@/i18n';

const MISSION_TRANSFER_CATEGORY = 'Transferencias a terreno o socias';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export default function DashboardPage() {
  const { firestore, user } = useFirebase();
  const { t } = useTranslations();
  
  const transactionsQuery = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'transactions') : null,
    [firestore, user]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const { totalIncome, totalExpenses, totalMissionTransfers } = React.useMemo(() => {
    if (!transactions) return { totalIncome: 0, totalExpenses: 0, totalMissionTransfers: 0 };
    return transactions.reduce((acc, tx) => {
      if (tx.amount > 0) {
        acc.totalIncome += tx.amount;
      } else {
        if (tx.category === MISSION_TRANSFER_CATEGORY) {
            acc.totalMissionTransfers += tx.amount;
        } else {
            acc.totalExpenses += tx.amount;
        }
      }
      return acc;
    }, { totalIncome: 0, totalExpenses: 0, totalMissionTransfers: 0 });
  }, [transactions]);
  
  const expenseTransactions = React.useMemo(() => 
    transactions?.filter(tx => tx.amount < 0 && tx.category !== MISSION_TRANSFER_CATEGORY) || [],
  [transactions]);
  
  const netBalance = totalIncome + totalExpenses;

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.description}</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title={t.dashboard.totalIncome}
          value={formatCurrency(totalIncome)}
          icon={TrendingUp}
          description={t.dashboard.totalIncomeDescription}
        />
        <StatCard 
          title={t.dashboard.operatingExpenses}
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          description={t.dashboard.operatingExpensesDescription}
        />
         <StatCard 
          title={t.dashboard.operatingBalance}
          value={formatCurrency(netBalance)}
          icon={DollarSign}
          description={t.dashboard.operatingBalanceDescription}
        />
        <StatCard 
          title={t.dashboard.missionTransfers}
          value={formatCurrency(totalMissionTransfers)}
          icon={Rocket}
          description={t.dashboard.missionTransfersDescription}
        />
      </div>

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
