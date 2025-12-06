
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
import { Download, Loader2, Heart, AlertTriangle, Undo2 } from 'lucide-react';
import type { Donor, Transaction, AnyContact } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

interface DonationReportRow {
  donorName: string;
  donorTaxId: string;
  donorZipCode: string;
  totalAmount: number;
  returnedAmount: number;
}

interface ReportStats {
  totalDonors: number;
  totalAmount: number;
  excludedReturns: number;
  excludedAmount: number;
}

export function DonationsReportGenerator() {
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

  // Filtrar només els donants
  const donors = React.useMemo(() => 
    (contacts?.filter(c => c.type === 'donor') as Donor[]) || [],
  [contacts]);

  const [reportData, setReportData] = React.useState<DonationReportRow[]>([]);
  const [reportStats, setReportStats] = React.useState<ReportStats | null>(null);
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

    if (!transactions || !contacts) {
      toast({ variant: 'destructive', title: t.reports.dataNotAvailable, description: t.reports.dataNotAvailableDescription });
      setIsLoading(false);
      return;
    }

    const year = parseInt(selectedYear, 10);
    
    // Crear mapa de donants per ID
    const donorMap = new Map(donors.map(d => [d.id, d]));

    const donationsByDonor: Record<string, { 
      donor: Donor, 
      total: number, 
      returned: number 
    }> = {};

    // Estadístiques globals
    let excludedReturns = 0;
    let excludedAmount = 0;

    // ═══════════════════════════════════════════════════════════════════════════
    // PROCESSAR TOTES LES TRANSACCIONS
    // ═══════════════════════════════════════════════════════════════════════════
    transactions.forEach(tx => {
      const txYear = new Date(tx.date).getFullYear();
      
      // Només processar transaccions de l'any seleccionat amb donant assignat
      if (txYear === year && tx.contactId && donorMap.has(tx.contactId)) {
        
        // Inicialitzar si no existeix
        if (!donationsByDonor[tx.contactId]) {
          donationsByDonor[tx.contactId] = { 
            donor: donorMap.get(tx.contactId)!, 
            total: 0,
            returned: 0 
          };
        }
        
        // ═══════════════════════════════════════════════════════════════════════
        // LÒGICA DE CÀLCUL:
        // 1. Devolucions (transactionType === 'return', import negatiu) → comptabilitzar
        // 2. Donacions marcades com retornades → excloure
        // 3. Donacions normals → sumar
        // ═══════════════════════════════════════════════════════════════════════
        
        if (tx.transactionType === 'return' && tx.amount < 0) {
          // És una DEVOLUCIÓ vinculada a aquest donant
          // L'import és negatiu, així que agafem el valor absolut per comptabilitzar
          const returnedAmount = Math.abs(tx.amount);
          donationsByDonor[tx.contactId].returned += returnedAmount;
          excludedReturns++;
          excludedAmount += returnedAmount;
          
        } else if (tx.amount > 0) {
          // És una donació positiva
          if (tx.donationStatus === 'returned') {
            // Donació marcada com a retornada (manualment) → excloure
            donationsByDonor[tx.contactId].returned += tx.amount;
            excludedReturns++;
            excludedAmount += tx.amount;
          } else {
            // Donació normal → sumar al total
            donationsByDonor[tx.contactId].total += tx.amount;
          }
        }
      }
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // CALCULAR TOTAL NET: donacions - devolucions per cada donant
    // ═══════════════════════════════════════════════════════════════════════════
    const generatedReportData: DonationReportRow[] = Object.values(donationsByDonor)
      .map(({ donor, total, returned }) => ({
        donorName: donor.name,
        donorTaxId: donor.taxId,
        donorZipCode: donor.zipCode,
        // Total net = donacions - devolucions (mínim 0)
        totalAmount: Math.max(0, total - returned),
        returnedAmount: returned,
      }))
      // Només incloure donants amb total positiu
      .filter(({ totalAmount }) => totalAmount > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount);
    
    // Calcular estadístiques
    const stats: ReportStats = {
      totalDonors: generatedReportData.length,
      totalAmount: generatedReportData.reduce((sum, row) => sum + row.totalAmount, 0),
      excludedReturns,
      excludedAmount,
    };

    setReportData(generatedReportData);
    setReportStats(stats);
    setIsLoading(false);
    
    // Toast amb informació de devolucions si n'hi ha
    if (excludedReturns > 0) {
      toast({ 
        title: t.reports.reportGenerated, 
        description: (
          <div>
            <p>{t.reports.reportGeneratedDescription(selectedYear, generatedReportData.length)}</p>
            <p className="text-orange-600 mt-1">
              ⚠️ {t.reports.returnsDiscountedToast(excludedReturns, formatCurrencyEU(excludedAmount))}
            </p>
          </div>
        ),
        duration: 6000,
      });
    } else {
      toast({ 
        title: t.reports.reportGenerated, 
        description: t.reports.reportGeneratedDescription(selectedYear, generatedReportData.length) 
      });
    }
  };

  const handleExportCSV = () => {
    if (reportData.length === 0) {
      toast({ variant: 'destructive', title: t.reports.noDataToExport, description: "Genera primer l'informe abans d'exportar." });
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
    link.setAttribute('download', `informe_donacions_model182_${selectedYear}.csv`);
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
                  <Heart className="h-5 w-5 text-red-500" />
                  {t.reports.donationsReportTitle}
                </CardTitle>
                <CardDescription>{t.reports.donationsReportDescription}</CardDescription>
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
            {/* ═══════════════════════════════════════════════════════════════════
                AVÍS DE DEVOLUCIONS DESCOMPTADES
                ═══════════════════════════════════════════════════════════════════ */}
            {reportStats && reportStats.excludedReturns > 0 && (
              <Alert className="border-orange-200 bg-orange-50">
                <Undo2 className="h-4 w-4 text-orange-600" />
                <AlertTitle className="text-orange-800">{t.reports.returnsDiscountedTitle}</AlertTitle>
                <AlertDescription className="text-orange-700">
                  {t.reports.returnsDiscountedDescription(reportStats.excludedReturns, formatCurrencyEU(reportStats.excludedAmount))}
                </AlertDescription>
              </Alert>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                RESUM D'ESTADÍSTIQUES
                ═══════════════════════════════════════════════════════════════════ */}
            {reportStats && reportData.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium">{t.donors.title}</p>
                  <p className="text-2xl font-bold text-green-700">{reportStats.totalDonors}</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-xs text-green-600 font-medium">{t.certificates.totalDonated}</p>
                  <p className="text-2xl font-bold text-green-700">{formatCurrencyEU(reportStats.totalAmount)}</p>
                </div>
                {reportStats.excludedReturns > 0 && (
                  <>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs text-orange-600 font-medium">{t.reports.returns}</p>
                      <p className="text-2xl font-bold text-orange-700">{reportStats.excludedReturns}</p>
                    </div>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs text-orange-600 font-medium">{t.reports.discountedAmount}</p>
                      <p className="text-2xl font-bold text-orange-700">{formatCurrencyEU(reportStats.excludedAmount)}</p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════════
                TAULA DE DONANTS
                ═══════════════════════════════════════════════════════════════════ */}
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>{t.reports.donorName}</TableHead>
                    <TableHead>{t.reports.donorTaxId}</TableHead>
                    <TableHead>{t.reports.donorZipCode}</TableHead>
                    <TableHead className="text-right">{t.reports.totalAmount}</TableHead>
                    {reportStats?.excludedReturns ? (
                      <TableHead className="text-right text-orange-600">{t.reports.columnDiscounted}</TableHead>
                    ) : null}
                </TableRow>
                </TableHeader>
                <TableBody>
                {reportData.map((row) => (
                    <TableRow key={row.donorTaxId}>
                      <TableCell className="font-medium">{row.donorName}</TableCell>
                      <TableCell>{row.donorTaxId}</TableCell>
                      <TableCell>{row.donorZipCode}</TableCell>
                      <TableCell className="text-right font-mono text-green-600 font-medium">
                        {formatCurrencyEU(row.totalAmount)}
                      </TableCell>
                      {reportStats?.excludedReturns ? (
                        <TableCell className="text-right font-mono text-orange-500">
                          {row.returnedAmount > 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              <Undo2 className="h-3 w-3" />
                              -{formatCurrencyEU(row.returnedAmount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      ) : null}
                    </TableRow>
                ))}
                {reportData.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={reportStats?.excludedReturns ? 5 : 4} className="text-center text-muted-foreground h-24">
                           {isLoading ? t.reports.generating : t.reports.noData}
                        </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
            </div>

            {/* ═══════════════════════════════════════════════════════════════════
                NOTA LEGAL
                ═══════════════════════════════════════════════════════════════════ */}
            {reportData.length > 0 && (
              <p className="text-xs text-muted-foreground">
                ℹ️ {t.reports.netDonationsNote}
              </p>
            )}
        </CardContent>
      </Card>
  );
}

    
