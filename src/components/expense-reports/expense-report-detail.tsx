'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  CalendarIcon,
  Plus,
  Trash2,
  Car,
  Receipt,
  User,
  Loader2,
  Check,
  FileText,
  Download,
  ExternalLink,
  RefreshCw,
  CreditCard,
  AlertCircle,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ca } from 'date-fns/locale';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import Link from 'next/link';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, and, doc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import { formatCurrencyEU } from '@/lib/normalize';
import {
  updateExpenseReport,
  generateExpenseReportPdf,
  generateSepaReimbursement,
  resolveBeneficiary,
  type ExpenseReport,
  type ExpenseReportBeneficiary,
  type ExpenseReportMileage,
  type PdfLabels,
} from '@/lib/expense-reports';
import {
  updatePendingDocument,
  type PendingDocument,
} from '@/lib/pending-documents';
import type { Contact, Category, Organization, BankAccount } from '@/lib/data';
import { CATEGORY_TRANSLATION_KEYS } from '@/lib/default-data';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface ExpenseReportDetailProps {
  report: ExpenseReport;
  onClose: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const categoryTranslations = CATEGORY_TRANSLATION_KEYS as Record<string, string>;

function getCategoryName(categoryId: string | null, categories: Category[]): string {
  if (!categoryId) return '';
  const category = categories.find((c) => c.id === categoryId);
  if (!category) return '';
  return categoryTranslations[category.name] || category.name;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ExpenseReportDetail({ report, onClose }: ExpenseReportDetailProps) {
  const { organizationId, organization } = useCurrentOrganization();
  const { firestore, storage } = useFirebase();
  const { buildUrl } = useOrgUrl();
  const { toast } = useToast();
  const { t } = useTranslations();

  // Estat local
  const [title, setTitle] = React.useState(report.title || '');
  const [dateFrom, setDateFrom] = React.useState<Date | undefined>(
    report.dateFrom ? parseISO(report.dateFrom) : undefined
  );
  const [dateTo, setDateTo] = React.useState<Date | undefined>(
    report.dateTo ? parseISO(report.dateTo) : undefined
  );
  const [location, setLocation] = React.useState(report.location || '');
  const [notes, setNotes] = React.useState(report.notes || '');
  const [beneficiary, setBeneficiary] = React.useState<ExpenseReportBeneficiary | null>(
    report.beneficiary
  );
  const [mileage, setMileage] = React.useState<ExpenseReportMileage | null>(report.mileage);
  const [receiptDocIds, setReceiptDocIds] = React.useState<string[]>(report.receiptDocIds);

  // Modal de tiquets
  const [isReceiptsModalOpen, setIsReceiptsModalOpen] = React.useState(false);

  // Carregant
  const [isSaving, setIsSaving] = React.useState(false);

  // PDF
  const [isGeneratingPdf, setIsGeneratingPdf] = React.useState(false);
  const [generatedPdfUrl, setGeneratedPdfUrl] = React.useState<string | null>(null);

  // SEPA
  const [isSepaModalOpen, setIsSepaModalOpen] = React.useState(false);
  const [isGeneratingSepa, setIsGeneratingSepa] = React.useState(false);
  const [sepaDownloadUrl, setSepaDownloadUrl] = React.useState<string | null>(null);

  // Inicialitzar URL del PDF si ja existeix
  React.useEffect(() => {
    if (report.generatedPdf?.storagePath && storage && !generatedPdfUrl) {
      const storageRef = ref(storage, report.generatedPdf.storagePath);
      getDownloadURL(storageRef)
        .then((url) => setGeneratedPdfUrl(url))
        .catch(() => setGeneratedPdfUrl(null));
    }
  }, [report.generatedPdf, storage, generatedPdfUrl]);

  // Tarifa per defecte
  const defaultKmRate = organization?.features?.expenseReports?.kmRateDefault ?? 0.19;

  // Carrega contactes (employees + contacts)
  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  // Carrega categories
  const categoriesQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  // Carrega tiquets disponibles (receipts confirmats sense reportId)
  const availableReceiptsQuery = useMemoFirebase(
    () => {
      if (!organizationId) return null;
      return query(
        collection(firestore, 'organizations', organizationId, 'pendingDocuments'),
        and(
          where('type', '==', 'receipt'),
          where('status', '==', 'confirmed'),
          where('reportId', '==', null)
        )
      );
    },
    [firestore, organizationId]
  );
  const { data: availableReceipts } = useCollection<PendingDocument>(availableReceiptsQuery);

  // Carrega tiquets assignats a aquesta liquidació
  const assignedReceiptsQuery = useMemoFirebase(
    () => {
      if (!organizationId || receiptDocIds.length === 0) return null;
      return query(
        collection(firestore, 'organizations', organizationId, 'pendingDocuments'),
        where('reportId', '==', report.id)
      );
    },
    [firestore, organizationId, report.id, receiptDocIds.length]
  );
  const { data: assignedReceipts } = useCollection<PendingDocument>(assignedReceiptsQuery);

  // Carrega comptes bancaris
  const bankAccountsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'bankAccounts') : null,
    [firestore, organizationId]
  );
  const { data: bankAccounts } = useCollection<BankAccount>(bankAccountsQuery);

  // Comptes actius amb IBAN
  const activeBankAccounts = React.useMemo(() =>
    (bankAccounts || []).filter((ba) => ba.isActive !== false && ba.iban),
    [bankAccounts]
  );

  // Employees
  const employees = React.useMemo(() =>
    (contacts || []).filter((c) => c.type === 'employee' || c.roles?.employee),
    [contacts]
  );

  // Categories de despesa
  const expenseCategories = React.useMemo(() =>
    (categories || []).filter((c) => c.type === 'expense'),
    [categories]
  );

  // Calcular total
  const receiptsTotal = React.useMemo(() => {
    if (!assignedReceipts) return 0;
    return assignedReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);
  }, [assignedReceipts]);

  const mileageTotal = React.useMemo(() => {
    if (!mileage?.km || !mileage?.rateEurPerKm) return 0;
    return mileage.km * mileage.rateEurPerKm;
  }, [mileage]);

  const totalAmount = receiptsTotal + mileageTotal;

  // Resolució beneficiari per SEPA
  const resolvedBeneficiary = React.useMemo(() => {
    if (!beneficiary || !contacts) return null;
    // Construir un report temporal per usar resolveBeneficiary
    const tempReport = { ...report, beneficiary } as ExpenseReport;
    return resolveBeneficiary(tempReport, contacts);
  }, [beneficiary, contacts, report]);

  // Validació per generar SEPA
  const canGenerateSepa = React.useMemo(() => {
    // Ja té SEPA generat
    if (report.sepa) return false;
    // Cal PDF generat primer
    if (!report.generatedPdf) return false;
    // Cal total > 0
    if (totalAmount <= 0) return false;
    // Cal beneficiari amb IBAN resolt
    if (!resolvedBeneficiary) return false;
    // Cal almenys un compte bancari
    if (activeBankAccounts.length === 0) return false;
    return true;
  }, [report.sepa, report.generatedPdf, totalAmount, resolvedBeneficiary, activeBankAccounts]);

  // Guardar canvis
  const handleSave = async () => {
    if (!organizationId || !firestore) return;

    setIsSaving(true);
    try {
      await updateExpenseReport(firestore, organizationId, report.id, {
        title: title || null,
        dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
        dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : null,
        location: location || null,
        notes: notes || null,
        beneficiary,
        mileage: mileage ? {
          ...mileage,
          amount: mileage.km && mileage.rateEurPerKm ? mileage.km * mileage.rateEurPerKm : null,
        } : null,
        receiptDocIds,
        totalAmount,
      });
      toast({ title: t.expenseReports.detail.saved });
      onClose();
    } catch (error) {
      console.error('[handleSave] Error:', error);
      toast({
        title: t.common.error,
        description: t.expenseReports.detail.errorSave,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Afegir tiquets seleccionats
  const handleAddReceipts = async (selectedIds: string[]) => {
    if (!organizationId || !firestore) return;

    try {
      // Actualitzar cada pendingDocument amb el reportId
      for (const docId of selectedIds) {
        await updatePendingDocument(firestore, organizationId, docId, {
          reportId: report.id,
        });
      }
      setReceiptDocIds((prev) => [...prev, ...selectedIds]);
      setIsReceiptsModalOpen(false);
      toast({ title: t.expenseReports.detail.receiptsAdded({ count: selectedIds.length }) });
    } catch (error) {
      console.error('[handleAddReceipts] Error:', error);
      toast({
        title: t.common.error,
        description: t.expenseReports.detail.errorAddReceipts,
        variant: 'destructive',
      });
    }
  };

  // Treure tiquet
  const handleRemoveReceipt = async (docId: string) => {
    if (!organizationId || !firestore) return;

    try {
      await updatePendingDocument(firestore, organizationId, docId, {
        reportId: null,
      });
      setReceiptDocIds((prev) => prev.filter((id) => id !== docId));
      toast({ title: t.expenseReports.detail.receiptRemoved });
    } catch (error) {
      console.error('[handleRemoveReceipt] Error:', error);
    }
  };

  // Trobar el contacte beneficiari
  const beneficiaryContact = React.useMemo(() => {
    if (!beneficiary || !contacts) return null;
    if (beneficiary.kind === 'employee') {
      return contacts.find((c) => c.id === beneficiary.employeeId) ?? null;
    }
    if (beneficiary.kind === 'contact') {
      return contacts.find((c) => c.id === beneficiary.contactId) ?? null;
    }
    return null;
  }, [beneficiary, contacts]);

  // Validació per generar PDF
  const canGeneratePdf = React.useMemo(() => {
    if (!beneficiary) return false;
    if (totalAmount === 0) return false;
    return true;
  }, [beneficiary, totalAmount]);

  // Generar PDF
  const handleGeneratePdf = async () => {
    if (!organizationId || !firestore || !storage || !organization) return;
    if (!canGeneratePdf) return;

    setIsGeneratingPdf(true);
    try {
      // Construir el report actual amb les dades locals
      const currentReport: ExpenseReport = {
        ...report,
        title: title || null,
        dateFrom: dateFrom ? format(dateFrom, 'yyyy-MM-dd') : null,
        dateTo: dateTo ? format(dateTo, 'yyyy-MM-dd') : null,
        beneficiary,
        mileage: mileage ? {
          ...mileage,
          amount: mileage.km && mileage.rateEurPerKm ? mileage.km * mileage.rateEurPerKm : null,
        } : null,
        totalAmount,
      };

      // Construir labels traduïts per al PDF
      const pdfLabels: PdfLabels = t.expenseReports.pdf;

      // Generar PDF
      const { blob, filename } = generateExpenseReportPdf({
        report: currentReport,
        receipts: assignedReceipts || [],
        organization: organization as Organization,
        beneficiaryContact,
        categories: categories || [],
        labels: pdfLabels,
      });

      // Pujar a Storage
      const storagePath = `organizations/${organizationId}/expenseReports/${report.id}/${filename}`;
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, blob, { contentType: 'application/pdf' });

      // Obtenir URL
      const downloadUrl = await getDownloadURL(storageRef);
      setGeneratedPdfUrl(downloadUrl);

      // Actualitzar Firestore
      await updateExpenseReport(firestore, organizationId, report.id, {
        generatedPdf: {
          storagePath,
          filename,
          createdAt: Timestamp.now(),
        },
      });

      toast({ title: t.expenseReports.detail.pdfGenerated });
    } catch (error) {
      console.error('[handleGeneratePdf] Error:', error);
      toast({
        title: t.common.error,
        description: t.expenseReports.detail.errorGeneratePdf,
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Descarregar PDF
  const handleDownloadPdf = () => {
    if (!generatedPdfUrl) return;
    const link = document.createElement('a');
    link.href = generatedPdfUrl;
    link.download = report.generatedPdf?.filename || `liquidacio_${report.id}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Beneficiari */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.expenseReports.detail.beneficiary}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={beneficiary?.kind || ''}
            onValueChange={(kind) => {
              if (kind === 'employee') {
                setBeneficiary({ kind: 'employee', employeeId: '' });
              } else if (kind === 'contact') {
                setBeneficiary({ kind: 'contact', contactId: '' });
              } else if (kind === 'manual') {
                setBeneficiary({ kind: 'manual', name: '', iban: '' });
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t.expenseReports.detail.selectType} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="employee">{t.expenseReports.detail.employee}</SelectItem>
              <SelectItem value="contact">{t.expenseReports.detail.contact}</SelectItem>
              <SelectItem value="manual">{t.expenseReports.detail.manual}</SelectItem>
            </SelectContent>
          </Select>

          {beneficiary?.kind === 'employee' && (
            <Select
              value={beneficiary.employeeId}
              onValueChange={(id) => setBeneficiary({ kind: 'employee', employeeId: id })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.expenseReports.detail.selectEmployee} />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {beneficiary?.kind === 'manual' && (
            <div className="space-y-2">
              <Input
                placeholder={t.expenseReports.detail.fullName}
                value={beneficiary.name}
                onChange={(e) => setBeneficiary({ ...beneficiary, name: e.target.value })}
              />
              <Input
                placeholder={t.expenseReports.detail.iban}
                value={beneficiary.iban}
                onChange={(e) => setBeneficiary({ ...beneficiary, iban: e.target.value })}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dades bàsiques */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t.expenseReports.detail.data}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>{t.expenseReports.detail.reasonTrip}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.expenseReports.detail.reasonPlaceholder}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t.expenseReports.detail.dateStart}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start', !dateFrom && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : t.expenseReports.detail.selectDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    locale={ca}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>{t.expenseReports.detail.dateEnd}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn('w-full justify-start', !dateTo && 'text-muted-foreground')}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, 'dd/MM/yyyy') : t.expenseReports.detail.selectDate}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    locale={ca}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div>
            <Label>{t.expenseReports.detail.notes}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.expenseReports.detail.notesPlaceholder}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tiquets */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {t.expenseReports.detail.receipts}
            </CardTitle>
            <Button size="sm" variant="outline" onClick={() => setIsReceiptsModalOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t.expenseReports.detail.add}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {assignedReceipts && assignedReceipts.length > 0 ? (
            <div className="space-y-2">
              {assignedReceipts.map((receipt) => (
                <div key={receipt.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{receipt.file.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {receipt.invoiceDate} · {getCategoryName(receipt.categoryId, categories || [])}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium mr-2">{formatCurrencyEU(receipt.amount || 0)}</span>
                    {receipt.file.url && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        asChild
                      >
                        <a href={receipt.file.url} target="_blank" rel="noopener noreferrer" title={t.expenseReports.detail.viewFile}>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleRemoveReceipt(receipt.id)}
                      title={t.expenseReports.detail.removeFromReport}
                    >
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2 font-medium">
                <span>{t.expenseReports.detail.subtotalReceipts}</span>
                <span>{formatCurrencyEU(receiptsTotal)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              {t.expenseReports.detail.noReceipts}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quilometratge */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="h-4 w-4" />
            {t.expenseReports.detail.mileage}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>{t.expenseReports.detail.km}</Label>
              <Input
                type="number"
                placeholder="0"
                value={mileage?.km || ''}
                onChange={(e) => setMileage({
                  ...mileage,
                  km: e.target.value ? parseFloat(e.target.value) : null,
                  rateEurPerKm: mileage?.rateEurPerKm ?? defaultKmRate,
                  amount: null,
                  description: mileage?.description ?? null,
                  categoryId: mileage?.categoryId ?? null,
                })}
              />
            </div>
            <div>
              <Label>{t.expenseReports.detail.rate} ({t.expenseReports.detail.rateUnit})</Label>
              <Input
                type="number"
                step="0.01"
                placeholder={defaultKmRate.toString()}
                value={mileage?.rateEurPerKm || ''}
                onChange={(e) => setMileage({
                  ...mileage,
                  km: mileage?.km ?? null,
                  rateEurPerKm: e.target.value ? parseFloat(e.target.value) : null,
                  amount: null,
                  description: mileage?.description ?? null,
                  categoryId: mileage?.categoryId ?? null,
                })}
              />
            </div>
            <div>
              <Label>{t.expenseReports.detail.amount}</Label>
              <Input
                type="text"
                value={mileageTotal > 0 ? formatCurrencyEU(mileageTotal) : '—'}
                disabled
                className="bg-muted"
              />
            </div>
          </div>
          <div>
            <Label>{t.expenseReports.detail.routeDescription}</Label>
            <Input
              placeholder={t.expenseReports.detail.routePlaceholder}
              value={mileage?.description || ''}
              onChange={(e) => setMileage({
                ...mileage,
                km: mileage?.km ?? null,
                rateEurPerKm: mileage?.rateEurPerKm ?? defaultKmRate,
                amount: null,
                description: e.target.value || null,
                categoryId: mileage?.categoryId ?? null,
              })}
            />
          </div>
          <div>
            <Label>{t.expenseReports.detail.category}</Label>
            <Select
              value={mileage?.categoryId || ''}
              onValueChange={(id) => setMileage({
                ...mileage,
                km: mileage?.km ?? null,
                rateEurPerKm: mileage?.rateEurPerKm ?? defaultKmRate,
                amount: null,
                description: mileage?.description ?? null,
                categoryId: id || null,
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.expenseReports.detail.selectCategory} />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {categoryTranslations[cat.name] || cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Total */}
      <Card className="bg-muted/50">
        <CardContent className="py-4">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>{t.expenseReports.detail.totalReport}</span>
            <span>{formatCurrencyEU(totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {/* PDF */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t.expenseReports.detail.pdfDocument}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {generatedPdfUrl ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {t.expenseReports.detail.downloadPdf}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf || !canGeneratePdf}
                  title={t.expenseReports.detail.regenerate}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t.expenseReports.detail.regenerate}
                </Button>
                <span className="text-xs text-muted-foreground ml-2">
                  {t.expenseReports.detail.generated}: {report.generatedPdf?.createdAt?.toDate?.()?.toLocaleDateString('ca-ES') ?? '—'}
                </span>
              </>
            ) : (
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePdf}
                  disabled={isGeneratingPdf || !canGeneratePdf}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {isGeneratingPdf ? t.expenseReports.detail.generating : t.expenseReports.detail.generatePdf}
                </Button>
                <p className="text-xs text-muted-foreground">
                  {t.expenseReports.detail.pdfDescription}
                </p>
              </div>
            )}
          </div>
          {!canGeneratePdf && !generatedPdfUrl && (
            <p className="text-xs text-amber-600">
              {t.expenseReports.detail.cannotGeneratePdf}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Conciliació - només si està matched */}
      {report.matchedTransactionId && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-4 w-4" />
              {t.expenseReports.detail.reconciliation}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-green-700">
                {t.expenseReports.detail.reconciliationMatched}
              </p>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="border-green-300 text-green-700 hover:bg-green-50"
              >
                <Link href={buildUrl(`/dashboard/movimientos?transactionId=${report.matchedTransactionId}`)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {t.expenseReports.detail.viewMatchedMovement}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SEPA Reemborsament */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t.expenseReports.detail.sepaReimbursement}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {report.sepa ? (
            // Ja té SEPA generat
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-blue-50 text-blue-700">{t.expenseReports.detail.sepaGenerated}</Badge>
                <span className="text-xs text-muted-foreground">
                  {t.expenseReports.detail.sepaRef}: {report.sepa.endToEndId}
                </span>
              </div>
              {sepaDownloadUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={sepaDownloadUrl} download>
                    <Download className="mr-2 h-4 w-4" />
                    {t.expenseReports.detail.downloadXml}
                  </a>
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                {t.expenseReports.detail.expectedExecutionDate}: {report.payment?.executionDate ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.expenseReports.detail.sepaWillReconcile}
              </p>
            </div>
          ) : (
            // Pot generar SEPA
            <div className="space-y-3">
              {canGenerateSepa ? (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsSepaModalOpen(true)}
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    {t.expenseReports.detail.generateSepaReimbursement}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {t.expenseReports.detail.sepaDescription}
                  </p>
                </div>
              ) : (
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground font-medium">{t.expenseReports.detail.cannotGeneratePayment}</p>
                  {!report.generatedPdf && (
                    <p className="text-amber-600 text-xs">· {t.expenseReports.detail.needPdfFirst}</p>
                  )}
                  {totalAmount <= 0 && (
                    <p className="text-amber-600 text-xs">· {t.expenseReports.detail.addReceiptsOrMileage}</p>
                  )}
                  {!resolvedBeneficiary && (
                    <p className="text-amber-600 text-xs">· {t.expenseReports.detail.beneficiaryNoIban}</p>
                  )}
                  {activeBankAccounts.length === 0 && (
                    <p className="text-amber-600 text-xs">· {t.expenseReports.detail.configureBankAccount}</p>
                  )}
                </div>
              )}
              <Alert variant="default" className="bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t.expenseReports.detail.sepaOnlyFile}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Accions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t.expenseReports.detail.cancel}
        </Button>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          {t.expenseReports.detail.save}
        </Button>
      </div>

      {/* Modal afegir tiquets */}
      <AddReceiptsModal
        open={isReceiptsModalOpen}
        onClose={() => setIsReceiptsModalOpen(false)}
        availableReceipts={availableReceipts || []}
        onAdd={handleAddReceipts}
        categories={categories || []}
      />

      {/* Modal SEPA reemborsament */}
      <GenerateSepaModal
        open={isSepaModalOpen}
        onClose={() => setIsSepaModalOpen(false)}
        report={report}
        organization={organization as Organization}
        beneficiaryName={resolvedBeneficiary?.name ?? ''}
        beneficiaryIban={resolvedBeneficiary?.iban ?? ''}
        totalAmount={totalAmount}
        bankAccounts={activeBankAccounts}
        isGenerating={isGeneratingSepa}
        onGenerate={async (bankAccountId, executionDate) => {
          if (!organizationId || !firestore || !storage || !organization || !resolvedBeneficiary) return;

          const bankAccount = activeBankAccounts.find((ba) => ba.id === bankAccountId);
          if (!bankAccount) return;

          setIsGeneratingSepa(true);
          try {
            const result = await generateSepaReimbursement(
              firestore,
              storage,
              organizationId,
              {
                report: { ...report, totalAmount },
                bankAccount,
                executionDate,
                debtorName: organization.name,
                beneficiaryName: resolvedBeneficiary.name,
                beneficiaryIban: resolvedBeneficiary.iban,
              }
            );
            setSepaDownloadUrl(result.downloadUrl);
            setIsSepaModalOpen(false);
            toast({ title: t.expenseReports.detail.sepaGeneratedToast });
          } catch (error) {
            console.error('[handleGenerateSepa] Error:', error);
            toast({
              title: t.common.error,
              description: error instanceof Error ? error.message : t.expenseReports.detail.errorGenerateSepa,
              variant: 'destructive',
            });
          } finally {
            setIsGeneratingSepa(false);
          }
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL AFEGIR TIQUETS
// ═══════════════════════════════════════════════════════════════════════════

interface AddReceiptsModalProps {
  open: boolean;
  onClose: () => void;
  availableReceipts: PendingDocument[];
  onAdd: (selectedIds: string[]) => void;
  categories: Category[];
}

function AddReceiptsModal({ open, onClose, availableReceipts, onAdd, categories }: AddReceiptsModalProps) {
  const { t } = useTranslations();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const handleToggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAdd = () => {
    onAdd(Array.from(selected));
    setSelected(new Set());
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.expenseReports.detail.addReceiptsTitle}</DialogTitle>
          <DialogDescription>
            {t.expenseReports.detail.addReceiptsDesc}
          </DialogDescription>
        </DialogHeader>

        {availableReceipts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t.expenseReports.detail.noReceiptsAvailable}
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {availableReceipts.map((receipt) => (
              <div
                key={receipt.id}
                className={cn(
                  'flex items-center gap-3 p-3 border rounded-lg cursor-pointer',
                  selected.has(receipt.id) && 'border-primary bg-primary/5'
                )}
                onClick={() => handleToggle(receipt.id)}
              >
                <Checkbox checked={selected.has(receipt.id)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{receipt.file.filename}</p>
                  <p className="text-xs text-muted-foreground">
                    {receipt.invoiceDate} · {getCategoryName(receipt.categoryId, categories)}
                  </p>
                </div>
                <span className="font-medium">{formatCurrencyEU(receipt.amount || 0)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>{t.common.cancel}</Button>
          <Button onClick={handleAdd} disabled={selected.size === 0}>
            {t.expenseReports.detail.addCount({ count: selected.size })}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MODAL GENERAR SEPA
// ═══════════════════════════════════════════════════════════════════════════

interface GenerateSepaModalProps {
  open: boolean;
  onClose: () => void;
  report: ExpenseReport;
  organization: Organization;
  beneficiaryName: string;
  beneficiaryIban: string;
  totalAmount: number;
  bankAccounts: BankAccount[];
  isGenerating: boolean;
  onGenerate: (bankAccountId: string, executionDate: string) => void;
}

function GenerateSepaModal({
  open,
  onClose,
  organization,
  beneficiaryName,
  beneficiaryIban,
  totalAmount,
  bankAccounts,
  isGenerating,
  onGenerate,
}: GenerateSepaModalProps) {
  const { t } = useTranslations();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [selectedBankAccountId, setSelectedBankAccountId] = React.useState<string>(
    bankAccounts.find((ba) => ba.isDefault)?.id || bankAccounts[0]?.id || ''
  );
  const [executionDate, setExecutionDate] = React.useState<Date>(new Date());

  // Reset quan s'obre el modal
  React.useEffect(() => {
    if (open) {
      setSelectedBankAccountId(bankAccounts.find((ba) => ba.isDefault)?.id || bankAccounts[0]?.id || '');
      setExecutionDate(new Date());
    }
  }, [open, bankAccounts]);

  const selectedBankAccount = bankAccounts.find((ba) => ba.id === selectedBankAccountId);

  const handleGenerate = () => {
    if (!selectedBankAccountId) return;
    onGenerate(selectedBankAccountId, format(executionDate, 'yyyy-MM-dd'));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t.expenseReports.detail.generateSepaTitle}</DialogTitle>
          <DialogDescription>
            {t.expenseReports.detail.sepaModalDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resum */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.expenseReports.detail.beneficiaryLabel}</span>
              <span className="font-medium">{beneficiaryName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.expenseReports.detail.ibanLabel}</span>
              <span className="font-mono text-xs">{beneficiaryIban}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{t.expenseReports.detail.amountLabel}</span>
              <span className="font-semibold">{formatCurrencyEU(totalAmount)}</span>
            </div>
          </div>

          {/* Compte emissor */}
          <div className="space-y-2">
            <Label>{t.expenseReports.detail.emitterAccount}</Label>
            <Select
              value={selectedBankAccountId}
              onValueChange={setSelectedBankAccountId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t.expenseReports.detail.selectAccount} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((ba) => (
                  <SelectItem key={ba.id} value={ba.id}>
                    {ba.name} {ba.isDefault && t.expenseReports.detail.defaultAccount}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBankAccount?.iban && (
              <p className="text-xs text-muted-foreground font-mono">
                {selectedBankAccount.iban}
              </p>
            )}
          </div>

          {/* Data execució */}
          <div className="space-y-2">
            <Label>{t.expenseReports.detail.executionDate}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(executionDate, 'dd/MM/yyyy')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={executionDate}
                  onSelect={(date) => date && setExecutionDate(date)}
                  locale={ca}
                  disabled={(date) => date < new Date(today)}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Avís tranquil·litzador */}
          <Alert variant="default" className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-xs text-blue-800">
              {t.expenseReports.detail.sepaWarning}
            </AlertDescription>
          </Alert>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            {t.common.cancel}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedBankAccountId}
          >
            {isGenerating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CreditCard className="mr-2 h-4 w-4" />
            )}
            {isGenerating ? t.common.generating : t.expenseReports.detail.generateSepa}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
