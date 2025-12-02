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
import type { Donor } from '@/lib/data';
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
  donorType: string | null;
  membershipType: string | null;
  monthlyAmount: string | null;
  iban: string | null;
  email: string | null;
  phone: string | null;
};

type ImportRow = {
  rowIndex: number;
  data: Record<string, any>;
  parsed: Partial<Donor>;
  status: 'valid' | 'duplicate' | 'invalid';
  error?: string;
};

type ImportStep = 'upload' | 'mapping' | 'preview' | 'importing' | 'complete';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const REQUIRED_FIELDS = ['name', 'taxId', 'zipCode'] as const;

const FIELD_LABELS: Record<keyof ColumnMapping, string> = {
  name: 'Nom *',
  taxId: 'DNI/CIF *',
  zipCode: 'Codi Postal *',
  donorType: 'Tipus (Particular/Empresa)',
  membershipType: 'Modalitat (Puntual/Soci)',
  monthlyAmount: 'Import mensual',
  iban: 'IBAN',
  email: 'Email',
  phone: 'Telèfon',
};

const emptyMapping: ColumnMapping = {
  name: null,
  taxId: null,
  zipCode: null,
  donorType: null,
  membershipType: null,
  monthlyAmount: null,
  iban: null,
  email: null,
  phone: null,
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

function autoDetectColumn(header: string): keyof ColumnMapping | null {
  const normalized = normalizeText(header);
  
  const patterns: Record<keyof ColumnMapping, string[]> = {
    name: ['nom', 'nombre', 'name', 'raosocial', 'denominacio'],
    taxId: ['dni', 'nif', 'cif', 'taxid', 'documento', 'identificacio'],
    zipCode: ['cp', 'codipostal', 'codigopostal', 'zipcode', 'postal'],
    donorType: ['tipus', 'tipo', 'type', 'persona'],
    membershipType: ['modalitat', 'modalidad', 'membership', 'soci', 'socio'],
    monthlyAmount: ['import', 'importe', 'quota', 'cuota', 'amount', 'mensual'],
    iban: ['iban', 'compte', 'cuenta', 'banc', 'banco'],
    email: ['email', 'correu', 'correo', 'mail'],
    phone: ['telefon', 'telefono', 'phone', 'mobil', 'movil'],
  };

  for (const [field, keywords] of Object.entries(patterns)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      return field as keyof ColumnMapping;
    }
  }
  return null;
}

function parseDonorType(value: any): 'individual' | 'company' {
  if (!value) return 'individual';
  const normalized = normalizeText(String(value));
  if (['empresa', 'company', 'juridica', 'entitat'].some(k => normalized.includes(k))) {
    return 'company';
  }
  return 'individual';
}

function parseMembershipType(value: any): 'one-time' | 'recurring' {
  if (!value) return 'one-time';
  const normalized = normalizeText(String(value));
  if (['soci', 'socio', 'recurrent', 'recurring', 'mensual', 'periodico'].some(k => normalized.includes(k))) {
    return 'recurring';
  }
  return 'one-time';
}

