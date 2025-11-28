
'use client';

import * as React from 'react';
import { StatCard } from '@/components/stat-card';
import { ExpensesChart } from '@/components/expenses-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Rocket } from 'lucide-react';
import type { Transaction } from '@/lib/data';
import { transactions as initialTransactions } from '@/lib/data';

const TRANSACTIONS_STORAGE_KEY = 'summa-social-transactions';
const MISSION_TRANSFER_CATEGORY = 'Transferencias a terreno o socias';


const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

export default function DashboardPage() {
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);

  React.useEffect(() => {
    try {
      const storedTransactions = localStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      setTransactions(storedTransactions ? JSON.parse(storedTransactions) : initialTransactions);
    } catch (error) {
       console.error("Failed to parse data from localStorage", error);
       setTransactions(initialTransactions);
    }

    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === TRANSACTIONS_STORAGE_KEY) {
            try {
                setTransactions(event.newValue ? JSON.parse(event.newValue) : initialTransactions);
            } catch (error) {
                console.error("Failed to parse data from localStorage on change", error);
                setTransactions(initialTransactions);
            }
        }
    };
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };

  }, []);

  const { totalIncome, totalExpenses, operationalBalance, totalMissionTransfers } = React.useMemo(() => {
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
    }, { totalIncome: 0, totalExpenses: 0, totalMissionTransfers: 0, operationalBalance: 0 });
  }, [transactions]);
  
  const expenseTransactions = React.useMemo(() => 
    transactions.filter(tx => tx.amount < 0 && tx.category !== MISSION_TRANSFER_CATEGORY), 
  [transactions]);
  
  const netBalance = totalIncome + totalExpenses;

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Panel de Control</h1>
        <p className="text-muted-foreground">Analiza tus datos financieros con resúmenes y gráficos.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Ingresos Totales"
          value={formatCurrency(totalIncome)}
          icon={TrendingUp}
          description="Suma de todos los ingresos"
        />
        <StatCard 
          title="Gastos Operativos"
          value={formatCurrency(totalExpenses)}
          icon={TrendingDown}
          description="Suma de gastos sin incluir transferencias de misión"
        />
         <StatCard 
          title="Balance Operativo"
          value={formatCurrency(netBalance)}
          icon={DollarSign}
          description="Balance de ingresos y gastos operativos"
        />
        <StatCard 
          title="Transferencias a Terreno"
          value={formatCurrency(totalMissionTransfers)}
          icon={Rocket}
          description="Suma de las transferencias de misión"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesChart transactions={expenseTransactions} />
        </CardContent>
      </Card>
    </div>
  );
}
