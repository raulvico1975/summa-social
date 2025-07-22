'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const chartData = [
  { category: 'Alquiler', expenses: 800 },
  { category: 'Suministros', expenses: 75.5 },
  { category: 'Servicios', expenses: 120 },
  { category: 'Proveedores', expenses: 300 },
  { category: 'Viajes', expenses: 55.25 },
];

const chartConfig = {
  expenses: {
    label: 'Gastos',
    color: 'hsl(var(--primary))',
  },
} satisfies ChartConfig;

export function ExpensesChart() {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={chartData}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 10)}
        />
        <YAxis tickFormatter={(value) => `€${value}`} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="dot" />}
        />
        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
