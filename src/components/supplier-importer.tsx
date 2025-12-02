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

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name: 'Nom *',
  taxId: 'CIF *',
  zipCode: 'Codi Postal',
  category: 'Categoria',
  address: 'Adreça',
  email: 'Email',
  phone: 'Telèfon',
  iban: 'IBAN',
  paymentTerms: 'Condicions pagament',
};

const CATEGORY_LABELS: Record<SupplierCategory, string> = {
  services: 'Serveis professionals',
  utilities: 'Subministraments',
  materials: 'Materials i equipament',
  rent: 'Lloguer',
  insurance: 'Assegurances',
  banking: 'Serveis bancaris',
  communications: 'Telecomunicacions',
  transport: 'Transport',
  maintenance: 'Manteniment',
  other: 'Altres',
};

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

  const [step, setStep] = React.useState<ImportStep>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rawData, setRawData] = React.useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>(emptyMapping);
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importedCount, setImportedCount] = React.useState(0);
  const [existingIds, setExistingIds] = React.useState<Set<string>>(new Set());

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
        toast({ variant: 'destructive', title: 'Error', description: 'El fitxer està buit.' });
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
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut llegir el fitxer.' });
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
        error = 'Falta el nom';
      } else if (!parsed.taxId) {
        status = 'invalid';
        error = 'Falta el CIF';
      } else if (existingIds.has(parsed.taxId)) {
        status = 'duplicate';
        error = 'Ja existeix';
      }

      return { rowIndex: index + 2, data: row, parsed, status, error };
    });

    // Detectar duplicats interns
    const seenTaxIds = new Set<string>();
    for (const row of rows) {
      if (row.status === 'valid' && row.parsed.taxId) {
        if (seenTaxIds.has(row.parsed.taxId)) {
          row.status = 'duplicate';
          row.error = 'Duplicat al fitxer';
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
        title: 'Importació completada',
        description: `S'han importat ${imported} proveïdors correctament.`,
      });
    } catch (error) {
      console.error('Error important:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Hi ha hagut un error durant la importació.',
      });
      setStep('preview');
    }
  };

  const downloadTemplate = () => {
    const template = [
      ['Nom', 'CIF', 'Codi Postal', 'Categoria', 'Adreça', 'Email', 'Telèfon', 'IBAN', 'Condicions Pagament'],
      ['Empresa Serveis SL', 'B12345678', '08001', 'Serveis', 'Carrer Major 1', 'info@empresa.com', '934000000', 'ES1234567890123456789012', '30 dies'],
      ['Subministraments SA', 'A87654321', '28001', 'Materials', 'Avinguda Central 50', 'vendes@submin.com', '915000000', '', 'Al comptat'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proveïdors');
    ws['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, 
      { wch: 25 }, { wch: 25 }, { wch: 12 }, { wch: 26 }, { wch: 18 }
    ];

    XLSX.writeFile(wb, 'plantilla_proveidors.xlsx');
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
            Importar Proveïdors
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Selecciona un fitxer Excel (.xlsx) o CSV amb les dades dels proveïdors.'}
            {step === 'mapping' && 'Indica quina columna del fitxer correspon a cada camp.'}
            {step === 'preview' && 'Revisa les dades abans d\'importar.'}
            {step === 'importing' && 'Important dades...'}
            {step === 'complete' && 'Importació completada!'}
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
              <p className="text-lg font-medium mb-1">Arrossega o clica per seleccionar</p>
              <p className="text-sm text-muted-foreground">Formats acceptats: .xlsx, .xls, .csv</p>
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
                Descarregar plantilla Excel
              </Button>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Format recomanat:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li><strong>Columnes obligatòries:</strong> Nom, CIF</li>
                <li><strong>Columnes opcionals:</strong> Codi Postal, Categoria, Adreça, Email, Telèfon, IBAN</li>
                <li>La primera fila ha de contenir els noms de les columnes</li>
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
                <span className="text-muted-foreground">({rawData.length} files)</span>
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
                      <SelectValue placeholder="-- No importar --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">-- No importar --</SelectItem>
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
                Enrere
              </Button>
              <Button 
                onClick={processData}
                disabled={!mapping.name || !mapping.taxId}
              >
                Continuar
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
                  <span className="font-medium">Vàlids</span>
                </div>
                <p className="text-2xl font-bold text-green-700">{validCount}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-yellow-700 mb-1">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">Duplicats</span>
                </div>
                <p className="text-2xl font-bold text-yellow-700">{duplicateCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-2 text-red-700 mb-1">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Invàlids</span>
                </div>
                <p className="text-2xl font-bold text-red-700">{invalidCount}</p>
              </div>
            </div>

            <div className="border rounded-lg max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Fila</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>CIF</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="w-24">Estat</TableHead>
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
                            Duplicat
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
                  Mostrant 50 de {importRows.length} files
                </div>
              )}
            </div>

            {duplicateCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 inline mr-2" />
                Els {duplicateCount} registres duplicats <strong>no s'importaran</strong>.
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Enrere
              </Button>
              <Button 
                onClick={executeImport}
                disabled={validCount === 0}
              >
                Importar {validCount} proveïdors
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
              <p className="text-lg font-medium">Important proveïdors...</p>
            </div>
            <Progress value={importProgress} className="h-2" />
            <p className="text-center text-muted-foreground">
              {importProgress}% completat
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
                <p className="text-xl font-bold">Importació completada!</p>
                <p className="text-muted-foreground mt-1">
                  S'han importat <strong>{importedCount}</strong> proveïdors correctament.
                </p>
              </div>
            </div>
            <DialogFooter className="justify-center">
              <Button onClick={() => onOpenChange(false)}>
                Tancar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

Pas 2: Actualitzar el supplier-manager

Obre: src/components/supplier-manager.tsx
Substitueix tot el contingut pel del fitxer supplier-manager.tsx

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Edit, Trash2, Building2, Upload } from 'lucide-react';
import type { Supplier, SupplierCategory } from '@/lib/data';
import { SUPPLIER_CATEGORIES } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirebase, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, where } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { SupplierImporter } from './supplier-importer';

// Traduccions de categories
const CATEGORY_LABELS: Record<SupplierCategory, string> = {
  services: 'Serveis professionals',
  utilities: 'Subministraments',
  materials: 'Materials i equipament',
  rent: 'Lloguer',
  insurance: 'Assegurances',
  banking: 'Serveis bancaris',
  communications: 'Telecomunicacions',
  transport: 'Transport',
  maintenance: 'Manteniment',
  other: 'Altres',
};

type SupplierFormData = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;

const emptyFormData: SupplierFormData = {
  type: 'supplier',
  name: '',
  taxId: '',
  zipCode: '',
  category: undefined,
  address: '',
  email: '',
  phone: '',
  iban: '',
  paymentTerms: '',
  notes: '',
};

export function SupplierManager() {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();

  const contactsCollection = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );

  const suppliersQuery = useMemoFirebase(
    () => contactsCollection ? query(contactsCollection, where('type', '==', 'supplier')) : null,
    [contactsCollection]
  );

  const { data: suppliers } = useCollection<Supplier>(suppliersQuery);

  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isImportOpen, setIsImportOpen] = React.useState(false);
  const [editingSupplier, setEditingSupplier] = React.useState<Supplier | null>(null);
  const [supplierToDelete, setSupplierToDelete] = React.useState<Supplier | null>(null);
  const [formData, setFormData] = React.useState<SupplierFormData>(emptyFormData);

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      type: 'supplier',
      name: supplier.name,
      taxId: supplier.taxId,
      zipCode: supplier.zipCode,
      category: supplier.category,
      address: supplier.address || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      iban: supplier.iban || '',
      paymentTerms: supplier.paymentTerms || '',
      notes: supplier.notes || '',
    });
    setIsDialogOpen(true);
  };

  const handleDeleteRequest = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setIsAlertOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (supplierToDelete && contactsCollection) {
      deleteDocumentNonBlocking(doc(contactsCollection, supplierToDelete.id));
      toast({
        title: 'Proveïdor eliminat',
        description: `S'ha eliminat "${supplierToDelete.name}" correctament.`,
      });
    }
    setIsAlertOpen(false);
    setSupplierToDelete(null);
  };

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setEditingSupplier(null);
      setFormData(emptyFormData);
    }
  };

  const handleAddNew = () => {
    setEditingSupplier(null);
    setFormData(emptyFormData);
    setIsDialogOpen(true);
  };

  const handleFormChange = (field: keyof SupplierFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.taxId) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'El nom i el CIF són obligatoris.' 
      });
      return;
    }

    if (!contactsCollection) {
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut connectar amb la base de dades.' });
      return;
    }

    const now = new Date().toISOString();
    const dataToSave = {
      ...formData,
      category: formData.category || null,
      address: formData.address || null,
      email: formData.email || null,
      phone: formData.phone || null,
      iban: formData.iban || null,
      paymentTerms: formData.paymentTerms || null,
      notes: formData.notes || null,
      zipCode: formData.zipCode || '',
      updatedAt: now,
    };

    if (editingSupplier) {
      setDocumentNonBlocking(doc(contactsCollection, editingSupplier.id), dataToSave, { merge: true });
      toast({ title: 'Proveïdor actualitzat', description: `S'ha actualitzat "${formData.name}" correctament.` });
    } else {
      addDocumentNonBlocking(contactsCollection, { ...dataToSave, createdAt: now });
      toast({ title: 'Proveïdor creat', description: `S'ha creat "${formData.name}" correctament.` });
    }
    handleOpenChange(false);
  };

  const handleImportComplete = () => {
    // Es pot afegir lògica addicional aquí si cal
  };

  const dialogTitle = editingSupplier ? 'Editar Proveïdor' : 'Nou Proveïdor';
  const dialogDescription = editingSupplier 
    ? 'Modifica les dades del proveïdor.' 
    : 'Afegeix un nou proveïdor o empresa col·laboradora.';

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                Gestió de Proveïdors
              </CardTitle>
              <CardDescription>
                Administra els proveïdors i empreses col·laboradores
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Importar
              </Button>
              <DialogTrigger asChild>
                <Button onClick={handleAddNew}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Afegir Proveïdor
                </Button>
              </DialogTrigger>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>CIF</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Contacte</TableHead>
                    <TableHead className="text-right">Accions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers && suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {supplier.name}
                        </div>
                      </TableCell>
                      <TableCell>{supplier.taxId}</TableCell>
                      <TableCell>
                        {supplier.category ? (
                          <Badge variant="outline">
                            {CATEGORY_LABELS[supplier.category as SupplierCategory] || supplier.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {supplier.email && <div>{supplier.email}</div>}
                          {supplier.phone && <div className="text-muted-foreground">{supplier.phone}</div>}
                          {!supplier.email && !supplier.phone && <span className="text-muted-foreground">-</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(supplier)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteRequest(supplier)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!suppliers || suppliers.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No hi ha proveïdors registrats. Afegeix el primer o importa'ls des d'Excel!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Secció: Dades bàsiques */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground">Dades bàsiques</h4>
              
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  className="col-span-3"
                  placeholder="Nom de l'empresa"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="taxId" className="text-right">CIF *</Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => handleFormChange('taxId', e.target.value.toUpperCase())}
                  className="col-span-3"
                  placeholder="B12345678"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">Categoria</Label>
                <Select
                  value={formData.category || ''}
                  onValueChange={(v) => handleFormChange('category', v || undefined)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecciona una categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPLIER_CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Secció: Adreça */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Adreça</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">Adreça</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) => handleFormChange('address', e.target.value)}
                  className="col-span-3"
                  placeholder="Carrer, número, pis..."
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="zipCode" className="text-right">Codi Postal</Label>
                <Input
                  id="zipCode"
                  value={formData.zipCode}
                  onChange={(e) => handleFormChange('zipCode', e.target.value)}
                  className="col-span-3"
                  placeholder="08001"
                />
              </div>
            </div>

            {/* Secció: Contacte */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Contacte</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="email" className="text-right">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => handleFormChange('email', e.target.value)}
                  className="col-span-3"
                  placeholder="facturacio@empresa.com"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">Telèfon</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => handleFormChange('phone', e.target.value)}
                  className="col-span-3"
                  placeholder="934 000 000"
                />
              </div>
            </div>

            {/* Secció: Dades bancàries i pagament */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Dades de pagament</h4>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="iban" className="text-right">IBAN</Label>
                <Input
                  id="iban"
                  value={formData.iban || ''}
                  onChange={(e) => handleFormChange('iban', e.target.value.toUpperCase().replace(/\s/g, ''))}
                  className="col-span-3"
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentTerms" className="text-right">Condicions</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms || ''}
                  onChange={(e) => handleFormChange('paymentTerms', e.target.value)}
                  className="col-span-3"
                  placeholder="Ex: 30 dies, al comptat..."
                />
              </div>
            </div>

            {/* Secció: Notes */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-muted-foreground">Notes</h4>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className="col-span-3"
                  placeholder="Observacions internes..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel·lar</Button>
            </DialogClose>
            <Button onClick={handleSave}>
              {editingSupplier ? 'Guardar canvis' : 'Crear proveïdor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar proveïdor?</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs segur que vols eliminar "{supplierToDelete?.name}"? 
              Aquesta acció no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSupplierToDelete(null)}>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SupplierImporter
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        onImportComplete={handleImportComplete}
      />
    </>
  );
}