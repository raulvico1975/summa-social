'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import type { Transaction, Donor, Organization } from '@/lib/data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  FileText,
  Download,
  Mail,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  Euro,
  Calendar,
  Building2,
  Undo2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

// Tipus per al resum de donacions per donant
interface DonorSummary {
  donor: Donor;
  donations: Transaction[];
  returns: Transaction[];
  totalAmount: number;
  grossAmount: number;
  returnedAmount: number;
  donationCount: number;
  returnCount: number;
  hasEmail: boolean;
}

// Tipus ampliat per organització amb logo
interface OrganizationWithLogo extends Organization {
  logoUrl?: string;
}

// Formatejador de moneda
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

// Formatejador de data
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('ca-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Netejar nom (treure espais extra)
const cleanName = (name: string): string => {
  return name.trim().replace(/\s+/g, ' ');
};

// Convertir número a text (per imports)
const numberToWords = (num: number): string => {
  const units = ['', 'un', 'dos', 'tres', 'quatre', 'cinc', 'sis', 'set', 'vuit', 'nou'];
  const tens = ['', 'deu', 'vint', 'trenta', 'quaranta', 'cinquanta', 'seixanta', 'setanta', 'vuitanta', 'noranta'];
  const teens = ['deu', 'onze', 'dotze', 'tretze', 'catorze', 'quinze', 'setze', 'disset', 'divuit', 'dinou'];
  
  if (num === 0) return 'zero';
  if (num < 0) return 'menys ' + numberToWords(-num);
  
  const euros = Math.floor(num);
  const cents = Math.round((num - euros) * 100);
  
  let result = '';
  
  if (euros >= 1000) {
    const thousands = Math.floor(euros / 1000);
    if (thousands === 1) {
      result += 'mil ';
    } else {
      result += numberToWords(thousands) + ' mil ';
    }
  }
  
  const remainder = euros % 1000;
  if (remainder >= 100) {
    const hundreds = Math.floor(remainder / 100);
    if (hundreds === 1) {
      result += 'cent ';
    } else {
      result += units[hundreds] + '-cents ';
    }
  }
  
  const tensUnits = remainder % 100;
  if (tensUnits >= 10 && tensUnits < 20) {
    result += teens[tensUnits - 10] + ' ';
  } else {
    if (tensUnits >= 20) {
      result += tens[Math.floor(tensUnits / 10)];
      if (tensUnits % 10 !== 0) {
        result += '-' + units[tensUnits % 10];
      }
      result += ' ';
    } else if (tensUnits > 0) {
      result += units[tensUnits] + ' ';
    }
  }
  
  result += 'euros';
  
  if (cents > 0) {
    result += ' amb ' + cents + ' cèntims';
  }
  
  return result.trim();
};

// Carregar imatge com a base64
const loadImageAsBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        console.error('Error converting image:', e);
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export function DonationCertificateGenerator() {
  const { firestore } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { toast } = useToast();

  // Estat
  const [selectedYear, setSelectedYear] = React.useState<string>(String(new Date().getFullYear() - 1));
  const [isLoading, setIsLoading] = React.useState(false);
  const [donorSummaries, setDonorSummaries] = React.useState<DonorSummary[]>([]);
  const [selectedDonors, setSelectedDonors] = React.useState<Set<string>>(new Set());
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState(0);
  const [previewDonor, setPreviewDonor] = React.useState<DonorSummary | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [orgData, setOrgData] = React.useState<OrganizationWithLogo | null>(null);
  const [logoBase64, setLogoBase64] = React.useState<string | null>(null);
  const [totalReturns, setTotalReturns] = React.useState(0);

  // Anys disponibles (últims 5 anys)
  const availableYears = React.useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  }, []);

  // Carregar dades de l'organització (incloent logo)
  React.useEffect(() => {
    if (!firestore || !organizationId) return;

    const loadOrgData = async () => {
      try {
        const orgRef = doc(firestore, 'organizations', organizationId);
        const orgSnap = await getDoc(orgRef);
        if (orgSnap.exists()) {
          const data = { id: orgSnap.id, ...orgSnap.data() } as OrganizationWithLogo;
          setOrgData(data);
          
          if (data.logoUrl) {
            const base64 = await loadImageAsBase64(data.logoUrl);
            setLogoBase64(base64);
          }
        }
      } catch (error) {
        console.error('Error loading org data:', error);
      }
    };

    loadOrgData();
  }, [firestore, organizationId]);

  // Carregar dades quan canvia l'any
  const loadDonations = React.useCallback(async () => {
    if (!firestore || !organizationId) return;

    setIsLoading(true);
    try {
      // Obtenir tots els donants
      const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
      const donorsQuery = query(contactsRef, where('type', '==', 'donor'));
      const donorsSnapshot = await getDocs(donorsQuery);
      const donors: Donor[] = donorsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donor));

      // Obtenir totes les transaccions de l'any
      const transactionsRef = collection(firestore, 'organizations', organizationId, 'transactions');
      const transactionsSnapshot = await getDocs(transactionsRef);
      const allTransactions: Transaction[] = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));

      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;
      
      // ═══════════════════════════════════════════════════════════════════════════
      // DONACIONS: imports positius assignats a donants (excloent retornades)
      // ═══════════════════════════════════════════════════════════════════════════
      const yearDonations = allTransactions.filter(tx => {
        const txDate = tx.date.substring(0, 10);
        return tx.amount > 0 && 
               tx.contactId && 
               tx.contactType === 'donor' &&
               tx.donationStatus !== 'returned' &&
               txDate >= yearStart && 
               txDate <= yearEnd;
      });

      // ═══════════════════════════════════════════════════════════════════════════
      // DEVOLUCIONS: imports negatius amb transactionType === 'return'
      // ═══════════════════════════════════════════════════════════════════════════
      const yearReturns = allTransactions.filter(tx => {
        const txDate = tx.date.substring(0, 10);
        return tx.amount < 0 && 
               tx.transactionType === 'return' &&
               tx.contactId && 
               tx.contactType === 'donor' &&
               txDate >= yearStart && 
               txDate <= yearEnd;
      });

      // Agrupar per donant
      const summaries: DonorSummary[] = [];
      let globalReturnsCount = 0;
      
      for (const donor of donors) {
        const donorDonations = yearDonations.filter(tx => tx.contactId === donor.id);
        const donorReturns = yearReturns.filter(tx => tx.contactId === donor.id);
        
        // Calcular imports
        const grossAmount = donorDonations.reduce((sum, tx) => sum + tx.amount, 0);
        const returnedAmount = donorReturns.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const netAmount = Math.max(0, grossAmount - returnedAmount);
        
        // Només incloure donants amb total net positiu
        if (netAmount > 0) {
          globalReturnsCount += donorReturns.length;
          
          summaries.push({
            donor,
            donations: donorDonations.sort((a, b) => a.date.localeCompare(b.date)),
            returns: donorReturns.sort((a, b) => a.date.localeCompare(b.date)),
            totalAmount: netAmount,
            grossAmount,
            returnedAmount,
            donationCount: donorDonations.length,
            returnCount: donorReturns.length,
            hasEmail: !!donor.email,
          });
        }
      }

      summaries.sort((a, b) => b.totalAmount - a.totalAmount);
      
      setDonorSummaries(summaries);
      setSelectedDonors(new Set(summaries.map(s => s.donor.id)));
      setTotalReturns(globalReturnsCount);
      
      if (globalReturnsCount > 0) {
        toast({
          title: 'Devolucions detectades',
          description: `S'han descomptat ${globalReturnsCount} devolució${globalReturnsCount > 1 ? 'ns' : ''} dels totals.`,
          duration: 5000,
        });
      }
      
    } catch (error) {
      console.error('Error loading donations:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar les donacions.' });
    } finally {
      setIsLoading(false);
    }
  }, [firestore, organizationId, selectedYear, toast]);

  React.useEffect(() => {
    loadDonations();
  }, [loadDonations]);

  // Estadístiques
  const stats = React.useMemo(() => {
    const selected = donorSummaries.filter(s => selectedDonors.has(s.donor.id));
    return {
      totalDonors: donorSummaries.length,
      selectedDonors: selected.length,
      totalAmount: donorSummaries.reduce((sum, s) => sum + s.totalAmount, 0),
      selectedAmount: selected.reduce((sum, s) => sum + s.totalAmount, 0),
      withEmail: donorSummaries.filter(s => s.hasEmail).length,
      selectedWithEmail: selected.filter(s => s.hasEmail).length,
      totalReturned: donorSummaries.reduce((sum, s) => sum + s.returnedAmount, 0),
    };
  }, [donorSummaries, selectedDonors]);

  const toggleDonor = (donorId: string) => {
    const newSelected = new Set(selectedDonors);
    if (newSelected.has(donorId)) {
      newSelected.delete(donorId);
    } else {
      newSelected.add(donorId);
    }
    setSelectedDonors(newSelected);
  };

  const toggleAll = () => {
    if (selectedDonors.size === donorSummaries.length) {
      setSelectedDonors(new Set());
    } else {
      setSelectedDonors(new Set(donorSummaries.map(s => s.donor.id)));
    }
  };

  const buildFullAddress = (): string => {
    const parts: string[] = [];
    if (orgData?.address) parts.push(orgData.address);
    if (orgData?.zipCode || orgData?.city) {
      const cityPart = [orgData.zipCode, orgData.city].filter(Boolean).join(' ');
      parts.push(cityPart);
    }
    return parts.join(', ');
  };

  // Generar PDF per un donant
  const generatePDF = (summary: DonorSummary): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    let y = margin;

    if (logoBase64) {
      try {
        const logoHeight = 25;
        const logoWidth = 25;
        doc.addImage(logoBase64, 'PNG', (pageWidth - logoWidth) / 2, y, logoWidth, logoHeight);
        y += logoHeight + 5;
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    }

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(orgData?.name || organization?.name || 'Organització', pageWidth / 2, y, { align: 'center' });
    y += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`CIF: ${orgData?.taxId || organization?.taxId || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
    y += 5;

    const fullAddress = buildFullAddress();
    if (fullAddress) {
      doc.setFontSize(9);
      doc.text(fullAddress, pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    const contactParts: string[] = [];
    if (orgData?.phone) contactParts.push(`Tel: ${orgData.phone}`);
    if (orgData?.email) contactParts.push(orgData.email);
    if (contactParts.length > 0) {
      doc.setFontSize(9);
      doc.text(contactParts.join(' | '), pageWidth / 2, y, { align: 'center' });
      y += 5;
    }

    y += 5;
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 15;

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICAT DE DONACIÓ', pageWidth / 2, y, { align: 'center' });
    y += 8;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Any fiscal ${selectedYear}`, pageWidth / 2, y, { align: 'center' });
    y += 20;

    doc.setFontSize(11);
    const lineHeight = 7;
    const orgName = orgData?.name || organization?.name || 'Aquesta entitat';
    const orgTaxId = orgData?.taxId || organization?.taxId || 'N/A';
    const donorName = cleanName(summary.donor.name);

    doc.text(`${orgName}, amb CIF ${orgTaxId},`, margin, y);
    y += lineHeight;
    doc.text('entitat sense ànim de lucre,', margin, y);
    y += lineHeight * 2;

    doc.setFont('helvetica', 'bold');
    doc.text('CERTIFICA:', margin, y);
    y += lineHeight * 2;

    doc.setFont('helvetica', 'normal');
    doc.text(`Que ${donorName}, amb DNI/CIF ${summary.donor.taxId},`, margin, y);
    y += lineHeight;
    doc.text(`ha realitzat donacions a aquesta entitat durant l'any ${selectedYear}`, margin, y);
    y += lineHeight;
    doc.text('per un import total de:', margin, y);
    y += lineHeight * 2;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(formatCurrency(summary.totalAmount), pageWidth / 2, y, { align: 'center' });
    y += lineHeight;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(`(${numberToWords(summary.totalAmount)})`, pageWidth / 2, y, { align: 'center' });
    y += lineHeight * 2;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Detall de les donacions:', margin, y);
    y += lineHeight;

    doc.setFont('helvetica', 'normal');
    for (const donation of summary.donations) {
      const line = `• ${formatDate(donation.date)}: ${formatCurrency(donation.amount)}`;
      doc.text(line, margin + 5, y);
      y += lineHeight;
      
      if (y > 240) {
        doc.addPage();
        y = margin;
      }
    }

    // Devolucions (si n'hi ha)
    if (summary.returns.length > 0) {
      y += lineHeight;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(180, 100, 0);
      doc.text('Devolucions descomptades:', margin, y);
      y += lineHeight;

      doc.setFont('helvetica', 'normal');
      for (const ret of summary.returns) {
        const line = `• ${formatDate(ret.date)}: -${formatCurrency(Math.abs(ret.amount))}`;
        doc.text(line, margin + 5, y);
        y += lineHeight;
        
        if (y > 240) {
          doc.addPage();
          y = margin;
        }
      }
      doc.setTextColor(0);
    }

    y += lineHeight;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    const notaText = 'Aquest certificat s\'emet a efectes de la deducció prevista a l\'article 68.3 de la Llei 35/2006, de l\'Impost sobre la Renda de les Persones Físiques, i a l\'article 20 de la Llei 49/2002, de Règim fiscal de les entitats sense fins lucratius.';
    const notaLines = doc.splitTextToSize(notaText, pageWidth - margin * 2);
    doc.text(notaLines, margin, y);
    y += notaLines.length * 5 + 15;

    const today = new Date();
    const city = orgData?.city || organization?.city || 'Lleida';
    const dateText = `${city}, ${today.getDate()} de ${today.toLocaleDateString('ca-ES', { month: 'long' })} de ${today.getFullYear()}`;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(dateText, margin, y);
    y += lineHeight * 3;

    doc.text('Signatura i segell:', margin, y);
    y += lineHeight * 4;
    doc.line(margin, y, margin + 60, y);

    const footerY = pageHeight - 15;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128);
    doc.setDrawColor(200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    const footerParts: string[] = [];
    if (orgData?.name || organization?.name) footerParts.push(orgData?.name || organization?.name || '');
    if (orgData?.website) footerParts.push(orgData.website);
    if (orgData?.email) footerParts.push(orgData.email);

    if (footerParts.length > 0) {
      doc.text(footerParts.join(' · '), pageWidth / 2, footerY, { align: 'center' });
    }

    doc.setTextColor(0);
    return doc;
  };

  const handlePreview = (summary: DonorSummary) => {
    setPreviewDonor(summary);
    setIsPreviewOpen(true);
  };

  const handleDownloadOne = (summary: DonorSummary) => {
    const doc = generatePDF(summary);
    const fileName = `Certificat_${selectedYear}_${cleanName(summary.donor.name).replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    toast({ title: 'Certificat generat', description: `S'ha descarregat ${fileName}` });
  };

  const handleDownloadAll = async () => {
    const selected = donorSummaries.filter(s => selectedDonors.has(s.donor.id));
    if (selected.length === 0) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selecciona almenys un donant.' });
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);

    try {
      for (let i = 0; i < selected.length; i++) {
        const summary = selected[i];
        const doc = generatePDF(summary);
        const fileName = `Certificat_${selectedYear}_${cleanName(summary.donor.name).replace(/\s+/g, '_')}.pdf`;
        doc.save(fileName);
        
        setGenerationProgress(((i + 1) / selected.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      toast({ 
        title: '✅ Certificats generats', 
        description: `S'han descarregat ${selected.length} certificats.` 
      });
    } catch (error) {
      console.error('Error generating certificates:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Error generant els certificats.' });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  const previewAddress = buildFullAddress();
  const previewContact = [orgData?.phone ? `Tel: ${orgData.phone}` : null, orgData?.email].filter(Boolean).join(' | ');

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Any fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Donants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDonors}</div>
            <p className="text-xs text-muted-foreground">
              {stats.selectedDonors} seleccionats
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Total donat
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Any {selectedYear}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Amb email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withEmail}</div>
            <p className="text-xs text-muted-foreground">
              Poden rebre per correu
            </p>
          </CardContent>
        </Card>
      </div>

      {totalReturns > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <Undo2 className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Devolucions descomptades</AlertTitle>
          <AlertDescription className="text-orange-700">
            S'han descomptat <strong>{totalReturns}</strong> devolució{totalReturns > 1 ? 'ns' : ''} per un total de <strong>{formatCurrency(stats.totalReturned)}</strong>. 
            Els certificats reflecteixen les donacions netes efectivament rebudes.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Donants amb donacions el {selectedYear}</CardTitle>
              <CardDescription>
                Selecciona els donants per generar els certificats
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleDownloadAll}
                disabled={isLoading || isGenerating || selectedDonors.size === 0}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generant...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Descarregar seleccionats ({stats.selectedDonors})
                  </>
                )}
              </Button>
            </div>
          </div>
          {isGenerating && (
            <Progress value={generationProgress} className="mt-4" />
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : donorSummaries.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mb-2" />
              <p>No hi ha donacions registrades per l'any {selectedYear}</p>
              <p className="text-sm">Assegura't que les transaccions tinguin un donant assignat.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedDonors.size === donorSummaries.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Donant</TableHead>
                    <TableHead>DNI/CIF</TableHead>
                    <TableHead className="text-center">Donacions</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {totalReturns > 0 && (
                      <TableHead className="text-right text-orange-600">Descomptat</TableHead>
                    )}
                    <TableHead className="text-center">Email</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {donorSummaries.map(summary => (
                    <TableRow key={summary.donor.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedDonors.has(summary.donor.id)}
                          onCheckedChange={() => toggleDonor(summary.donor.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cleanName(summary.donor.name)}</TableCell>
                      <TableCell className="font-mono text-sm">{summary.donor.taxId}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{summary.donationCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium text-green-600">
                        {formatCurrency(summary.totalAmount)}
                      </TableCell>
                      {totalReturns > 0 && (
                        <TableCell className="text-right font-mono text-orange-500">
                          {summary.returnedAmount > 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              <Undo2 className="h-3 w-3" />
                              -{formatCurrency(summary.returnedAmount)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-center">
                        {summary.hasEmail ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(summary)}
                            title="Previsualitzar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadOne(summary)}
                            title="Descarregar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Previsualització del certificat
            </DialogTitle>
            <DialogDescription>
              Certificat de donació per a {previewDonor ? cleanName(previewDonor.donor.name) : ''}
            </DialogDescription>
          </DialogHeader>
          
          {previewDonor && (
            <div className="border rounded-lg p-8 bg-white text-black">
              <div className="text-center mb-4">
                {orgData?.logoUrl && (
                  <img 
                    src={orgData.logoUrl} 
                    alt="Logo" 
                    className="h-16 mx-auto mb-2 object-contain"
                  />
                )}
                <h2 className="text-xl font-bold">{orgData?.name || organization?.name}</h2>
                <p className="text-sm text-gray-600">CIF: {orgData?.taxId || organization?.taxId || 'N/A'}</p>
                {previewAddress && (
                  <p className="text-sm text-gray-500">{previewAddress}</p>
                )}
                {previewContact && (
                  <p className="text-sm text-gray-500">{previewContact}</p>
                )}
              </div>

              <hr className="my-4" />

              <div className="text-center mb-6">
                <h3 className="text-lg font-bold">CERTIFICAT DE DONACIÓ</h3>
                <p className="text-gray-600">Any fiscal {selectedYear}</p>
              </div>

              <div className="space-y-4 text-sm">
                <p>
                  {orgData?.name || organization?.name || 'Aquesta entitat'}, amb CIF {orgData?.taxId || organization?.taxId || 'N/A'},
                  entitat sense ànim de lucre,
                </p>
                
                <p className="font-bold">CERTIFICA:</p>
                
                <p>
                  Que <strong>{cleanName(previewDonor.donor.name)}</strong>, amb DNI/CIF <strong>{previewDonor.donor.taxId}</strong>,
                  ha realitzat donacions a aquesta entitat durant l'any {selectedYear} per un import total de:
                </p>

                <div className="text-center py-4">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(previewDonor.totalAmount)}
                  </p>
                  <p className="text-gray-500 italic">
                    ({numberToWords(previewDonor.totalAmount)})
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-2">Detall de les donacions:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {previewDonor.donations.map((donation, idx) => (
                      <li key={idx}>
                        {formatDate(donation.date)}: {formatCurrency(donation.amount)}
                      </li>
                    ))}
                  </ul>
                </div>

                {previewDonor.returns.length > 0 && (
                  <div className="mt-4">
                    <p className="font-bold mb-2 text-orange-600">Devolucions descomptades:</p>
                    <ul className="list-disc list-inside space-y-1 text-orange-600">
                      {previewDonor.returns.map((ret, idx) => (
                        <li key={idx}>
                          {formatDate(ret.date)}: -{formatCurrency(Math.abs(ret.amount))}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs italic text-gray-500 mt-6">
                  Aquest certificat s'emet a efectes de la deducció prevista a l'article 68.3 de la Llei 35/2006, 
                  de l'Impost sobre la Renda de les Persones Físiques, i a l'article 20 de la Llei 49/2002, 
                  de Règim fiscal de les entitats sense fins lucratius.
                </p>

                <div className="mt-8">
                  <p>{orgData?.city || organization?.city || 'Lleida'}, {new Date().toLocaleDateString('ca-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  <div className="mt-8">
                    <p>Signatura i segell:</p>
                    <div className="border-b border-gray-400 w-48 mt-8"></div>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t text-center text-xs text-gray-400">
                {[orgData?.name, orgData?.website, orgData?.email].filter(Boolean).join(' · ')}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Tancar
            </Button>
            {previewDonor && (
              <Button onClick={() => handleDownloadOne(previewDonor)}>
                <Download className="mr-2 h-4 w-4" />
                Descarregar PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```