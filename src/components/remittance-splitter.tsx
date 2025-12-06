'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { useToast } from '@/hooks/use-toast';
import { useAppLog } from '@/hooks/use-app-log';
import type { Transaction, Donor } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { 
  FileUp, 
  Loader2, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  UserPlus, 
  ArrowLeft, 
  ArrowRight,
  Settings2,
  Save,
  Trash2,
  Eye
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase } from '@/firebase';
import { collection, writeBatch, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useCollection, useMemoFirebase } from '@/firebase';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

interface RemittanceSplitterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  existingDonors: Donor[];
  onSplitDone: () => void;
}

// Configuració guardada per a un format de banc
interface SavedMapping {
  id: string;
  name: string;
  delimiter: string;
  startRow: number;
  amountColumn: number;
  nameColumn: number | null;
  taxIdColumn: number | null;
  createdAt: string;
}

// Resultat de l'anàlisi de cada fila del CSV
interface ParsedDonation {
  rowIndex: number;
  name: string;
  taxId: string;
  amount: number;
  status: 'found' | 'new_with_taxid' | 'new_without_taxid';
  matchedDonor: Donor | null;
  shouldCreate: boolean;
  zipCode: string;
}

type Step = 'upload' | 'mapping' | 'preview' | 'processing';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITATS
// ═══════════════════════════════════════════════════════════════════════════════

const normalizeString = (str: string): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Detecta el delimitador més probable
const detectDelimiter = (text: string): string => {
  const firstLines = text.split('\n').slice(0, 10).join('\n');
  const counts = {
    ';': (firstLines.match(/;/g) || []).length,
    ',': (firstLines.match(/,/g) || []).length,
    '\t': (firstLines.match(/\t/g) || []).length,
  };
  
  // Retorna el delimitador més freqüent
  return Object.entries(counts).reduce((a, b) => a[1] > b[1] ? a : b)[0];
};

// Parseja un valor d'import (15,00 EUR -> 15.00)
const parseAmount = (value: string): number => {
  if (!value) return 0;
  // Elimina tot excepte números, comes i punts
  let cleaned = value.replace(/[^\d,.-]/g, '');
  // Si té format europeu (1.234,56), converteix a format americà
  if (cleaned.includes(',')) {
    // Si hi ha punt abans de la coma, és separador de milers
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }
  return parseFloat(cleaned) || 0;
};

// Detecta automàticament la fila on comencen les dades
const detectStartRow = (rows: string[][]): number => {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // Busca una fila amb almenys 2 columnes i que contingui un número que sembli import
    if (row.length >= 2) {
      const hasAmount = row.some(cell => {
        const amount = parseAmount(cell);
        return amount > 0 && amount < 100000; // Import raonable
      });
      const hasText = row.some(cell => /[a-zA-ZáéíóúÁÉÍÓÚñÑ]{3,}/.test(cell));
      if (hasAmount && hasText) {
        return i;
      }
    }
  }
  return 0;
};

