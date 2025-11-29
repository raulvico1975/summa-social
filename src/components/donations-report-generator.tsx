
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
import { Download, Loader2 } from 'lucide-react';
import type { Emisor, Transaction } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

interface DonationReportRow {
  donorName: string;
  donorTaxId: string;
  donorZipCode: string;
  totalAmount: number;
}

export function DonationsReportGenerator() {
  const { firestore, user } = useFirebase();
  const transactionsQuery = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'transactions') : null,
    [firestore, user]
  );
  const emissorsQuery = useMemoFirebase(
    () => user ? collection(firestore, 'users', user.uid, 'emissors') : null,
    [firestore, user]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);
  const { data: emissors } = useCollection<Emisor>(emissorsQuery);

  const [reportData, setReportData] = React.useState<DonationReportRow[]>([]);
  const [selectedYear, setSelectedYear] = React.useState<string>(String(new Date().getFullYear()));
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const availableYears = React.useMemo(() => {
    if (!transactions) return [];
    const years = new Set(transactions.map(tx => new Date(tx.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);
  
  const handleGenerateReport = () => {
    setIsLoading(true);

    if (!transactions || !emissors) {
      toast({ variant: 'destructive', title: "Datos no disponibles", description: "No se pudieron cargar las transacciones o los emisores." });
      setIsLoading(false);
      return;
    }

    const year = parseInt(selectedYear, 10);
    const donors = emissors.filter(e => e.type === 'donor');
    const donorMap = new Map(donors.map(d => [d.id, d]));

    const donationsByDonor: Record<string, { donor: Emisor, total: number }> = {};

    transactions.forEach(tx => {
      const txYear = new Date(tx.date).getFullYear();
      if (txYear === year && tx.emisorId && tx.amount > 0 && donorMap.has(tx.emisorId)) {
        if (!donationsByDonor[tx.emisorId]) {
          donationsByDonor[tx.emisorId] = { donor: donorMap.get(tx.emisorId)!, total: 0 };
        }
        donationsByDonor[tx.emisorId].total += tx.amount;
      }
    });

    const generatedReportData: DonationReportRow[] = Object.values(donationsByDonor).map(({ donor, total }) => ({
      donorName: donor.name,
      donorTaxId: donor.taxId,
      donorZipCode: donor.zipCode,
      totalAmount: total,
    })).sort((a,b) => b.totalAmount - a.totalAmount);
    
    setReportData(generatedReportData);
    setIsLoading(false);
    toast({ title: "Informe Generat", description: `S'ha generat l'informe per a l'any ${selectedYear} amb ${generatedReportData.length} donants.` });
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast({ variant: 'destructive', title: "Cap dada per exportar", description: "Genera primer l'informe abans d'exportar." });
      return;
    }

    const csvData = reportData.map(row => ({
      'Nom Complert': row.donorName,
      'DNI/CIF': row.donorTaxId,
      'Codi Postal': row.donorZipCode,
      'Import Donat': row.totalAmount.toFixed(2),
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `informe_donacions_${selectedYear}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({ title: "Exportació Completada", description: "L'informe de donacions s'ha descarregat com a arxiu CSV." });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  return (
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Generador d'Informe de Donacions (Model 182)</CardTitle>
                <CardDescription>Genera el llistat de donacions anuals per a la declaració a Hisenda.</CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecciona un any" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableYears.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Button onClick={handleGenerateReport} disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Generar Informe
                </Button>
                <Button variant="outline" onClick={handleExportCSV} disabled={reportData.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar a CSV
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent>
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Nom del Donant</TableHead>
                    <TableHead>DNI/CIF</TableHead>
                    <TableHead>Codi Postal</TableHead>
                    <TableHead className="text-right">Import Total Anual</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {reportData.map((row) => (
                    <TableRow key={row.donorTaxId}>
                    <TableCell className="font-medium">{row.donorName}</TableCell>
                    <TableCell>{row.donorTaxId}</TableCell>
                    <TableCell>{row.donorZipCode}</TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(row.totalAmount)}</TableCell>
                    </TableRow>
                ))}
                {reportData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                           {isLoading ? "Generant informe..." : "Selecciona un any i genera l'informe per veure les dades."}
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>
        </CardContent>
      </Card>
  );
}
