
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { Transaction } from '@/lib/data';
import * as React from 'react';

const chartConfig = {
  expenses: {
    label: 'Gastos',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function ExpensesChart({ transactions }: { transactions: Transaction[] }) {

  const chartData = React.useMemo(() => {
    if (!transactions || transactions.length === 0) {
      return [];
    }

    const expensesByCategory = transactions.reduce((acc, tx) => {
      const category = tx.category || 'Sin Categoría';
      if (!acc[category]) {
        acc[category] = 0;
      }
      // We sum the absolute value of the expenses
      acc[category] += Math.abs(tx.amount);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(expensesByCategory).map(([category, expenses]) => ({
      category,
      expenses: parseFloat(expenses.toFixed(2)),
    })).sort((a, b) => b.expenses - a.expenses); // Sort descending

  }, [transactions]);


  if (chartData.length === 0) {
    return (
        <div className="flex items-center justify-center h-[200px] w-full text-muted-foreground">
            No hay datos de gastos para mostrar.
        </div>
    )
  }

  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{left: 20}}>
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="category"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.length > 20 ? `${value.slice(0, 20)}...` : value}
        />
        <XAxis type="number" dataKey="expenses" tickFormatter={(value) => `€${value}`} hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
