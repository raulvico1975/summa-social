'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import type { Transaction, Donor, Organization } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { useTranslations } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { jsPDF } from 'jspdf';

// UI Components
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  Building2,
  Edit,
  AlertTriangle,
  CheckCircle2,
  Euro,
  Calendar,
  TrendingUp,
  Undo2,
  ChevronDown,
  ChevronUp,
  FileText,
  Download,
  RefreshCw,
  Loader2,
} from 'lucide-react';

// ════════════════════════════════════════════════════════════════════════════
// TIPUS
// ════════════════════════════════════════════════════════════════════════════

interface DonorDetailDrawerProps {
  donor: Donor | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (donor: Donor) => void;
}

interface DonationSummary {
  totalHistoric: number;
  totalHistoricCount: number;
  currentYear: number;
  currentYearCount: number;
  lastDonationDate: string | null;
  returns: {
    count: number;
    amount: number;
  };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════════════════

export function DonorDetailDrawer({ donor, open, onOpenChange, onEdit }: DonorDetailDrawerProps) {
  const { firestore } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { t, language } = useTranslations();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = React.useState<string>(String(currentYear));
  const [filterStatus, setFilterStatus] = React.useState<'all' | 'returns'>('all');
  const [isHistoryOpen, setIsHistoryOpen] = React.useState(false);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const itemsPerPage = 10;

  // Transaccions del donant - usar onSnapshot per gestionar errors de permisos
  const [transactions, setTransactions] = React.useState<Transaction[] | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [permissionError, setPermissionError] = React.useState(false);

  React.useEffect(() => {
    if (!organizationId || !donor || !open) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setPermissionError(false);

    // Carregar totes les transaccions i filtrar al client
    // Això evita problemes amb les Security Rules de Firestore que no permeten
    // queries amb where() quan l'usuari és SuperAdmin però no membre de l'org
    const txRef = collection(firestore, 'organizations', organizationId, 'transactions');
    const txQuery = query(txRef, orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      txQuery,
      (snapshot) => {
        // Filtrar les transaccions d'aquest donant al client
        const allTxs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
        const donorTxs = allTxs.filter(tx => tx.contactId === donor.id);
        setTransactions(donorTxs);
        setIsLoading(false);
        setPermissionError(false);
      },
      (error) => {
        console.warn('Donor transactions not available:', error.message);
        setIsLoading(false);
        setPermissionError(true);
        setTransactions([]);
      }
    );

    return () => unsubscribe();
  }, [firestore, organizationId, donor?.id, open]);

  // Anys disponibles (dels quals hi ha transaccions)
  const availableYears = React.useMemo(() => {
    if (!transactions) return [String(currentYear)];
    const years = new Set<string>();
    transactions.forEach(tx => {
      const year = tx.date.substring(0, 4);
      years.add(year);
    });
    // Afegir any actual si no hi és
    years.add(String(currentYear));
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [transactions, currentYear]);

  // Calcular resums
  const summary = React.useMemo<DonationSummary>(() => {
    if (!transactions) {
      return {
        totalHistoric: 0,
        totalHistoricCount: 0,
        currentYear: 0,
        currentYearCount: 0,
        lastDonationDate: null,
        returns: { count: 0, amount: 0 },
      };
    }

    const currentYearStr = String(currentYear);
    let totalHistoric = 0;
    let totalHistoricCount = 0;
    let currentYearTotal = 0;
    let currentYearCount = 0;
    let lastDonationDate: string | null = null;
    let returnsCount = 0;
    let returnsAmount = 0;

    transactions.forEach(tx => {
      if (tx.amount > 0 && tx.donationStatus !== 'returned') {
        // Donació vàlida
        totalHistoric += tx.amount;
        totalHistoricCount++;
        if (tx.date.startsWith(currentYearStr)) {
          currentYearTotal += tx.amount;
          currentYearCount++;
        }
        if (!lastDonationDate || tx.date > lastDonationDate) {
          lastDonationDate = tx.date;
        }
      } else if (tx.amount < 0 && tx.transactionType === 'return') {
        // Devolució
        returnsCount++;
        returnsAmount += Math.abs(tx.amount);
      }
    });

    return {
      totalHistoric,
      totalHistoricCount,
      currentYear: currentYearTotal,
      currentYearCount,
      lastDonationDate,
      returns: { count: returnsCount, amount: returnsAmount },
    };
  }, [transactions, currentYear]);

  // Per defecte: historial obert si <= 5 donacions
  React.useEffect(() => {
    if (transactions && transactions.length > 0) {
      const donationsCount = transactions.filter(tx => tx.amount > 0).length;
      setIsHistoryOpen(donationsCount <= 5);
    }
  }, [transactions]);

  // Filtrar transaccions per any i estat
  const filteredTransactions = React.useMemo(() => {
    if (!transactions) return [];

    return transactions.filter(tx => {
      // Filtrar per any
      if (!tx.date.startsWith(selectedYear)) return false;

      // Filtrar per estat
      if (filterStatus === 'returns') {
        return tx.transactionType === 'return';
      }
      // 'all': mostrar donacions vàlides i devolucions
      return tx.amount > 0 || tx.transactionType === 'return';
    });
  }, [transactions, selectedYear, filterStatus]);

  // Paginació
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset pàgina quan canvien els filtres
  React.useEffect(() => {
    setCurrentPage(1);
  }, [selectedYear, filterStatus]);

  // Helper: dades completes?
  const hasCompleteData = donor?.taxId && donor?.zipCode;

  // Formatar data
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'ca' ? 'ca-ES' : 'es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Helper per carregar imatge com a base64 usant canvas (evita problemes CORS)
  const loadImageAsBase64 = async (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Important per CORS

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } else {
            resolve(null);
          }
        } catch (error) {
          console.warn('Canvas error:', error);
          resolve(null);
        }
      };

