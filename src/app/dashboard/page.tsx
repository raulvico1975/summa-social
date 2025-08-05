import { StatCard } from '@/components/stat-card';
import { ExpensesChart } from '@/components/expenses-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">Panel de Control</h1>
        <p className="text-muted-foreground">Analiza tus datos financieros con resúmenes y gráficos.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard 
          title="Ingresos Totales (Últimos 30d)"
          value="€6,750.00"
          icon={TrendingUp}
          description="+20.1% desde el mes pasado"
        />
        <StatCard 
          title="Gastos Totales (Últimos 30d)"
          value="-€1,350.75"
          icon={TrendingDown}
          description="-5.2% desde el mes pasado"
        />
        <StatCard 
          title="Balance Neto"
          value="€5,399.25"
          icon={DollarSign}
          description="Balance total de ingresos y gastos"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gastos por Categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesChart />
        </CardContent>
      </Card>
    </div>
  );
}