// Detecta automàticament les columnes
const detectColumns = (rows: string[][], startRow: number): { amount: number, name: number | null, taxId: number | null } => {
  const sampleRows = rows.slice(startRow, startRow + 10);
  let amountCol = -1;
  let nameCol: number | null = null;
  let taxIdCol: number | null = null;

  if (sampleRows.length === 0 || sampleRows[0].length === 0) {
    return { amount: 0, name: null, taxId: null };
  }

  const numCols = sampleRows[0].length;

  for (let col = 0; col < numCols; col++) {
    const values = sampleRows.map(row => row[col] || '');
    
    // Detecta columna d'import (números amb format monetari)
    const amountScores = values.filter(v => {
      const amount = parseAmount(v);
      return amount > 0 && amount < 100000;
    }).length;
    if (amountScores > sampleRows.length * 0.7 && amountCol === -1) {
      amountCol = col;
      continue;
    }

    // Detecta columna de DNI/CIF (8-9 dígits + lletra, o CIF)
    const taxIdScores = values.filter(v => 
      /^[0-9]{7,8}[A-Za-z]$/.test(v.trim()) || // DNI
      /^[A-Za-z][0-9]{7,8}$/.test(v.trim()) || // CIF
      /^[XYZ][0-9]{7}[A-Za-z]$/.test(v.trim()) // NIE
    ).length;
    if (taxIdScores > sampleRows.length * 0.5) {
      taxIdCol = col;
      continue;
    }

    // Detecta columna de nom (text amb espais, sense números)
    const nameScores = values.filter(v => {
      const cleaned = v.trim();
      return cleaned.length > 5 && 
             /[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]{5,}/.test(cleaned) &&
             !/^[0-9]+$/.test(cleaned) &&
             !cleaned.includes('EUR') &&
             !cleaned.startsWith('ES') && // No és IBAN
             !cleaned.startsWith('IBAN');
    }).length;
    if (nameScores > sampleRows.length * 0.5 && nameCol === null) {
      nameCol = col;
    }
  }

  return { 
    amount: amountCol >= 0 ? amountCol : 0, 
    name: nameCol, 
    taxId: taxIdCol 
  };
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function RemittanceSplitter({
  open,
  onOpenChange,
  transaction,
  existingDonors,
  onSplitDone,
}: RemittanceSplitterProps) {
  // Estats de navegació
  const [step, setStep] = React.useState<Step>('upload');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Estats de l'arxiu
  const [rawText, setRawText] = React.useState('');
  const [delimiter, setDelimiter] = React.useState(';');
  const [allRows, setAllRows] = React.useState<string[][]>([]);
  
  // Estats de mapejat
  const [startRow, setStartRow] = React.useState(0);
  const [amountColumn, setAmountColumn] = React.useState<number>(0);
  const [nameColumn, setNameColumn] = React.useState<number | null>(null);
  const [taxIdColumn, setTaxIdColumn] = React.useState<number | null>(null);
  const [newMappingName, setNewMappingName] = React.useState('');

  // Estats de preview
  const [parsedDonations, setParsedDonations] = React.useState<ParsedDonation[]>([]);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [defaultZipCode, setDefaultZipCode] = React.useState('08001');

  // Refs i hooks
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();

  // Carregar configuracions guardades
  const mappingsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'remittanceMappings') : null,
    [firestore, organizationId]
  );
  const { data: savedMappings } = useCollection<SavedMapping>(mappingsQuery);

  // Reset quan es tanca el diàleg
  React.useEffect(() => {
    if (!open) {
      setStep('upload');
      setRawText('');
      setAllRows([]);
      setParsedDonations([]);
      setTotalAmount(0);
      setNewMappingName('');
    }
  }, [open]);

  // Estadístiques
  const stats = React.useMemo(() => {
    const found = parsedDonations.filter(d => d.status === 'found').length;
    const newWithTaxId = parsedDonations.filter(d => d.status === 'new_with_taxid').length;
    const newWithoutTaxId = parsedDonations.filter(d => d.status === 'new_without_taxid').length;
    const toCreate = parsedDonations.filter(d => d.status !== 'found' && d.shouldCreate).length;
    return { found, newWithTaxId, newWithoutTaxId, toCreate };
  }, [parsedDonations]);

  // Files visibles per al preview del mapejat
  const previewRows = React.useMemo(() => {
    return allRows.slice(startRow, startRow + 8);
  }, [allRows, startRow]);

  // Número de columnes
  const numColumns = React.useMemo(() => {
    return Math.max(...allRows.map(r => r.length), 0);
  }, [allRows]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        processRawText(text);
      };
      reader.readAsText(file, 'UTF-8');
    }
    event.target.value = '';
  };

  const processRawText = (text: string) => {
    setRawText(text);
    
    // Detecta delimitador
    const detectedDelimiter = detectDelimiter(text);
    setDelimiter(detectedDelimiter);
    
    // Parseja totes les files
    const lines = text.split('\n').filter(line => line.trim());
    const rows = lines.map(line => 
      line.split(detectedDelimiter).map(cell => cell.trim())
    );
    setAllRows(rows);

    // Detecta fila inicial i columnes
    const detectedStartRow = detectStartRow(rows);
    setStartRow(detectedStartRow);

    const detected = detectColumns(rows, detectedStartRow);
    setAmountColumn(detected.amount);
    setNameColumn(detected.name);
    setTaxIdColumn(detected.taxId);

    log(`[Splitter] Arxiu carregat: ${rows.length} files, delimitador: "${detectedDelimiter}"`);
    log(`[Splitter] Detecció automàtica - Fila inicial: ${detectedStartRow}, Import: col ${detected.amount}, Nom: col ${detected.name}, DNI: col ${detected.taxId}`);

    setStep('mapping');
  };

  const handleApplySavedMapping = (mapping: SavedMapping) => {
    setDelimiter(mapping.delimiter);
    setStartRow(mapping.startRow);
    setAmountColumn(mapping.amountColumn);
    setNameColumn(mapping.nameColumn);
    setTaxIdColumn(mapping.taxIdColumn);
    
    // Re-parseja amb el nou delimitador si cal
    if (mapping.delimiter !== delimiter) {
      const lines = rawText.split('\n').filter(line => line.trim());
      const rows = lines.map(line => 
        line.split(mapping.delimiter).map(cell => cell.trim())
      );
      setAllRows(rows);
    }

    toast({ title: 'Configuració aplicada', description: `S'ha aplicat la configuració "${mapping.name}"` });
  };

  const handleSaveMapping = async () => {
    if (!organizationId || !newMappingName.trim()) return;

    try {
      const mappingRef = doc(collection(firestore, 'organizations', organizationId, 'remittanceMappings'));
      const mapping: SavedMapping = {
        id: mappingRef.id,
        name: newMappingName.trim(),
        delimiter,
        startRow,
        amountColumn,
        nameColumn,
        taxIdColumn,
        createdAt: new Date().toISOString(),
      };
      await setDoc(mappingRef, mapping);
      setNewMappingName('');
      toast({ title: 'Configuració guardada', description: `S'ha guardat com "${mapping.name}"` });
    } catch (error) {
      console.error('Error saving mapping:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut guardar la configuració' });
    }
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!organizationId) return;
    try {
      await deleteDoc(doc(firestore, 'organizations', organizationId, 'remittanceMappings', mappingId));
      toast({ title: 'Configuració eliminada' });
    } catch (error) {
      console.error('Error deleting mapping:', error);
    }
  };

  const findDonor = (name: string, taxId: string, donors: Donor[]): Donor | undefined => {
    const normalizedCsvName = normalizeString(name);
    const csvNameTokens = new Set(normalizedCsvName.split(' ').filter(Boolean));

    // 1. Buscar per DNI/CIF
    if (taxId) {
      const normalizedTaxId = normalizeString(taxId);
      const foundByTaxId = donors.find(d => normalizeString(d.taxId) === normalizedTaxId);
      if (foundByTaxId) return foundByTaxId;
    }

    // 2. Buscar per nom
    if (normalizedCsvName) {
      const potentialMatches = donors.filter(d => {
        const normalizedDonorName = normalizeString(d.name);
        if (!normalizedDonorName) return false;
        const donorNameTokens = normalizedDonorName.split(' ').filter(Boolean);
        return [...csvNameTokens].every(token => donorNameTokens.includes(token));
      });
      if (potentialMatches.length === 1) return potentialMatches[0];
    }

    return undefined;
  };

  const handleContinueToPreview = () => {
    if (nameColumn === null && taxIdColumn === null) {
      toast({ 
        variant: 'destructive', 
        title: 'Falta informació', 
        description: 'Cal seleccionar almenys una columna de Nom o DNI/CIF' 
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const donations: ParsedDonation[] = [];
      let total = 0;

      const dataRows = allRows.slice(startRow);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        
        const amount = parseAmount(row[amountColumn] || '');
        const name = nameColumn !== null ? (row[nameColumn] || '').trim() : '';
        const taxId = taxIdColumn !== null ? (row[taxIdColumn] || '').trim().toUpperCase() : '';

        // Saltar files sense import o sense identificació
        if (amount <= 0 || (!name && !taxId)) continue;

        // Saltar files que semblen subtotals
        if (name.toLowerCase().includes('subtotal') || name.toLowerCase().includes('total')) continue;

        total += amount;

        const matchedDonor = findDonor(name, taxId, existingDonors);

        let status: ParsedDonation['status'];
        if (matchedDonor) {
          status = 'found';
        } else if (taxId) {
          status = 'new_with_taxid';
        } else {
          status = 'new_without_taxid';
        }

        donations.push({
          rowIndex: startRow + i + 1,
          name,
          taxId,
          amount,
          status,
          matchedDonor,
          shouldCreate: status !== 'found',
          zipCode: defaultZipCode,
        });
      }

      // Validar import total
      if (Math.abs(transaction.amount - total) > 0.01) {
        toast({
          variant: 'destructive',
          title: 'Import no coincideix',
          description: `L'import total del CSV (${total.toFixed(2)} €) no coincideix amb la transacció (${transaction.amount.toFixed(2)} €).`,
          duration: 9000,
        });
        setIsProcessing(false);
        return;
      }

      setParsedDonations(donations);
      setTotalAmount(total);
      setStep('preview');
      log(`[Splitter] Anàlisi completada. ${donations.length} donacions processades.`);

    } catch (error: any) {
      console.error('Error processing data:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleCreate = (index: number) => {
    setParsedDonations(prev => prev.map((d, i) => 
      i === index ? { ...d, shouldCreate: !d.shouldCreate } : d
    ));
  };

  const handleToggleAllNewWithTaxId = (checked: boolean) => {
    setParsedDonations(prev => prev.map(d => 
      d.status === 'new_with_taxid' ? { ...d, shouldCreate: checked } : d
    ));
  };

  const handleToggleAllNewWithoutTaxId = (checked: boolean) => {
    setParsedDonations(prev => prev.map(d => 
      d.status === 'new_without_taxid' ? { ...d, shouldCreate: checked } : d
    ));
  };

  const handleZipCodeChange = (index: number, zipCode: string) => {
    setParsedDonations(prev => prev.map((d, i) => 
      i === index ? { ...d, zipCode } : d
    ));
  };

  const handleApplyDefaultZipCode = () => {
    setParsedDonations(prev => prev.map(d => 
      d.status !== 'found' ? { ...d, zipCode: defaultZipCode } : d
    ));
  };

  const handleProcess = async () => {
    if (!organizationId) return;

    setStep('processing');
    setIsProcessing(true);
    log(`[Splitter] Iniciant processament...`);

    try {
      const batch = writeBatch(firestore);
      const transactionsRef = collection(firestore, 'organizations', organizationId, 'transactions');
      const contactsRef = collection(firestore, 'organizations', organizationId, 'contacts');

      const newDonorIds: Map<number, string> = new Map();

      // 1. Crear nous donants
      const donorsToCreate = parsedDonations.filter(d => d.status !== 'found' && d.shouldCreate);
      log(`[Splitter] Creant ${donorsToCreate.length} nous donants...`);

      for (const donation of donorsToCreate) {
        const newDonorRef = doc(contactsRef);
        const now = new Date().toISOString();

        const newDonorData: Omit<Donor, 'id'> = {
          type: 'donor',
          name: donation.name || `Donant ${donation.taxId}`,
          taxId: donation.taxId,
          zipCode: donation.zipCode,
          donorType: 'individual',
          membershipType: 'recurring',
          createdAt: now,
        };

        batch.set(newDonorRef, newDonorData);
        newDonorIds.set(donation.rowIndex, newDonorRef.id);
      }

      // 2. Eliminar transacció original
      batch.delete(doc(transactionsRef, transaction.id));

      // 3. Crear noves transaccions
      for (const donation of parsedDonations) {
        const newTxRef = doc(transactionsRef);
        
        let contactId: string | null = null;
        if (donation.matchedDonor) {
          contactId = donation.matchedDonor.id;
        } else if (donation.shouldCreate) {
          contactId = newDonorIds.get(donation.rowIndex) || null;
        }

        const displayName = donation.name || donation.taxId || 'Anònim';
        const newTxData: Omit<Transaction, 'id'> = {
          date: transaction.date,
          description: `Donació soci/a: ${displayName}`,
          amount: donation.amount,
          category: 'donations',
          document: null,
          contactId,
          contactType: contactId ? 'donor' : undefined,
          projectId: transaction.projectId,
        };

        batch.set(newTxRef, { ...newTxData, id: newTxRef.id });
      }

      await batch.commit();

      log(`[Splitter] ✅ Processament completat!`);
      toast({
        title: 'Remesa processada correctament!',
        description: `S'han creat ${parsedDonations.length} donacions${donorsToCreate.length > 0 ? ` i ${donorsToCreate.length} nous donants` : ''}.`,
      });

      onSplitDone();

    } catch (error: any) {
      console.error("Error processing remittance:", error);
      log(`[Splitter] ERROR: ${error.message}`);
      toast({ variant: 'destructive', title: 'Error', description: error.message, duration: 9000 });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERITZACIÓ
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={
        step === 'mapping' ? "sm:max-w-5xl max-h-[90vh]" : 
        step === 'preview' ? "sm:max-w-4xl max-h-[90vh]" : 
        "sm:max-w-md"
      }>
        
        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1: UPLOAD
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>{t.movements.splitter.title}</DialogTitle>
              <DialogDescription>
                Puja l'arxiu CSV del teu banc amb el detall de la remesa.
                L'assistent detectarà automàticament el format.
              </DialogDescription>
            </DialogHeader>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Compatible amb qualsevol banc</AlertTitle>
              <AlertDescription>
                L'assistent s'adapta al format del teu banc. Després de pujar l'arxiu,
                podràs revisar i ajustar el mapejat de columnes si cal.
              </AlertDescription>
            </Alert>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.txt"
              className="hidden"
              disabled={isProcessing}
            />

            <Button onClick={handleFileClick} disabled={isProcessing} className="w-full">
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              Seleccionar arxiu CSV
            </Button>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Cancel·lar
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2: MAPPING
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'mapping' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Configuració del mapejat
              </DialogTitle>
              <DialogDescription>
                Revisa la previsualització i indica quina columna correspon a cada camp.
              </DialogDescription>
            </DialogHeader>

            {/* Configuracions guardades */}
            {savedMappings && savedMappings.length > 0 && (
              <div className="rounded-lg border p-3 bg-muted/50">
                <Label className="text-sm font-medium">Configuracions guardades</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {savedMappings.map(mapping => (
                    <div key={mapping.id} className="flex items-center gap-1">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleApplySavedMapping(mapping)}
                      >
                        {mapping.name}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive"
                        onClick={() => handleDeleteMapping(mapping.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Configuració de parsing */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label className="text-xs">Delimitador</Label>
                <Select value={delimiter} onValueChange={(v) => {
                  setDelimiter(v);
                  const lines = rawText.split('\n').filter(line => line.trim());
                  const rows = lines.map(line => line.split(v).map(cell => cell.trim()));
                  setAllRows(rows);
                }}>
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=";">Punt i coma (;)</SelectItem>
                    <SelectItem value=",">Coma (,)</SelectItem>
                    <SelectItem value={"\t"}>Tabulador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Fila inicial de dades</Label>
                <Input 
                  type="number" 
                  min={0} 
                  max={allRows.length - 1}
                  value={startRow}
                  onChange={(e) => setStartRow(parseInt(e.target.value) || 0)}
                  className="h-8"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Files totals detectades</Label>
                <div className="h-8 flex items-center text-sm text-muted-foreground">
                  {allRows.length} files ({allRows.length - startRow} de dades)
                </div>
              </div>
            </div>

            {/* Previsualització de les dades */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Previsualització (primeres {previewRows.length} files de dades)
              </Label>
              <ScrollArea className="h-[180px] rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 text-xs">#</TableHead>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <TableHead key={i} className="text-xs min-w-[100px]">
                          Col. {i}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewRows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="text-xs text-muted-foreground">
                          {startRow + rowIdx + 1}
                        </TableCell>
                        {Array.from({ length: numColumns }, (_, colIdx) => (
                          <TableCell 
                            key={colIdx} 
                            className={`text-xs truncate max-w-[150px] ${
                              colIdx === amountColumn ? 'bg-green-100 dark:bg-green-900/30' :
                              colIdx === nameColumn ? 'bg-blue-100 dark:bg-blue-900/30' :
                              colIdx === taxIdColumn ? 'bg-purple-100 dark:bg-purple-900/30' :
                              ''
                            }`}
                          >
                            {row[colIdx] || '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Mapejat de columnes */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="font-medium">Mapejat de camps</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-green-500"></span>
                    💰 Import (obligatori)
                  </Label>
                  <Select 
                    value={String(amountColumn)} 
                    onValueChange={(v) => setAmountColumn(parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Columna {i}: {previewRows[0]?.[i]?.substring(0, 20) || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-blue-500"></span>
                    👤 Nom
                  </Label>
                  <Select 
                    value={nameColumn !== null ? String(nameColumn) : 'none'} 
                    onValueChange={(v) => setNameColumn(v === 'none' ? null : parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No disponible</SelectItem>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Columna {i}: {previewRows[0]?.[i]?.substring(0, 20) || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <span className="w-3 h-3 rounded bg-purple-500"></span>
                    🆔 DNI/CIF
                  </Label>
                  <Select 
                    value={taxIdColumn !== null ? String(taxIdColumn) : 'none'} 
                    onValueChange={(v) => setTaxIdColumn(v === 'none' ? null : parseInt(v))}
                  >
                    <SelectTrigger className="h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No disponible</SelectItem>
                      {Array.from({ length: numColumns }, (_, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Columna {i}: {previewRows[0]?.[i]?.substring(0, 20) || '-'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Guardar configuració */}
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nom de la configuració (ex: Santander CORE)"
                value={newMappingName}
                onChange={(e) => setNewMappingName(e.target.value)}
                className="flex-1 h-8"
              />
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleSaveMapping}
                disabled={!newMappingName.trim()}
              >
                <Save className="mr-1 h-3 w-3" />
                Guardar
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar
              </Button>
              <Button onClick={handleContinueToPreview} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                Continuar
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 3: PREVIEW
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'preview' && (
          <>
            <DialogHeader>
              <DialogTitle>📊 Revisió de la Remesa</DialogTitle>
              <DialogDescription>
                Revisa les donacions abans de processar. Pots decidir quins donants nous crear.
              </DialogDescription>
            </DialogHeader>

            {/* Resum */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{parsedDonations.length}</div>
                <div className="text-xs text-muted-foreground">Donacions</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{stats.found}</div>
                <div className="text-xs text-muted-foreground">Trobats</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{stats.newWithTaxId}</div>
                <div className="text-xs text-muted-foreground">Nous (amb DNI)</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{stats.newWithoutTaxId}</div>
                <div className="text-xs text-muted-foreground">Nous (sense DNI)</div>
              </div>
            </div>

            {/* Import total */}
            <Alert variant={Math.abs(transaction.amount - totalAmount) < 0.01 ? "default" : "destructive"}>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Import total: {formatCurrencyEU(totalAmount)}</AlertTitle>
              <AlertDescription>
                Coincideix amb la transacció original ({formatCurrencyEU(transaction.amount)}) ✓
              </AlertDescription>
            </Alert>

            {/* Opcions per crear donants */}
            <div className="space-y-3 rounded-lg border p-4">
              <h4 className="font-medium text-sm">Opcions per a nous donants</h4>
              
              <div className="flex items-center gap-4">
                <Label htmlFor="defaultZipCode" className="text-sm whitespace-nowrap">
                  Codi postal per defecte:
                </Label>
                <Input
                  id="defaultZipCode"
                  value={defaultZipCode}
                  onChange={(e) => setDefaultZipCode(e.target.value)}
                  className="w-24"
                  placeholder="08001"
                />
                <Button variant="outline" size="sm" onClick={handleApplyDefaultZipCode}>
                  Aplicar a tots
                </Button>
              </div>

              <div className="flex flex-wrap gap-4">
                {stats.newWithTaxId > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createAllWithTaxId"
                      checked={parsedDonations.filter(d => d.status === 'new_with_taxid').every(d => d.shouldCreate)}
                      onCheckedChange={(checked) => handleToggleAllNewWithTaxId(checked as boolean)}
                    />
                    <label htmlFor="createAllWithTaxId" className="text-sm">
                      Crear tots els {stats.newWithTaxId} nous amb DNI
                    </label>
                  </div>
                )}
                {stats.newWithoutTaxId > 0 && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="createAllWithoutTaxId"
                      checked={parsedDonations.filter(d => d.status === 'new_without_taxid').every(d => d.shouldCreate)}
                      onCheckedChange={(checked) => handleToggleAllNewWithoutTaxId(checked as boolean)}
                    />
                    <label htmlFor="createAllWithoutTaxId" className="text-sm text-orange-600">
                      Crear tots els {stats.newWithoutTaxId} nous sense DNI
                    </label>
                  </div>
                )}
              </div>
            </div>

            {/* Taula de donacions */}
            <ScrollArea className="h-[250px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Crear</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead className="text-right">Import</TableHead>
                    <TableHead>Estat</TableHead>
                    <TableHead>A la BBDD</TableHead>
                    <TableHead className="w-[100px]">CP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedDonations.map((donation, index) => (
                    <TableRow key={index} className={donation.status === 'found' ? 'bg-green-50/50' : ''}>
                      <TableCell>
                        {donation.status !== 'found' && (
                          <Checkbox
                            checked={donation.shouldCreate}
                            onCheckedChange={() => handleToggleCreate(index)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{donation.name || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{donation.taxId || '-'}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrencyEU(donation.amount)}
                      </TableCell>
                      <TableCell>
                        {donation.status === 'found' && (
                          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Trobat
                          </Badge>
                        )}
                        {donation.status === 'new_with_taxid' && (
                          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                            <UserPlus className="mr-1 h-3 w-3" />
                            Nou
                          </Badge>
                        )}
                        {donation.status === 'new_without_taxid' && (
                          <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                            <AlertCircle className="mr-1 h-3 w-3" />
                            Sense DNI
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {donation.matchedDonor ? (
                          <span className="text-green-700">{donation.matchedDonor.name}</span>
                        ) : donation.shouldCreate ? (
                          <span className="text-blue-600 italic">Es crearà</span>
                        ) : (
                          <span className="text-muted-foreground">Assignació manual</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {donation.status !== 'found' && donation.shouldCreate && (
                          <Input
                            value={donation.zipCode}
                            onChange={(e) => handleZipCodeChange(index, e.target.value)}
                            className="w-20 h-8 text-xs"
                            placeholder="CP"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Resum final */}
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p>
                <strong>Acció:</strong> Es crearan{' '}
                <span className="text-blue-600 font-medium">{stats.toCreate} donants nous</span>{' '}
                i <span className="font-medium">{parsedDonations.length} transaccions</span>.
                La transacció original s'eliminarà.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar al Mapejat
              </Button>
              <Button onClick={handleProcess} disabled={isProcessing}>
                {isProcessing ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Processar {parsedDonations.length} donacions
              </Button>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 4: PROCESSING
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Processant remesa...</p>
            <p className="text-sm text-muted-foreground">
              Creant {stats.toCreate} donants i {parsedDonations.length} transaccions
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}