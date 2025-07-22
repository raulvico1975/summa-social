import { Button } from "@/components/ui/button";
import { TransactionsTable } from "@/components/transactions-table";
import { FileUp, Download } from "lucide-react";
import { transactions, categories } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-headline">Panel de Control</h1>
          <p className="text-muted-foreground">Aquí tienes un resumen de tu actividad financiera.</p>
        </div>
        <div className="flex gap-2">
          <Button>
            <FileUp className="mr-2 h-4 w-4" />
            Importar Extracto
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Transacciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionsTable initialTransactions={transactions} availableCategories={categories} />
        </CardContent>
      </Card>
    </div>
  );
}