      img.onerror = (error) => {
        console.warn('Error loading image for PDF:', url, error);
        resolve(null);
      };

      // Afegir timestamp per evitar cache problemàtic
      img.src = url.includes('?') ? `${url}&t=${Date.now()}` : `${url}?t=${Date.now()}`;
    });
  };

  // Generar certificat individual
  const generateCertificate = async (tx: Transaction) => {
    if (!donor || !organization) return;

    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;
      const lineHeight = 7;

      // ═══════════════════════════════════════════════════════════════════════
      // CAPÇALERA AMB LOGO
      // ═══════════════════════════════════════════════════════════════════════

      // Helper per construir l'adreça completa de l'organització
      const buildOrgFullAddress = (): string => {
        const parts: string[] = [];
        if (organization.address) parts.push(organization.address);
        const locationPart = [organization.zipCode, organization.city, organization.province].filter(Boolean).join(' ');
        if (locationPart) parts.push(locationPart);
        return parts.join(', ');
      };

      const orgFullAddress = buildOrgFullAddress();

      if (organization.logoUrl) {
        const logoBase64 = await loadImageAsBase64(organization.logoUrl);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, y, 30, 30);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(organization.name || '', margin + 35, y + 10);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`CIF: ${organization.taxId || 'N/A'}`, margin + 35, y + 16);
          if (orgFullAddress) {
            doc.setFontSize(9);
            const headerAddress = doc.splitTextToSize(orgFullAddress, contentWidth - 35);
            doc.text(headerAddress, margin + 35, y + 22);
          }
          y += 38;
        } else {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(organization.name || '', pageWidth / 2, y, { align: 'center' });
          y += 6;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`CIF: ${organization.taxId || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
          y += 5;
          if (orgFullAddress) {
            doc.setFontSize(9);
            doc.text(orgFullAddress, pageWidth / 2, y, { align: 'center' });
            y += 5;
          }
          y += 5;
        }
      } else {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(organization.name || '', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`CIF: ${organization.taxId || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
        y += 5;
        if (orgFullAddress) {
          doc.setFontSize(9);
          doc.text(orgFullAddress, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }
        y += 5;
      }

      // Línia separadora
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // ═══════════════════════════════════════════════════════════════════════
      // TÍTOL DEL CERTIFICAT
      // ═══════════════════════════════════════════════════════════════════════

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t.donorDetail.certificate.title, pageWidth / 2, y, { align: 'center' });
      y += 18;

      // ═══════════════════════════════════════════════════════════════════════
      // COS DEL CERTIFICAT - FORMAT FORMAL
      // ═══════════════════════════════════════════════════════════════════════

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Línia 1: D./Dª [Signant], en representació de [Entitat],
      const signatoryPrefix = donor.donorType === 'company' ? '' : 'D./Dª ';
      const signatoryName = organization.signatoryName || '[Representant]';
      const line1 = `${signatoryPrefix}${signatoryName}, ${t.donorDetail.certificate.inRepresentationOf} ${organization.name},`;
      const line1Wrapped = doc.splitTextToSize(line1, contentWidth);
      doc.text(line1Wrapped, margin, y);
      y += line1Wrapped.length * lineHeight;

      // Línia 2: con CIF [CIF], domicilio en [Adreça completa],
      const line2 = `${t.donorDetail.certificate.withCif} ${organization.taxId}, ${t.donorDetail.certificate.domiciledAt} ${orgFullAddress || '[Adreça]'},`;
      const line2Wrapped = doc.splitTextToSize(line2, contentWidth);
      doc.text(line2Wrapped, margin, y);
      y += line2Wrapped.length * lineHeight + 8;

      // CERTIFICA (destacat i centrat)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t.donorDetail.certificate.certifies, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Primer paràgraf: Que [Donant] con DNI/CIF [NIF] y domicilio en [Adreça], donó...
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      // Construir adreça completa del donant (adreça + CP + ciutat)
      const donorAddressParts: string[] = [];
      if (donor.address) donorAddressParts.push(donor.address);
      const donorLocationPart = [donor.zipCode, donor.city, donor.province].filter(Boolean).join(' ');
      if (donorLocationPart) donorAddressParts.push(donorLocationPart);
      const donorAddress = donorAddressParts.length > 0 ? donorAddressParts.join(', ') : '[Domicili no informat]';
      const paragraph1 = `${t.donorDetail.certificate.thatDonor} ${donor.name} ${t.donorDetail.certificate.withNifCif} ${donor.taxId} ${t.donorDetail.certificate.andDomicile} ${donorAddress}, ${t.donorDetail.certificate.donatedAmount} ${formatCurrencyEU(tx.amount)} ${t.donorDetail.certificate.onDate} ${formatDate(tx.date)} ${t.donorDetail.certificate.toTheEntity}`;
      const paragraph1Wrapped = doc.splitTextToSize(paragraph1, contentWidth);
      doc.text(paragraph1Wrapped, margin, y);
      y += paragraph1Wrapped.length * lineHeight + 6;

      // Segon paràgraf: Clàusula irrevocable
      const paragraph2 = t.donorDetail.certificate.irrevocableClause;
      const paragraph2Wrapped = doc.splitTextToSize(paragraph2, contentWidth);
      doc.text(paragraph2Wrapped, margin, y);
      y += paragraph2Wrapped.length * lineHeight + 6;

      // Tercer paràgraf: Y para que así conste...
      const today = new Date();
      const monthNames = Object.keys(t.months);
      const monthName = t.months[monthNames[today.getMonth()] as keyof typeof t.months];
      const cityName = organization.city || '[Ciutat]';
      const paragraph3 = `${t.donorDetail.certificate.issuedIn} ${cityName} ${t.donorDetail.certificate.issuedOn} ${today.getDate()} de ${monthName} de ${today.getFullYear()}.`;
      const paragraph3Wrapped = doc.splitTextToSize(paragraph3, contentWidth);
      doc.text(paragraph3Wrapped, margin, y);
      y += paragraph3Wrapped.length * lineHeight + 15;

      // ═══════════════════════════════════════════════════════════════════════
      // NOTA LEGAL
      // ═══════════════════════════════════════════════════════════════════════

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const legalText = t.donorDetail.certificate.legalNote;
      const legalLines = doc.splitTextToSize(legalText, contentWidth);
      doc.text(legalLines, margin, y);
      y += legalLines.length * 4 + 15;

      // ═══════════════════════════════════════════════════════════════════════
      // FIRMA (centrada a la dreta)
      // ═══════════════════════════════════════════════════════════════════════

      const signatureX = pageWidth - margin - 60;

      if (organization.signatureUrl) {
        const signatureBase64 = await loadImageAsBase64(organization.signatureUrl);
        if (signatureBase64) {
          doc.addImage(signatureBase64, 'PNG', signatureX, y, 50, 25);
          y += 28;
        }
      }

      if (organization.signatoryName) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(organization.signatoryName, signatureX + 25, y, { align: 'center' });
        y += 5;
      }
      if (organization.signatoryRole) {
        doc.setFont('helvetica', 'normal');
        doc.text(organization.signatoryRole, signatureX + 25, y, { align: 'center' });
      }

      // Descarregar
      const fileName = `Certificat_${formatDate(tx.date).replace(/\//g, '-')}_${donor.name.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      toast({
        title: t.donorDetail.certificate.generated,
        description: fileName,
      });
    } catch (error) {
      console.error('Error generating certificate:', error);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.donorDetail.certificate.error,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Generar certificat anual
  const generateAnnualCertificate = async (year: string) => {
    if (!donor || !organization) return;

    // Calcular total de l'any
    const yearDonations = transactions?.filter(tx =>
      tx.date.startsWith(year) &&
      tx.amount > 0 &&
      tx.donationStatus !== 'returned'
    ) || [];

    const totalAmount = yearDonations.reduce((sum, tx) => sum + tx.amount, 0);

    if (totalAmount === 0) {
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.donorDetail.certificate.noDonationsYear,
      });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;
      const lineHeight = 7;

      // ═══════════════════════════════════════════════════════════════════════
      // CAPÇALERA AMB LOGO
      // ═══════════════════════════════════════════════════════════════════════

      // Helper per construir l'adreça completa de l'organització
      const buildOrgFullAddress = (): string => {
        const parts: string[] = [];
        if (organization.address) parts.push(organization.address);
        const locationPart = [organization.zipCode, organization.city, organization.province].filter(Boolean).join(' ');
        if (locationPart) parts.push(locationPart);
        return parts.join(', ');
      };

      const orgFullAddress = buildOrgFullAddress();

      if (organization.logoUrl) {
        const logoBase64 = await loadImageAsBase64(organization.logoUrl);
        if (logoBase64) {
          doc.addImage(logoBase64, 'PNG', margin, y, 30, 30);
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(organization.name || '', margin + 35, y + 10);
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`CIF: ${organization.taxId || 'N/A'}`, margin + 35, y + 16);
          if (orgFullAddress) {
            doc.setFontSize(9);
            const headerAddress = doc.splitTextToSize(orgFullAddress, contentWidth - 35);
            doc.text(headerAddress, margin + 35, y + 22);
          }
          y += 38;
        } else {
          doc.setFontSize(14);
          doc.setFont('helvetica', 'bold');
          doc.text(organization.name || '', pageWidth / 2, y, { align: 'center' });
          y += 6;
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(`CIF: ${organization.taxId || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
          y += 5;
          if (orgFullAddress) {
            doc.setFontSize(9);
            doc.text(orgFullAddress, pageWidth / 2, y, { align: 'center' });
            y += 5;
          }
          y += 5;
        }
      } else {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(organization.name || '', pageWidth / 2, y, { align: 'center' });
        y += 6;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`CIF: ${organization.taxId || 'N/A'}`, pageWidth / 2, y, { align: 'center' });
        y += 5;
        if (orgFullAddress) {
          doc.setFontSize(9);
          doc.text(orgFullAddress, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }
        y += 5;
      }

      // Línia separadora
      doc.setDrawColor(180);
      doc.line(margin, y, pageWidth - margin, y);
      y += 15;

      // ═══════════════════════════════════════════════════════════════════════
      // TÍTOL DEL CERTIFICAT
      // ═══════════════════════════════════════════════════════════════════════

      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text(t.donorDetail.certificate.annualTitle, pageWidth / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(t.certificates.pdf.fiscalYear(year), pageWidth / 2, y, { align: 'center' });
      y += 18;

      // ═══════════════════════════════════════════════════════════════════════
      // COS DEL CERTIFICAT - FORMAT FORMAL
      // ═══════════════════════════════════════════════════════════════════════

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      // Línia 1: D./Dª [Signant], en representació de [Entitat],
      const signatoryPrefix = donor.donorType === 'company' ? '' : 'D./Dª ';
      const signatoryName = organization.signatoryName || '[Representant]';
      const line1 = `${signatoryPrefix}${signatoryName}, ${t.donorDetail.certificate.inRepresentationOf} ${organization.name},`;
      const line1Wrapped = doc.splitTextToSize(line1, contentWidth);
      doc.text(line1Wrapped, margin, y);
      y += line1Wrapped.length * lineHeight;

      // Línia 2: con CIF [CIF], domicilio en [Adreça completa],
      const line2 = `${t.donorDetail.certificate.withCif} ${organization.taxId}, ${t.donorDetail.certificate.domiciledAt} ${orgFullAddress || '[Adreça]'},`;
      const line2Wrapped = doc.splitTextToSize(line2, contentWidth);
      doc.text(line2Wrapped, margin, y);
      y += line2Wrapped.length * lineHeight + 8;

      // CERTIFICA (destacat i centrat)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(t.donorDetail.certificate.certifies, pageWidth / 2, y, { align: 'center' });
      y += 12;

      // Primer paràgraf: Que [Donant] con DNI/CIF [NIF] y domicilio en [Adreça], donó...
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      // Construir adreça completa del donant (adreça + CP + ciutat)
      const donorAddressParts: string[] = [];
      if (donor.address) donorAddressParts.push(donor.address);
      const donorLocationPart = [donor.zipCode, donor.city, donor.province].filter(Boolean).join(' ');
      if (donorLocationPart) donorAddressParts.push(donorLocationPart);
      const donorAddress = donorAddressParts.length > 0 ? donorAddressParts.join(', ') : '[Domicili no informat]';
      const donationsText = yearDonations.length === 1 ? t.donorDetail.donation : t.donorDetail.donations;
      const paragraph1 = `${t.donorDetail.certificate.thatDonor} ${donor.name} ${t.donorDetail.certificate.withNifCif} ${donor.taxId} ${t.donorDetail.certificate.andDomicile} ${donorAddress}, ${t.donorDetail.certificate.donatedAmount} ${formatCurrencyEU(totalAmount)} (${yearDonations.length} ${donationsText}) ${t.donorDetail.certificate.hasDonatedYear} ${year} ${t.donorDetail.certificate.toTheEntity}`;
      const paragraph1Wrapped = doc.splitTextToSize(paragraph1, contentWidth);
      doc.text(paragraph1Wrapped, margin, y);
      y += paragraph1Wrapped.length * lineHeight + 6;

      // Segon paràgraf: Clàusula irrevocable
      const paragraph2 = t.donorDetail.certificate.irrevocableClause;
      const paragraph2Wrapped = doc.splitTextToSize(paragraph2, contentWidth);
      doc.text(paragraph2Wrapped, margin, y);
      y += paragraph2Wrapped.length * lineHeight + 6;

      // Tercer paràgraf: Y para que así conste...
      const today = new Date();
      const monthNames = Object.keys(t.months);
      const monthName = t.months[monthNames[today.getMonth()] as keyof typeof t.months];
      const cityName = organization.city || '[Ciutat]';
      const paragraph3 = `${t.donorDetail.certificate.issuedIn} ${cityName} ${t.donorDetail.certificate.issuedOn} ${today.getDate()} de ${monthName} de ${today.getFullYear()}.`;
      const paragraph3Wrapped = doc.splitTextToSize(paragraph3, contentWidth);
      doc.text(paragraph3Wrapped, margin, y);
      y += paragraph3Wrapped.length * lineHeight + 15;

      // ═══════════════════════════════════════════════════════════════════════
      // NOTA LEGAL
      // ═══════════════════════════════════════════════════════════════════════

      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      const legalText = t.donorDetail.certificate.legalNote;
      const legalLines = doc.splitTextToSize(legalText, contentWidth);
      doc.text(legalLines, margin, y);
      y += legalLines.length * 4 + 15;

      // ═══════════════════════════════════════════════════════════════════════
      // FIRMA (centrada a la dreta)
      // ═══════════════════════════════════════════════════════════════════════

      const signatureX = pageWidth - margin - 60;

      if (organization.signatureUrl) {
        const signatureBase64 = await loadImageAsBase64(organization.signatureUrl);
        if (signatureBase64) {
          doc.addImage(signatureBase64, 'PNG', signatureX, y, 50, 25);
          y += 28;
        }
      }

      if (organization.signatoryName) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(organization.signatoryName, signatureX + 25, y, { align: 'center' });
        y += 5;
      }
      if (organization.signatoryRole) {
        doc.setFont('helvetica', 'normal');
        doc.text(organization.signatoryRole, signatureX + 25, y, { align: 'center' });
      }

      // Descarregar
      const fileName = `Certificat_Anual_${year}_${donor.name.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      toast({
        title: t.donorDetail.certificate.generated,
        description: fileName,
      });
    } catch (error) {
      console.error('Error generating annual certificate:', error);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: t.donorDetail.certificate.error,
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (!donor) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              {donor.donorType === 'individual' ? (
                <User className="h-8 w-8 text-muted-foreground" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
              <div>
                <SheetTitle className="text-xl">{donor.name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2 mt-1">
                  {donor.taxId || <span className="text-amber-500">{t.donorDetail.noTaxId}</span>}
                  <span className="text-muted-foreground">·</span>
                  <Badge variant="outline">
                    {donor.donorType === 'individual' ? t.donors.types.individual : t.donors.types.company}
                  </Badge>
                </SheetDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => onEdit(donor)}>
              <Edit className="h-4 w-4 mr-1" />
              {t.common.edit}
            </Button>
          </div>

          {/* Badges de modalitat i estat */}
          <div className="flex items-center gap-2 mt-3">
            {donor.membershipType === 'recurring' ? (
              <Badge className="bg-green-100 text-green-800">
                <RefreshCw className="mr-1 h-3 w-3" />
                {t.donors.membership.recurring}
                {donor.monthlyAmount && ` (${formatCurrencyEU(donor.monthlyAmount)}/${t.donors.perMonth})`}
              </Badge>
            ) : (
              <Badge variant="secondary">{t.donors.membership.oneTime}</Badge>
            )}
            {hasCompleteData ? (
              <Badge variant="outline" className="text-green-600 border-green-300">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t.donorDetail.completeData}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                <AlertTriangle className="mr-1 h-3 w-3" />
                {t.donorDetail.incompleteData}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Missatge d'error de permisos */}
        {permissionError && (
          <div className="my-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2 text-amber-800">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p className="text-sm">{t.donorDetail.permissionError || "No s'ha pogut carregar l'historial de donacions."}</p>
          </div>
        )}

        {/* Bloc resum */}
        <div className="py-4 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {t.donorDetail.summary}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            {/* Total històric */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {t.donorDetail.totalHistoric}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrencyEU(summary.totalHistoric)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.totalHistoricCount} {summary.totalHistoricCount === 1 ? t.donorDetail.donation : t.donorDetail.donations}
                </p>
              </CardContent>
            </Card>

            {/* Any actual */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t.donorDetail.currentYear} ({currentYear})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrencyEU(summary.currentYear)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {summary.currentYearCount} {summary.currentYearCount === 1 ? t.donorDetail.donation : t.donorDetail.donations}
                </p>
              </CardContent>
            </Card>

            {/* Última donació */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <Euro className="h-3 w-3" />
                  {t.donorDetail.lastDonation}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {summary.lastDonationDate ? formatDate(summary.lastDonationDate) : '-'}
                </div>
              </CardContent>
            </Card>

            {/* Devolucions (només si n'hi ha) */}
            {summary.returns.count > 0 && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-orange-600 flex items-center gap-1">
                    <Undo2 className="h-3 w-3" />
                    {t.donorDetail.returns}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-semibold text-orange-600">
                    {summary.returns.count}
                  </div>
                  <p className="text-xs text-orange-500">
                    -{formatCurrencyEU(summary.returns.amount)}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Historial de donacions (col·lapsable) */}
        <div className="border-t pt-4">
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <div className="flex items-center justify-between">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto">
                  {isHistoryOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                  <span className="text-sm font-semibold">
                    {t.donorDetail.donationHistory}
                  </span>
                </Button>
              </CollapsibleTrigger>

              {isHistoryOpen && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={!donor.taxId}>
                      <FileText className="h-4 w-4 mr-1" />
                      {t.donorDetail.annualCertificate}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {availableYears.map(year => (
                      <DropdownMenuItem
                        key={year}
                        onClick={() => generateAnnualCertificate(year)}
                      >
                        {year}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <CollapsibleContent className="mt-4 space-y-4">
              {/* Filtres */}
              <div className="flex items-center gap-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'returns')}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t.donorDetail.filterAll}</SelectItem>
                    <SelectItem value="returns">{t.donorDetail.filterReturns}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Taula */}
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {t.donorDetail.noDonationsInPeriod}
                </div>
              ) : (
                <TooltipProvider>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t.donorDetail.date}</TableHead>
                          <TableHead>{t.donorDetail.concept}</TableHead>
                          <TableHead className="text-right">{t.donorDetail.amount}</TableHead>
                          <TableHead className="text-center">{t.donorDetail.status}</TableHead>
                          <TableHead className="text-right">{t.donorDetail.actions}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedTransactions.map((tx, index) => {
                          const isReturn = tx.transactionType === 'return';
                          const isReturned = tx.donationStatus === 'returned';

                          return (
                            <TableRow key={tx.id || `tx-${index}`} className={isReturn ? 'bg-orange-50/50' : ''}>
                              <TableCell className="text-sm">
                                {formatDate(tx.date)}
                              </TableCell>
                              <TableCell className="max-w-[150px] truncate text-sm">
                                {tx.note || tx.description}
                              </TableCell>
                              <TableCell className={`text-right font-mono ${isReturn ? 'text-orange-600' : 'text-green-600'}`}>
                                {isReturn && <Undo2 className="inline h-3 w-3 mr-1" />}
                                {formatCurrencyEU(tx.amount)}
                              </TableCell>
                              <TableCell className="text-center">
                                {isReturn ? (
                                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                                    {t.donorDetail.returnBadge}
                                  </Badge>
                                ) : isReturned ? (
                                  <Badge variant="outline" className="text-red-600 border-red-300">
                                    {t.donorDetail.returnedBadge}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-green-600 border-green-300">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    OK
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                {!isReturn && !isReturned && (
                                  donor.taxId ? (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => generateCertificate(tx)}
                                      disabled={isGeneratingPdf}
                                    >
                                      {isGeneratingPdf ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <FileText className="h-4 w-4" />
                                      )}
                                    </Button>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled
                                          >
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {t.donorDetail.certificate.needsTaxId}
                                      </TooltipContent>
                                    </Tooltip>
                                  )
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginació */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <p className="text-sm text-muted-foreground">
                        {t.donorDetail.showing} {(currentPage - 1) * itemsPerPage + 1}-
                        {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} {t.donorDetail.of} {filteredTransactions.length}
                      </p>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          {t.donorDetail.previous}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          {t.donorDetail.next}
                        </Button>
                      </div>
                    </div>
                  )}
                </TooltipProvider>
              )}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </SheetContent>
    </Sheet>
  );
}
