'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Download,
  ArrowRight,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Supplier, SupplierCategory } from '@/lib/data';
import { SUPPLIER_CATEGORIES } from '@/lib/data';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

type ColumnMapping = {
  name: string | null;
  taxId: string | null;
  zipCode: string | null;
  category: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  iban: string | null;
  paymentTerms: string | null;
};

type ImportRow = {
  rowIndex: number;
  data: Record<string, any>;
  parsed: Partial<Supplier>;
  status: 'valid' | 'duplicate' | 'invalid';
  error?: string;
};

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIRED_FIELDS = ['name', 'taxId'] as const;

const emptyMapping: ColumnMapping = {
  name: null,
  taxId: null,
  zipCode: null,
  category: null,
  address: null,
  email: null,
  phone: null,
  iban: null,
  paymentTerms: null,
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function toTitleCase(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .split(' ')
    .map(word => {
      if (word.length === 0) return '';
      const prepositions = ['de', 'del', 'la', 'las', 'los', 'el', 'y', 'e', 'i', 'sl', 'sa', 'slu', 'sll'];
      if (prepositions.includes(word)) return word.toUpperCase() === 'SL' || word.toUpperCase() === 'SA' || word.toUpperCase() === 'SLU' || word.toUpperCase() === 'SLL' ? word.toUpperCase() : word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function autoDetectColumn(header: string): keyof ColumnMapping | null {
  const normalized = normalizeText(header);
  
  const patterns: Record<keyof ColumnMapping, string[]> = {
    name: ['nom', 'nombre', 'name', 'raosocial', 'denominacio', 'empresa', 'proveidor'],
    taxId: ['cif', 'nif', 'dni', 'taxid', 'documento', 'identificacio'],
    zipCode: ['cp', 'codipostal', 'codigopostal', 'zipcode', 'postal'],
    category: ['categoria', 'category', 'tipo', 'tipus'],
    address: ['adreca', 'direccion', 'address', 'domicili'],
    email: ['email', 'correu', 'correo', 'mail'],
    phone: ['telefon', 'telefono', 'phone', 'mobil', 'movil'],
    iban: ['iban', 'compte', 'cuenta', 'banc', 'banco', 'cc'],
    paymentTerms: ['pagament', 'pago', 'payment', 'condicions', 'condiciones', 'venciment'],
  };

  for (const [field, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return field as keyof ColumnMapping;
    }
  }
  return null;
}

function parseCategory(value: any): SupplierCategory | undefined {
  if (!value) return undefined;
  const normalized = normalizeText(String(value));
  
  const categoryMap: Record<string, SupplierCategory> = {
    'serveis': 'services',
    'services': 'services',
    'professional': 'services',
    'subministraments': 'utilities',
    'utilities': 'utilities',
    'llum': 'utilities',
    'aigua': 'utilities',
    'gas': 'utilities',
    'materials': 'materials',
    'equipament': 'materials',
    'lloguer': 'rent',
    'rent': 'rent',
    'alquiler': 'rent',
    'assegurances': 'insurance',
    'insurance': 'insurance',
    'seguros': 'insurance',
    'banc': 'banking',
    'banking': 'banking',
    'banco': 'banking',
    'comunicacions': 'communications',
    'communications': 'communications',
    'telefon': 'communications',
    'internet': 'communications',
    'transport': 'transport',
    'missatgeria': 'transport',
    'manteniment': 'maintenance',
    'maintenance': 'maintenance',
    'altres': 'other',
    'other': 'other',
    'otros': 'other',
  };

  for (const [key, cat] of Object.entries(categoryMap)) {
    if (normalized.includes(key)) {
      return cat;
    }
  }
  return undefined;
}

function cleanTaxId(value: any): string {
  if (!value) return '';
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function cleanIban(value: any): string {
  if (!value) return '';
  return String(value).toUpperCase().replace(/\s/g, '');
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

interface SupplierImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (count: number) => void;
}

export function SupplierImporter({
  open,
  onOpenChange,
  onImportComplete,
}: SupplierImporterProps) {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();
  const { t } = useTranslations();

  const [step, setStep] = React.useState<ImportStep>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rawData, setRawData] = React.useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>(emptyMapping);
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importedCount, setImportedCount] = React.useState(0);
  const [existingIds, setExistingIds] = React.useState<Set<string>>(new Set());

  const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
    name: t.importers.supplier.fields.name,
    taxId: t.importers.supplier.fields.cif,
    zipCode: t.importers.supplier.fields.zipCode,
    category: t.importers.supplier.fields.category,
    address: t.importers.supplier.fields.address,
    email: t.importers.supplier.fields.email,
    phone: t.importers.supplier.fields.phone,
    iban: t.importers.supplier.fields.iban,
    paymentTerms: t.importers.supplier.fields.paymentTerms,
  };

  const CATEGORY_LABELS: Record<SupplierCategory, string> = {
    services: t.importers.supplier.categories.professional,
    utilities: t.importers.supplier.categories.supplies,
    materials: t.importers.supplier.categories.materials,
    rent: t.importers.supplier.categories.rent,
    insurance: t.importers.supplier.categories.insurance,
    banking: t.importers.supplier.categories.banking,
    communications: t.importers.supplier.categories.telecom,
    transport: t.importers.supplier.categories.transport,
    maintenance: t.importers.supplier.categories.maintenance,
    other: t.importers.supplier.categories.other,
  };

  // Reset quan es tanca
  React.useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep('upload');
        setFile(null);
        setHeaders([]);
        setRawData([]);
        setMapping(emptyMapping);
        setImportRows([]);
        setImportProgress(0);
        setImportedCount(0);
      }, 300);
    }
  }, [open]);

  // Carregar CIFs existents quan s'obre
  React.useEffect(() => {
    if (open && organizationId && firestore) {
      loadExistingTaxIds();
    }
  }, [open, organizationId, firestore]);

  const loadExistingTaxIds = async () => {
    if (!organizationId || !firestore) return;
    try {
      const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
      const q = query(contactsRef, where('type', '==', 'supplier'));
      const snapshot = await getDocs(q);
      const ids = new Set<string>();
      snapshot.forEach(doc => {
        const data = doc.data();
        if (data.taxId) {
          ids.add(cleanTaxId(data.taxId));
        }
      });
      setExistingIds(ids);
    } catch (error) {
      console.error('Error carregant CIFs existents:', error);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { defval: '' });

      if (jsonData.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: t.importers.common.emptyFile });
        return;
      }

      const detectedHeaders = Object.keys(jsonData[0]);
      setHeaders(detectedHeaders);
      setRawData(jsonData);

      // Auto-detectar mapejat
      const autoMapping: ColumnMapping = { ...emptyMapping };
      const usedHeaders = new Set<string>();
      
      for (const header of detectedHeaders) {
        const field = autoDetectColumn(header);
        if (field && !autoMapping[field] && !usedHeaders.has(header)) {
          autoMapping[field] = header;
          usedHeaders.add(header);
        }
      }
      setMapping(autoMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Error llegint fitxer:', error);
      toast({ variant: 'destructive', title: 'Error', description: t.importers.common.cannotReadFile });
    }
  };

  const handleMappingChange = (field: keyof ColumnMapping, value: string | null) => {
    setMapping(prev => ({ ...prev, [field]: value === '__none__' ? null : value }));
  };

  const processData = () => {
    const rows: ImportRow[] = rawData.map((row, index) => {
      const parsed: Partial<Supplier> = {
        type: 'supplier',
        name: mapping.name ? toTitleCase(String(row[mapping.name] || '')) : '',
        taxId: mapping.taxId ? cleanTaxId(row[mapping.taxId]) : '',
        zipCode: mapping.zipCode ? String(row[mapping.zipCode] || '').trim() : '',
        category: mapping.category ? parseCategory(row[mapping.category]) : undefined,
        address: mapping.address ? String(row[mapping.address] || '').trim() : undefined,
        email: mapping.email ? String(row[mapping.email] || '').trim() : undefined,
        phone: mapping.phone ? String(row[mapping.phone] || '').trim() : undefined,
        iban: mapping.iban ? cleanIban(row[mapping.iban]) : undefined,
        paymentTerms: mapping.paymentTerms ? String(row[mapping.paymentTerms] || '').trim() : undefined,
      };

      let status: ImportRow['status'] = 'valid';
      let error: string | undefined;

      if (!parsed.name) {
        status = 'invalid';
        error = t.importers.supplier.errors.missingName;
      } else if (!parsed.taxId) {
        status = 'invalid';
        error = t.importers.supplier.errors.missingCif;
      } else if (existingIds.has(parsed.taxId)) {
        status = 'duplicate';
        error = t.importers.common.alreadyExists;
      }

      return { rowIndex: index + 2, data: row, parsed, status, error };
    });

    // Detectar duplicats interns
    const seenTaxIds = new Set<string>();
    for (const row of rows) {
      if (row.status === 'valid' && row.parsed.taxId) {
        if (seenTaxIds.has(row.parsed.taxId)) {
          row.status = 'duplicate';
          row.error = t.importers.common.duplicateInFile;
        } else {
          seenTaxIds.add(row.parsed.taxId);
        }
      }
    }

    setImportRows(rows);
    setStep('preview');
  };

  const executeImport = async () => {
    if (!organizationId || !firestore) return;

    setStep('importing');
    setImportProgress(0);

    const validRows = importRows.filter(r => r.status === 'valid');
    const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
    const now = new Date().toISOString();
    
    let imported = 0;
    const batchSize = 50;
    const batches = Math.ceil(validRows.length / batchSize);

    try {
      for (let i = 0; i < batches; i++) {
        const batch = writeBatch(firestore);
        const start = i * batchSize;
        const end = Math.min(start + batchSize, validRows.length);
        
        for (let j = start; j < end; j++) {
          const row = validRows[j];
          const newDocRef = doc(contactsRef);
          
          // Netejar undefined abans de guardar
          const cleanData: Record<string, any> = {
            id: newDocRef.id,
            type: 'supplier',
            name: row.parsed.name || '',
            taxId: row.parsed.taxId || '',
            zipCode: row.parsed.zipCode || '',
            createdAt: now,
            updatedAt: now,
          };

          if (row.parsed.category) cleanData.category = row.parsed.category;
          if (row.parsed.address) cleanData.address = row.parsed.address;
          if (row.parsed.email) cleanData.email = row.parsed.email;
          if (row.parsed.phone) cleanData.phone = row.parsed.phone;
          if (row.parsed.iban) cleanData.iban = row.parsed.iban;
          if (row.parsed.paymentTerms) cleanData.paymentTerms = row.parsed.paymentTerms;

          batch.set(newDocRef, cleanData);
          imported++;
        }

        await batch.commit();
        setImportProgress(Math.round((imported / validRows.length) * 100));
      }

      setImportedCount(imported);
      setStep('complete');
      onImportComplete?.(imported);

      toast({
        title: t.importers.supplier.importSuccess,
        description: t.importers.supplier.importSuccessDescription(imported),
      });
    } catch (error) {
      console.error('Error important:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t.importers.common.importError,
      });
      setStep('preview');
    }
  };

  const downloadTemplate = () => {
    const template = [
      [
        t.importers.supplier.fields.name.replace(' *', ''),
        t.importers.supplier.fields.cif.replace(' *', ''),
        t.importers.supplier.fields.zipCode,
        t.importers.supplier.fields.category,
        t.importers.supplier.fields.address,
        t.importers.supplier.fields.email,
        t.importers.supplier.fields.phone,
        t.importers.supplier.fields.iban,
        t.importers.supplier.fields.paymentTerms
      ],
      ['Empresa Serveis SL', 'B12345678', '08001', t.importers.supplier.categories.professional, 'Carrer Major 1', 'info@empresa.com', '934000000', 'ES1234567890123456789012', '30 dies'],
      ['Subministraments SA', 'A87654321', '28001', t.importers.supplier.categories.materials, 'Avinguda Central 50', 'vendes@submin.com', '915000000', '', 'Al comptat'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t.importers.supplier.worksheetName);
    ws['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
      { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 26 }, { wch: 18 }
    ];

    XLSX.writeFile(wb, t.importers.supplier.templateName);
  };

  const validCount = importRows.filter(r => r.status === 'valid').length;
  const duplicateCount = importRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = importRows.filter(r => r.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t.importers.supplier.title}
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && t.importers.supplier.uploadDescription}
            {step === 'mapping' && t.importers.supplier.mappingDescription}
            {step === 'preview' && t.importers.supplier.previewDescription}
            {step === 'importing' && t.importers.supplier.importingDescription}
            {step === 'complete' && t.importers.supplier.completeDescription}
          </DialogDescription>
        </DialogHeader>

        {/* STEP: UPLOAD */}
        {step === 'upload' && (
          <div className="py-6 space-y-6">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById('supplier-file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">{t.importers.common.dragOrClick}</p>
              <p className="text-sm text-muted-foreground">{t.importers.common.acceptedFormats}</p>
              <input
                id="supplier-file-input"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                {t.importers.common.downloadTemplate}
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">{t.importers.common.recommendedFormat}</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>{t.importers.common.requiredColumns}</strong> {t.importers.supplier.requiredColumnsText}</li>
                <li><strong>{t.importers.common.optionalColumns}</strong> {t.importers.supplier.optionalColumnsText}</li>
                <li>{t.importers.common.firstRowHeaders}</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP: MAPPING */}
        {step === 'mapping' && (
          <div className="py-4 space-y-4">
            {file && (
              <div className="flex items-center gap-2 text-sm bg-muted/50 rounded p-2">
                <FileSpreadsheet className="h-4 w-4" />
                <span className="font-medium">{file.name}</span>
                <span className="text-muted-foreground">({rawData.length} {t.importers.common.rows})</span>
              </div>
            )}

            <div className="grid gap-3">
              {(Object.keys(FIELD_LABELS) as (keyof ColumnMapping)[]).map((field) => (
                <div key={field} className="grid grid-cols-5 items-center gap-4">
                  <Label className={cn(
                    "text-right text-sm col-span-2",
                    REQUIRED_FIELDS.includes(field as any) && "font-medium"
                  )}>
                    {FIELD_LABELS[field]}
                  </Label>
                  <Select
                    value={mapping[field] || '__none__'}
                    onValueChange={(v) => handleMappingChange(field, v)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t.importers.common.doNotImport} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">{t.importers.common.doNotImport}</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.importers.common.back}
              </Button>
              <Button
                onClick={processData}
                disabled={!mapping.name || !mapping.taxId}
              >
                {t.importers.common.continue}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: PREVIEW */}
        {step === 'preview' && (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-green-700 mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{t.importers.common.valid}</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{validCount}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-700 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{t.importers.common.duplicates}</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{duplicateCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-red-700 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">{t.importers.common.invalid}</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
              </div>
            </div>

            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">{t.importers.common.row}</TableHead>
                    <TableHead>{t.importers.common.name}</TableHead>
                    <TableHead>{t.importers.supplier.tableHeaders.cif}</TableHead>
                    <TableHead>{t.importers.supplier.tableHeaders.category}</TableHead>
                    <TableHead className="w-24">{t.importers.common.status}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importRows.slice(0, 50).map((row) => (
                    <TableRow
                      key={row.rowIndex}
                      className={cn(
                        row.status === 'duplicate' && 'bg-yellow-50',
                        row.status === 'invalid' && 'bg-red-50'
                      )}
                    >
                      <TableCell className="text-muted-foreground">{row.rowIndex}</TableCell>
                      <TableCell className="font-medium">{row.parsed.name || '-'}</TableCell>
                      <TableCell>{row.parsed.taxId || '-'}</TableCell>
                      <TableCell>
                        {row.parsed.category ? (
                          <Badge variant="outline">
                            {CATEGORY_LABELS[row.parsed.category as SupplierCategory] || row.parsed.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.status === 'valid' && (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        )}
                        {row.status === 'duplicate' && (
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {t.importers.common.duplicate}
                          </Badge>
                        )}
                        {row.status === 'invalid' && (
                          <Badge className="bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {row.error}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {importRows.length > 50 && (
                <div className="p-2 text-center text-sm text-muted-foreground bg-muted/50">
                  {t.importers.common.showing(50, importRows.length)}
                </div>
              )}
            </div>

            {duplicateCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                {t.importers.common.duplicatesWillNotImport(duplicateCount)}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.importers.common.back}
              </Button>
              <Button
                onClick={executeImport}
                disabled={validCount === 0}
              >
                {t.importers.supplier.importButton(validCount)}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* STEP: IMPORTING */}
        {step === 'importing' && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">{t.importers.common.importing}</p>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-muted-foreground">
              {t.importers.common.percentComplete(importProgress)}
            </p>
          </div>
        )}

        {/* STEP: COMPLETE */}
        {step === 'complete' && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{t.importers.common.importComplete}</p>
                <p className="text-muted-foreground mt-1">
                  {t.importers.supplier.importedCount(importedCount)}
                </p>
              </div>
            </div>
            <DialogFooter className="justify-center">
              <Button onClick={() => onOpenChange(false)}>
                {t.importers.common.close}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 