function parseAmount(value: any): number | undefined {
  if (!value) return undefined;
  const str = String(value).replace(/[€$,\s]/g, '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? undefined : num;
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

interface DonorImporterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (count: number) => void;
  existingTaxIds?: string[];
}

export function DonorImporter({ 
  open, 
  onOpenChange, 
  onImportComplete,
  existingTaxIds = []
}: DonorImporterProps) {
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { toast } = useToast();

  // Estat del procés
  const [step, setStep] = React.useState<ImportStep>('upload');
  const [file, setFile] = React.useState<File | null>(null);
  const [headers, setHeaders] = React.useState<string[]>([]);
  const [rawData, setRawData] = React.useState<Record<string, any>[]>([]);
  const [mapping, setMapping] = React.useState<ColumnMapping>(emptyMapping);
  const [importRows, setImportRows] = React.useState<ImportRow[]>([]);
  const [importProgress, setImportProgress] = React.useState(0);
  const [importedCount, setImportedCount] = React.useState(0);
  const [existingIds, setExistingIds] = React.useState<Set<string>>(new Set(existingTaxIds));

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

  // Carregar DNIs existents quan s'obre
  React.useEffect(() => {
    if (open && organizationId && firestore) {
      loadExistingTaxIds();
    }
  }, [open, organizationId, firestore]);

  const loadExistingTaxIds = async () => {
    if (!organizationId || !firestore) return;
    try {
      const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');
      const q = query(contactsRef, where('type', '==', 'donor'));
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
      console.error('Error carregant DNIs existents:', error);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

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
      const parsed: Partial<Donor> = {
        type: 'donor',
        name: mapping.name ? String(row[mapping.name] || '').trim() : '',
        taxId: mapping.taxId ? cleanTaxId(row[mapping.taxId]) : '',
        zipCode: mapping.zipCode ? String(row[mapping.zipCode] || '').trim() : '',
        donorType: mapping.donorType ? parseDonorType(row[mapping.donorType]) : 'individual',
        membershipType: mapping.membershipType ? parseMembershipType(row[mapping.membershipType]) : 'one-time',
        monthlyAmount: mapping.monthlyAmount ? parseAmount(row[mapping.monthlyAmount]) : undefined,
        iban: mapping.iban ? cleanIban(row[mapping.iban]) : undefined,
        email: mapping.email ? String(row[mapping.email] || '').trim() : undefined,
        phone: mapping.phone ? String(row[mapping.phone] || '').trim() : undefined,
      };

      let status: ImportRow['status'] = 'valid';
      let error: string | undefined;

      if (!parsed.name) {
        status = 'invalid';
        error = 'Falta el nom';
      } else if (!parsed.taxId) {
        status = 'invalid';
        error = 'Falta el DNI/CIF';
      } else if (!parsed.zipCode) {
        status = 'invalid';
        error = 'Falta el codi postal';
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
          batch.set(newDocRef, {
            ...row.parsed,
            id: newDocRef.id,
            createdAt: now,
            updatedAt: now,
          });
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
        description: `S'han importat ${imported} donants correctament.`,
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
      ['Nom', 'DNI/CIF', 'Codi Postal', 'Tipus', 'Modalitat', 'Import Mensual', 'IBAN', 'Email', 'Telèfon'],
      ['Maria García López', '12345678A', '28001', 'Particular', 'Soci', '10', 'ES1234567890123456789012', 'maria@exemple.com', '612345678'],
      ['Joan Pérez Martí', '87654321B', '08001', 'Particular', 'Puntual', '', '', 'joan@exemple.com', ''],
      ['Empresa SL', 'B12345678', '25001', 'Empresa', 'Soci', '50', 'ES0987654321098765432109', 'info@empresa.com', '973123456'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Donants');
    ws['!cols'] = [
      { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, 
      { wch: 12 }, { wch: 14 }, { wch: 26 }, { wch: 25 }, { wch: 12 }
    ];

    XLSX.writeFile(wb, 'plantilla_donants.xlsx');
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  const validCount = importRows.filter(r => r.status === 'valid').length;
  const duplicateCount = importRows.filter(r => r.status === 'duplicate').length;
  const invalidCount = importRows.filter(r => r.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Donants
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Selecciona un fitxer Excel (.xlsx) o CSV amb les dades dels donants.'}
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
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">Arrossega o clica per seleccionar</p>
              <p className="text-sm text-muted-foreground">Formats acceptats: .xlsx, .xls, .csv</p>
              <input
                id="file-input"
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
                <li><strong>Columnes obligatòries:</strong> Nom, DNI/CIF, Codi Postal</li>
                <li><strong>Columnes opcionals:</strong> Tipus, Modalitat, Import, IBAN, Email, Telèfon</li>
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
                disabled={!mapping.name || !mapping.taxId || !mapping.zipCode}
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
                    <TableHead>DNI/CIF</TableHead>
                    <TableHead>CP</TableHead>
                    <TableHead>Modalitat</TableHead>
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
                      <TableCell>{row.parsed.zipCode || '-'}</TableCell>
                      <TableCell>
                        {row.parsed.membershipType === 'recurring' ? (
                          <Badge variant="outline" className="text-green-700">Soci</Badge>
                        ) : (
                          <Badge variant="secondary">Puntual</Badge>
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
                Importar {validCount} donants
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
              <p className="text-lg font-medium">Important donants...</p>
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
                  S'han importat <strong>{importedCount}</strong> donants correctament.
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
