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
import { useToast } from '@/hooks/use-toast';
import { useAppLog } from '@/hooks/use-app-log';
import type { Transaction, Donor } from '@/lib/data';
import Papa from 'papaparse';
import { FileUp, Loader2, Info } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

interface RemittanceSplitterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction;
  // CANVI: Emisor[] -> Donor[]
  existingDonors: Donor[];
  onSplitDone: () => void;
}

interface CsvRow {
  [key: string]: string | undefined;
}

// Normalization function to compare names robustly
const normalizeString = (str: string): string => {
    if (!str) return '';
    return str
        .toLowerCase()
        .normalize("NFD") // Decompose accented characters
        .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
        .trim();
};

export function RemittanceSplitter({
  open,
  onOpenChange,
  transaction,
  // CANVI: existingEmissors -> existingDonors
  existingDonors,
  onSplitDone,
}: RemittanceSplitterProps) {
  const [isProcessing, setIsProcessing] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const processFile = (file: File) => {
    if (!organizationId) {
      toast({ variant: 'destructive', title: t.common.error, description: 'No s\'ha pogut identificar l\'organització.' });
      return;
    }
    setIsProcessing(true);
    log(`[Splitter] Iniciando procesado de remesa desde el archivo: ${file.name}`);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as CsvRow[];
        log(`[Splitter] Archivo CSV parseado. ${data.length} filas encontradas.`);
        
        try {
            const { newTransactions, totalAmount } = processCsvData(data);
            
            // Allow a small tolerance for floating point inaccuracies
            if (Math.abs(transaction.amount - totalAmount) > 0.01) {
                throw new Error(t.movements.splitter.errorAmountMismatch(totalAmount.toFixed(2), transaction.amount.toFixed(2)));
            }

            const transactionsCollectionRef = collection(firestore, 'organizations', organizationId, 'transactions');
            const batch = writeBatch(firestore);

            // Delete original transaction
            batch.delete(doc(transactionsCollectionRef, transaction.id));

            // Add new transactions
            newTransactions.forEach(tx => {
              const newDocRef = doc(transactionsCollectionRef); // Firestore will generate an ID
              batch.set(newDocRef, { ...tx, id: newDocRef.id });
            });
            
            await batch.commit();

            log(`[Splitter] Procesamiento completado. ${newTransactions.length} transacciones creadas.`);
            toast({
                title: t.movements.splitter.successToast,
                description: t.movements.splitter.successToastDescription(newTransactions.length),
            });
            onSplitDone();

        } catch (error: any) {
            console.error("Error processing remittance file:", error);
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
  
  const findHeader = (row: CsvRow, potentialNames: string[]): string | undefined => {
      const headers = Object.keys(row);
      for (const name of potentialNames) {
          const foundHeader = headers.find(h => normalizeString(h) === normalizeString(name));
          if (foundHeader) return foundHeader;
      }
      return undefined;
  }
  
  // CANVI: findEmisor -> findDonor
  const findDonor = (name: string, taxId: string, donors: Donor[]): Donor | undefined => {
      const normalizedCsvName = normalizeString(name);
      const csvNameTokens = new Set(normalizedCsvName.split(' ').filter(Boolean));

      // 1. Find by Tax ID (most reliable)
      if (taxId) {
          const normalizedTaxId = normalizeString(taxId);
          const foundByTaxId = donors.find(d => normalizeString(d.taxId) === normalizedTaxId);
          if (foundByTaxId) {
              log(`[Splitter] Donant trobat per DNI/CIF: "${name || taxId}" -> ${foundByTaxId.name} (${foundByTaxId.taxId})`);
              return foundByTaxId;
          }
      }
      
      // 2. If not found by Tax ID, find by flexible name matching
      if (normalizedCsvName) {
           const potentialMatches = donors.filter(d => {
              const normalizedDonorName = normalizeString(d.name);
              if (!normalizedDonorName) return false;
              const donorNameTokens = normalizedDonorName.split(' ').filter(Boolean);
              // Check if all tokens from the CSV name are present in the donor's name
              return [...csvNameTokens].every(token => donorNameTokens.includes(token));
          });
          
          if (potentialMatches.length === 1) {
              log(`[Splitter] Donant trobat per coincidència de nom: "${name}" -> ${potentialMatches[0].name}`);
              return potentialMatches[0];
          }

          if (potentialMatches.length > 1) {
              log(`[Splitter] AVÍS: Múltiples coincidències per "${name}". Es requereix assignació manual.`);
          }
      }

      return undefined;
  }


  const processCsvData = (data: CsvRow[]) => {
    const newTransactions: Omit<Transaction, 'id'>[] = [];
    let totalAmount = 0;

    if (data.length === 0) {
      throw new Error(t.movements.splitter.errorEmptyFile);
    }
    
    // Dynamically find header names
    const firstRow = data[0];
    const nameHeader = findHeader(firstRow, ['nom', 'nombre', 'deudor']);
    const taxIdHeader = findHeader(firstRow, ['dni', 'cif', 'nif', 'dni/cif']);
    const amountHeader = findHeader(firstRow, ['import', 'importe', 'cuantía']);

    if (!amountHeader || (!nameHeader && !taxIdHeader)) {
        throw new Error(t.movements.splitter.errorInvalidHeaders);
    }

    data.forEach((row, index) => {
      const name = nameHeader ? row[nameHeader] || '' : '';
      const taxId = taxIdHeader ? row[taxIdHeader] || '' : '';
      const amountStr = row[amountHeader] || '0';
      
      const amount = parseFloat(amountStr.replace(/[^0-9,-]+/g, '').replace(',', '.'));

      if ((!name && !taxId) || isNaN(amount)) {
        log(`[Splitter] Fila ${index + 2} invàlida, s'omet: ${JSON.stringify(row)}`);
        return;
      }
      
      totalAmount += amount;
      
      // CANVI: findEmisor -> findDonor
      const donor = findDonor(name, taxId, existingDonors);
      
      if (!donor) {
          log(`[Splitter] AVÍS: No s'ha pogut trobar un donant per la fila ${index + 2} ("${name || taxId}"). El moviment necessitarà assignació manual.`);
      }

      // CANVI: emisorId -> contactId + contactType
      const newTransaction: Omit<Transaction, 'id'> = {
        date: transaction.date,
        description: `Donació soci/a: ${name || taxId}`,
        amount: amount,
        category: 'donations', // Default category key for remittances
        document: null,
        contactId: donor ? donor.id : null,
        contactType: donor ? 'donor' : undefined,
        projectId: transaction.projectId, // Inherit project from original transaction
      };
      newTransactions.push(newTransaction);
    });

    return { newTransactions, totalAmount };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
          {isProcessing ? t.movements.splitter.processing : t.movements.splitter.uploadButton}
        </Button>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              {t.movements.splitter.close}
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}