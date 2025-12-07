'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import { Download, Loader2, Building2, AlertTriangle } from 'lucide-react';
import type { Supplier, Transaction, AnyContact } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

// Llindar legal del Model 347: 3.005,06€
const THRESHOLD_347 = 3005.06;

interface SupplierReportRow {
  supplierName: string;
  supplierTaxId: string;
  totalAmount: number;
}

interface ReportStats {
  totalSuppliers: number;
  totalAmount: number;
  suppliersWithoutTaxId: number;
}

export function SuppliersReportGenerator() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();

  const transactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);
  const { data: contacts } = useCollection<AnyContact>(contactsQuery);

  // Filtrar només els proveïdors
  const suppliers = React.useMemo(() =>
    (contacts?.filter(c => c.type === 'supplier') as Supplier[]) || [],
  [contacts]);

  const [reportData, setReportData] = React.useState<SupplierReportRow[]>([]);
  const [reportStats, setReportStats] = React.useState<ReportStats | null>(null);
  const [suppliersWithoutTaxId, setSuppliersWithoutTaxId] = React.useState<string[]>([]);
  const [selectedYear, setSelectedYear] = React.useState<string>(String(new Date().getFullYear() - 1));
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const availableYears = React.useMemo(() => {
    if (!transactions) return [];
    const years = new Set(transactions.map(tx => new Date(tx.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const handleGenerateReport = () => {
    setIsLoading(true);

    if (!transactions || !contacts) {
      toast({ variant: 'destructive', title: t.reports.dataNotAvailable, description: t.reports.dataNotAvailableDescription });
      setIsLoading(false);
      return;
    }

    const year = parseInt(selectedYear, 10);

    // Crear mapa de proveïdors per ID
    const supplierMap = new Map(suppliers.map(s => [s.id, s]));

    const paymentsBySupplier: Record<string, {
      supplier: Supplier,
      total: number
    }> = {};

    // Processar totes les transaccions negatives (despeses)
    transactions.forEach(tx => {
      const txYear = new Date(tx.date).getFullYear();

      // Només processar despeses de l'any seleccionat amb proveïdor assignat
      if (txYear === year && tx.amount < 0 && tx.contactId && tx.contactType === 'supplier' && supplierMap.has(tx.contactId)) {

        // Inicialitzar si no existeix
        if (!paymentsBySupplier[tx.contactId]) {
          paymentsBySupplier[tx.contactId] = {
            supplier: supplierMap.get(tx.contactId)!,
            total: 0
          };
        }

        // Sumar l'import absolut (les despeses són negatives)
        paymentsBySupplier[tx.contactId].total += Math.abs(tx.amount);
      }
    });

    // Filtrar proveïdors per sobre del llindar
    const generatedReportData: SupplierReportRow[] = Object.values(paymentsBySupplier)
      .filter(({ total }) => total > THRESHOLD_347)
      .map(({ supplier, total }) => ({
        supplierName: supplier.name,
        supplierTaxId: supplier.taxId || '',
        totalAmount: total,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount);

    // Identificar proveïdors sense NIF
    const withoutTaxId = generatedReportData
      .filter(row => !row.supplierTaxId)
      .map(row => row.supplierName);

    // Calcular estadístiques
    const stats: ReportStats = {
      totalSuppliers: generatedReportData.length,
      totalAmount: generatedReportData.reduce((sum, row) => sum + row.totalAmount, 0),
      suppliersWithoutTaxId: withoutTaxId.length,
    };

    setReportData(generatedReportData);
    setReportStats(stats);
    setSuppliersWithoutTaxId(withoutTaxId);
    setIsLoading(false);

    toast({
      title: t.reports.reportGenerated,
      description: t.reports.suppliersReportGeneratedDescription(selectedYear, generatedReportData.length)
    });
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast({ variant: 'destructive', title: t.reports.noDataToExport, description: t.reports.noDataToExportDescription });
      return;
    }

    const csvData = reportData
      .filter(row => row.supplierTaxId) // Només exportar els que tenen NIF
      .map(row => ({
        [t.reports.supplierTaxId]: row.supplierTaxId,
        [t.reports.supplierName]: row.supplierName,
        [t.reports.totalAmount]: row.totalAmount.toFixed(2),
      }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `informe_proveidors_model347_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: t.reports.exportComplete, description: t.reports.exportCompleteDescription });
  };


  return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-500" />
                  {t.reports.suppliersReportTitle}
                </CardTitle>
                <CardDescription>{t.reports.suppliersReportDescription}</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder={t.reports.selectYear} />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleGenerateReport} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t.reports.generate}
                </Button>
                <Button variant="outline" onClick={handleExportCSV} disabled={reportData.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    {t.reports.exportCsv}
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
            {/* Avís de proveïdors sense NIF */}
            {suppliersWithoutTaxId.length > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>{t.reports.suppliersWithoutTaxId}</AlertTitle>
                <AlertDescription>
                  {t.reports.suppliersWithoutTaxIdDescription}
                  <ul className="mt-2 list-disc list-inside">
                    {suppliersWithoutTaxId.map(name => (
                      <li key={name}>{name}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Resum d'estadístiques */}
            {reportStats && reportData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">{t.suppliers.title}</p>
                  <p className="text-2xl font-bold text-blue-700">{reportStats.totalSuppliers}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-600 font-medium">{t.reports.totalAmount}</p>
                  <p className="text-2xl font-bold text-blue-700">{formatCurrencyEU(reportStats.totalAmount)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-medium">{t.reports.threshold347}</p>
                  <p className="text-2xl font-bold text-gray-700">{formatCurrencyEU(THRESHOLD_347)}</p>
                </div>
              </div>
            )}

            {/* Taula de proveïdors */}
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>{t.reports.supplierTaxId}</TableHead>
                    <TableHead>{t.reports.supplierName}</TableHead>
                    <TableHead className="text-right">{t.reports.totalAmount}</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {reportData.map((row) => (
                    <TableRow key={row.supplierName}>
                      <TableCell className={!row.supplierTaxId ? 'text-red-500' : ''}>
                        {row.supplierTaxId || <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {t.reports.missingTaxId}</span>}
                      </TableCell>
                      <TableCell className="font-medium">{row.supplierName}</TableCell>
                      <TableCell className="text-right font-mono text-blue-600 font-medium">
                        {formatCurrencyEU(row.totalAmount)}
                      </TableCell>
                    </TableRow>
                ))}
                {reportData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                           {isLoading ? t.reports.generating : t.reports.noSuppliersAboveThreshold}
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>

            {/* Nota informativa */}
            {reportData.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t.reports.model347Note}
              </p>
            )}
        </CardContent>
      </Card>
  );
}
