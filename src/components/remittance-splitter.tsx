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
import { useToast } from '@/hooks/use-toast';
import { useAppLog } from '@/hooks/use-app-log';
import type { Transaction, Donor } from '@/lib/data';
import Papa from 'papaparse';
import { FileUp, Loader2, Info, CheckCircle2, AlertCircle, UserPlus, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

interface RemittanceSplitterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  existingDonors: Donor[];
  onSplitDone: () => void;
}

interface CsvRow {
  [key: string]: string | undefined;
}

// Resultat de l'anàlisi de cada fila del CSV
interface ParsedDonation {
  rowIndex: number;
  name: string;
  taxId: string;
  amount: number;
  // Resultat de la cerca
  status: 'found' | 'new_with_taxid' | 'new_without_taxid';
  matchedDonor: Donor | null;
  // Per a donants nous
  shouldCreate: boolean;
  // Codi postal per a nous donants (editable)
  zipCode: string;
}

type Step = 'upload' | 'preview' | 'processing';

// Normalization function to compare names robustly
const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
};

export function RemittanceSplitter({
  open,
  onOpenChange,
  transaction,
  existingDonors,
  onSplitDone,
}: RemittanceSplitterProps) {
  const [step, setStep] = React.useState<Step>('upload');
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [parsedDonations, setParsedDonations] = React.useState<ParsedDonation[]>([]);
  const [totalAmount, setTotalAmount] = React.useState(0);
  const [defaultZipCode, setDefaultZipCode] = React.useState('08001');
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();

  // Reset quan es tanca el diàleg
  React.useEffect(() => {
    if (!open) {
      setStep('upload');
      setParsedDonations([]);
      setTotalAmount(0);
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

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      parseFile(file);
    }
    event.target.value = '';
  };

  const findHeader = (row: CsvRow, potentialNames: string[]): string | undefined => {
    const headers = Object.keys(row);
    for (const name of potentialNames) {
      const foundHeader = headers.find(h => normalizeString(h) === normalizeString(name));
      if (foundHeader) return foundHeader;
    }
    return undefined;
  };

  const findDonor = (name: string, taxId: string, donors: Donor[]): Donor | undefined => {
    const normalizedCsvName = normalizeString(name);
    const csvNameTokens = new Set(normalizedCsvName.split(' ').filter(Boolean));

    // 1. Buscar per DNI/CIF (més fiable)
    if (taxId) {
      const normalizedTaxId = normalizeString(taxId);
      const foundByTaxId = donors.find(d => normalizeString(d.taxId) === normalizedTaxId);
      if (foundByTaxId) {
        return foundByTaxId;
      }
    }

    // 2. Buscar per nom (flexible)
    if (normalizedCsvName) {
      const potentialMatches = donors.filter(d => {
        const normalizedDonorName = normalizeString(d.name);
        if (!normalizedDonorName) return false;
        const donorNameTokens = normalizedDonorName.split(' ').filter(Boolean);
        return [...csvNameTokens].every(token => donorNameTokens.includes(token));
      });

      if (potentialMatches.length === 1) {
        return potentialMatches[0];
      }
    }

    return undefined;
  };

  const parseFile = (file: File) => {
    if (!organizationId) {
      toast({ variant: 'destructive', title: t.common.error, description: 'No s\'ha pogut identificar l\'organització.' });
      return;
    }

    setIsProcessing(true);
    log(`[Splitter] Analitzant arxiu: ${file.name}`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as CsvRow[];
        log(`[Splitter] CSV analitzat. ${data.length} files trobades.`);

        try {
          const { donations, total } = analyzeCsvData(data);
          
          // Validar que l'import coincideix
          if (Math.abs(transaction.amount - total) > 0.01) {
            throw new Error(`L'import total del CSV (${total.toFixed(2)} €) no coincideix amb la transacció (${transaction.amount.toFixed(2)} €).`);
          }

          setParsedDonations(donations);
          setTotalAmount(total);
          setStep('preview');
          log(`[Splitter] Anàlisi completada. ${donations.length} donacions processades.`);

        } catch (error: any) {
          console.error("Error analyzing CSV:", error);
          log(`[Splitter] ERROR: ${error.message}`);
          toast({
            variant: 'destructive',
            title: t.common.error,
            description: error.message,
            duration: 9000,
          });
        } finally {
          setIsProcessing(false);
        }
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        log(`[Splitter] ERROR de PapaParse: ${error.message}`);
        toast({
          variant: 'destructive',
          title: t.common.error,
          description: error.message,
        });
        setIsProcessing(false);
      },
    });
  };

  const analyzeCsvData = (data: CsvRow[]): { donations: ParsedDonation[], total: number } => {
    const donations: ParsedDonation[] = [];
    let total = 0;

    if (data.length === 0) {
      throw new Error('L\'arxiu CSV està buit.');
    }

    // Trobar capçaleres dinàmicament
    const firstRow = data[0];
    const nameHeader = findHeader(firstRow, ['nom', 'nombre', 'deudor', 'name']);
    const taxIdHeader = findHeader(firstRow, ['dni', 'cif', 'nif', 'dni/cif', 'taxid']);
    const amountHeader = findHeader(firstRow, ['import', 'importe', 'cuantía', 'amount', 'quantitat']);

    if (!amountHeader || (!nameHeader && !taxIdHeader)) {
      throw new Error('Capçaleres no trobades. Cal una columna d\'import i una de nom o DNI.');
    }

    data.forEach((row, index) => {
      const name = nameHeader ? (row[nameHeader] || '').trim() : '';
      const taxId = taxIdHeader ? (row[taxIdHeader] || '').trim().toUpperCase() : '';
      const amountStr = row[amountHeader] || '0';
      
      const amount = parseFloat(amountStr.replace(/[^0-9,-]+/g, '').replace(',', '.'));

      if ((!name && !taxId) || isNaN(amount) || amount <= 0) {
        log(`[Splitter] Fila ${index + 2} invàlida o buida, s'omet.`);
        return;
      }

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
        rowIndex: index + 2,
        name,
        taxId,
        amount,
        status,
        matchedDonor,
        shouldCreate: status !== 'found', // Per defecte, crear els nous
        zipCode: defaultZipCode,
      });
    });

    return { donations, total };
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

      // Mapa per guardar els IDs dels nous donants creats
      const newDonorIds: Map<number, string> = new Map();

      // 1. Crear nous donants
      const donorsToCreate = parsedDonations.filter(d => d.status !== 'found' && d.shouldCreate);
      log(`[Splitter] Creant ${donorsToCreate.length} nous donants...`);

      for (const donation of donorsToCreate) {
        const newDonorRef = doc(contactsRef);
        const now = new Date().toISOString();

        const newDonorData: Omit<Donor, 'id'> = {
          type: 'donor',
          name: donation.name,
          taxId: donation.taxId,
          zipCode: donation.zipCode,
          donorType: 'individual',
          membershipType: 'one-time',
          createdAt: now,
        };

        batch.set(newDonorRef, newDonorData);
        newDonorIds.set(donation.rowIndex, newDonorRef.id);
        log(`[Splitter] Nou donant preparat: ${donation.name} (${donation.taxId || 'sense DNI'})`);
      }

      // 2. Eliminar transacció original
      batch.delete(doc(transactionsRef, transaction.id));
      log(`[Splitter] Transacció original marcada per eliminar: ${transaction.id}`);

      // 3. Crear noves transaccions
      for (const donation of parsedDonations) {
        const newTxRef = doc(transactionsRef);
        
        // Determinar contactId
        let contactId: string | null = null;
        if (donation.matchedDonor) {
          contactId = donation.matchedDonor.id;
        } else if (donation.shouldCreate) {
          contactId = newDonorIds.get(donation.rowIndex) || null;
        }

        const newTxData: Omit<Transaction, 'id'> = {
          date: transaction.date,
          description: `Donació soci/a: ${donation.name || donation.taxId}`,
          amount: donation.amount,
          category: 'donations',
          document: null,
          contactId,
          contactType: contactId ? 'donor' : undefined,
          projectId: transaction.projectId,
        };

        batch.set(newTxRef, { ...newTxData, id: newTxRef.id });
      }

      // 4. Executar tot en una operació atòmica
      await batch.commit();

      log(`[Splitter] ✅ Processament completat!`);
      log(`[Splitter] - ${donorsToCreate.length} donants creats`);
      log(`[Splitter] - ${parsedDonations.length} transaccions creades`);
      log(`[Splitter] - 1 transacció original eliminada`);

      toast({
        title: 'Remesa processada correctament!',
        description: `S'han creat ${parsedDonations.length} donacions${donorsToCreate.length > 0 ? ` i ${donorsToCreate.length} nous donants` : ''}.`,
      });

      onSplitDone();

    } catch (error: any) {
      console.error("Error processing remittance:", error);
      log(`[Splitter] ERROR: ${error.message}`);
      toast({
        variant: 'destructive',
        title: t.common.error,
        description: error.message,
        duration: 9000,
      });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERITZACIÓ
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={step === 'preview' ? "sm:max-w-4xl max-h-[90vh]" : "sm:max-w-md"}>
        
        {/* ═══════════════════════════════════════════════════════════════════
            STEP 1: UPLOAD
            ═══════════════════════════════════════════════════════════════════ */}
        {step === 'upload' && (
          <>
            <DialogHeader>
              <DialogTitle>{t.movements.splitter.title}</DialogTitle>
              <DialogDescription>
                {t.movements.splitter.description}
              </DialogDescription>
            </DialogHeader>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{t.movements.splitter.formatInfo}</AlertTitle>
              <AlertDescription>
                {t.movements.splitter.formatDescription}
                <ul className="list-disc pl-5 mt-2 text-xs">
                  <li><b>{t.movements.splitter.formatColumns.name}</b></li>
                  <li><b>{t.movements.splitter.formatColumns.amount}</b></li>
                </ul>
                <p className="mt-2 text-xs">{t.movements.splitter.formatNote}</p>
              </AlertDescription>
            </Alert>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
              disabled={isProcessing}
            />

            <Button onClick={handleFileClick} disabled={isProcessing}>
              {isProcessing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileUp className="mr-2 h-4 w-4" />
              )}
              {isProcessing ? 'Analitzant...' : t.movements.splitter.uploadButton}
            </Button>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  {t.movements.splitter.close}
                </Button>
              </DialogClose>
            </DialogFooter>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            STEP 2: PREVIEW
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
              <AlertTitle>Import total: {formatCurrency(totalAmount)}</AlertTitle>
              <AlertDescription>
                Coincideix amb la transacció original ({formatCurrency(transaction.amount)}) ✓
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
            <ScrollArea className="h-[300px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">Crear</TableHead>
                    <TableHead>Nom (CSV)</TableHead>
                    <TableHead>DNI (CSV)</TableHead>
                    <TableHead className="text-right">Import</TableHead>
                    <TableHead>Estat</TableHead>
                    <TableHead>A la BBDD</TableHead>
                    <TableHead className="w-[100px]">Codi Postal</TableHead>
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
                        {formatCurrency(donation.amount)}
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
              <Button variant="outline" onClick={() => setStep('upload')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Tornar
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
            STEP 3: PROCESSING
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