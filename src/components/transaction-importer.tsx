'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2, ChevronDown, Trash2, ListPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, AnyContact } from '@/lib/data';
import { detectReturnType } from '@/lib/data';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { inferContact } from '@/ai/flows/infer-contact';
import { useAppLog } from '@/hooks/use-app-log';
import { normalizeTransaction } from '@/lib/normalize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';


type ImportMode = 'append' | 'replace';

interface TransactionImporterProps {
  existingTransactions: Transaction[];
}

// Function to create a unique key for a transaction to detect duplicates
const createTransactionKey = (tx: { date: string, description: string, amount: number }): string => {
  const date = new Date(tx.date).toISOString().split('T')[0]; // Normalize date to YYYY-MM-DD
  return `${date}|${tx.description.trim()}|${tx.amount.toFixed(2)}`;
};

const findColumnIndex = (header: string[], potentialNames: string[]): number => {
    for (const name of potentialNames) {
        const index = header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
        if (index !== -1) return index;
    }
    return -1;
}

// Keywords to identify the header row
const headerKeywords = ['fecha', 'concepto', 'importe', 'descrip', 'amount'];

const isHeaderRow = (row: any[]): boolean => {
    const rowString = row.join(' ').toLowerCase();
    // A row is considered a header if it contains at least a few of the keywords
    const matches = headerKeywords.filter(keyword => rowString.includes(keyword)).length;
    return matches >= 2;
};


export function TransactionImporter({ existingTransactions }: TransactionImporterProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importMode, setImportMode] = React.useState<ImportMode>('append');
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t } = useTranslations();

  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: availableContacts } = useCollection<AnyContact>(contactsQuery);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        if (importMode === 'replace') {
            setPendingFile(file);
            setIsAlertOpen(true);
        } else {
            startImportProcess(file, 'append');
        }
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const handleConfirmReplace = () => {
    setIsAlertOpen(false);
    if (pendingFile) {
        startImportProcess(pendingFile, 'replace');
        setPendingFile(null);
    }
  }
  
  const startImportProcess = (file: File, mode: ImportMode) => {
    setIsImporting(true);
    log(`Iniciando importación en modo: ${mode}`);
    if (file.name.endsWith('.csv')) {
        parseCsv(file, mode);
    } else if (file.name.endsWith('.xlsx')) {
        parseXlsx(file, mode);
    } else {
        toast({
            variant: 'destructive',
            title: t.importers.transaction.errors.unsupportedFormat,
            description: t.importers.transaction.errors.unsupportedFormatDescription,
        });
        setIsImporting(false);
    }
  }
  
  const parseXlsx = (file: File, mode: ImportMode) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (!json || json.length === 0) {
            throw new Error(t.importers.transaction.errors.emptyXlsx);
        }
        
        let headerRowIndex = -1;
        for(let i = 0; i < json.length; i++) {
            if (isHeaderRow(json[i] as any[])) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
             throw new Error(t.importers.transaction.errors.headerNotFound);
        }
        
        const header = (json[headerRowIndex] as string[]).map(h => String(h || '').trim());
        log(`Cabecera encontrada en la fila ${headerRowIndex + 1}: ${header.join(', ')}`);
        
        const dateIndex = findColumnIndex(header, ['fecha operación', 'fecha', 'data']);
        const conceptIndex = findColumnIndex(header, ['concepto', 'descripció', 'description']);
        const amountIndex = findColumnIndex(header, ['importe', 'import', 'amount', 'quantitat']);

        if (dateIndex === -1 || conceptIndex === -1 || amountIndex === -1) {
            const missing = [
                ...(dateIndex === -1 ? ['Fecha'] : []),
                ...(conceptIndex === -1 ? ['Concepto'] : []),
                ...(amountIndex === -1 ? ['Importe'] : [])
            ].join(', ');
            throw new Error(t.importers.transaction.errors.requiredColumnsNotFound(missing));
        }

        const dataRows = json.slice(headerRowIndex + 1);
        const parsedData = dataRows.map((row: any) => ({
            Fecha: row[dateIndex],
            Concepto: row[conceptIndex],
            Importe: row[amountIndex]
        }));

        processParsedData(parsedData, mode);
      } catch (error: any) {
        console.error("Error processing XLSX data:", error);
        toast({
          variant: 'destructive',
          title: t.importers.transaction.errors.importError,
          description: error.message || t.importers.transaction.errors.cannotProcessXlsx,
          duration: 9000,
        });
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
         toast({
          variant: 'destructive',
          title: t.importers.transaction.errors.readError,
          description: t.importers.transaction.errors.cannotReadFile,
        });
        setIsImporting(false);
    }
    reader.readAsArrayBuffer(file);
  }

  const parseCsv = (file: File, mode: ImportMode) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processParsedData(results.data, mode);
      },
      error: (error) => {
        console.error("PapaParse error:", error);
        toast({
          variant: 'destructive',
          title: t.importers.transaction.errors.importError,
          description: t.importers.transaction.errors.cannotReadCsv,
        });
        setIsImporting(false);
      }
    });
  };

  const processParsedData = async (data: any[], mode: ImportMode) => {
     if (!organizationId) {
        toast({ variant: 'destructive', title: t.importers.transaction.errors.processingError, description: t.importers.transaction.errors.cannotIdentifyOrg });
        setIsImporting(false);
        return;
     }
    const existingTransactionKeys = new Set(existingTransactions.map(createTransactionKey));
    log(`Iniciando procesamiento de ${data.length} filas.`);

    try {
        const allParsedRows = data
        .map((row: any, index: number) => {
            const dateValue = row.Fecha || row.fecha || row['Fecha Operación'] || row['fecha operación'];
            const descriptionValue = row.Concepto || row.concepto || row.description || row.descripción;
            let amountValue = row.Importe || row.importe || row.amount;

            if (typeof amountValue === 'string') {
                amountValue = amountValue.replace('.', '').replace(',', '.'); // Handle thousand separators and decimal commas
            }
            const amount = parseFloat(amountValue);
            
            if (!dateValue || !descriptionValue || isNaN(amount)) {
                log(`Fila ${index + 2} inválida o vacía, saltando: ${JSON.stringify(row)}`);
                return null;
            }

            let date;
             if (dateValue instanceof Date) {
                date = dateValue;
            } else {
                const dateString = String(dateValue);
                const parts = dateString.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
                if (parts) {
                    const day = parseInt(parts[1], 10);
                    const month = parseInt(parts[2], 10);
                    let year = parseInt(parts[3], 10);
                    if (year < 100) year += 2000; 

                    if (month > 12 && day <= 12) { // Likely MM/DD/YYYY
                         date = new Date(year, month - 1, day);
                    } else { // Assume DD/MM/YYYY
                         date = new Date(year, month - 1, day);
                    }
                } else {
                    date = new Date(dateString); // Fallback for ISO strings or other formats
                }
            }


            if (isNaN(date.getTime())) {
                log(`Fila ${index + 2} con fecha inválida, saltando: ${JSON.stringify(row)}`);
                return null;
            }

            const transactionType = detectReturnType(descriptionValue) || 'normal';

            return {
                id: '', // Will be set by firestore
                date: date.toISOString(),
                description: descriptionValue,
                amount: amount,
                category: null,
                document: null,
                contactId: null,
                contactType: undefined,
                transactionType,
            } as Omit<Transaction, 'id'>;
        })
        .filter((tx): tx is Omit<Transaction, 'id'> => tx !== null);
        
        let transactionsToProcess = allParsedRows;
        let duplicatesFound = 0;

        if (mode === 'append') {
            transactionsToProcess = allParsedRows.filter(tx => {
                const key = createTransactionKey(tx as Transaction);
                const isDuplicate = existingTransactionKeys.has(key);
                if (isDuplicate) {
                    log(`Transacción duplicada encontrada y omitida: ${key}`);
                }
                return !isDuplicate;
            });
            duplicatesFound = allParsedRows.length - transactionsToProcess.length;
            log(`${transactionsToProcess.length} transacciones únicas encontradas. ${duplicatesFound} duplicados omitidos.`);
        }


        if (transactionsToProcess.length > 0) {
            // Desactivar auto-match amb IA si hi ha més de 50 transaccions (triga massa)
            const SKIP_AI_THRESHOLD = 50;
            const useAI = transactionsToProcess.length <= SKIP_AI_THRESHOLD;

            let transactionsWithContacts: any[] = [];

            log(`📊 Transacciones a procesar: ${transactionsToProcess.length}`);
            log(`👥 Contactos disponibles: ${availableContacts?.length || 0}`);
            log(`🤖 Auto-match con IA: ${useAI ? 'ACTIVADO' : 'DESACTIVADO'} (threshold: ${SKIP_AI_THRESHOLD})`);

            if (useAI) {
                log('🔍 Iniciando inferencia de contactos con IA...');
                const contactsForAI = availableContacts?.map(c => ({ id: c.id, name: c.name })) || [];
                log(`Contactos para IA: ${JSON.stringify(contactsForAI.slice(0, 5))}...`);

                // Processar en lots per evitar superar la quota de l'API
                // Quota gratuïta: 15 peticions/minut → processa 10 cada minut
                const BATCH_SIZE = 10;  // Processar 10 transaccions per minut
                const DELAY_MS = 60000; // Esperar 60 segons entre lots (1 minut)

                for (let i = 0; i < transactionsToProcess.length; i += BATCH_SIZE) {
                    const batch = transactionsToProcess.slice(i, i + BATCH_SIZE);
                    log(`Procesando lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(transactionsToProcess.length / BATCH_SIZE)} (${batch.length} transacciones)...`);

                    const batchResults = await Promise.all(batch.map(async (tx, batchIndex) => {
                        const index = i + batchIndex;
                        try {
                            const result = await inferContact({ description: tx.description, contacts: contactsForAI });
                            if (result.contactId) {
                               const contact = availableContacts?.find(c => c.id === result.contactId);
                               if (contact) {
                                   log(`✅ [Fila ${index + 1}] Match: ${contact.name} (${contact.type}) - "${tx.description.substring(0,30)}..."`);
                                   return { ...tx, contactId: result.contactId, contactType: contact.type };
                               } else {
                                   log(`⚠️ [Fila ${index + 1}] ID no trobat: ${result.contactId} - "${tx.description.substring(0,30)}..."`);
                                   return { ...tx, contactId: result.contactId, contactType: undefined };
                               }
                            } else {
                               log(`⚠️ [Fila ${index + 1}] IA no troba match - "${tx.description.substring(0,40)}..."`);
                            }
                        } catch (error) {
                            console.error("Error inferring contact for a transaction:", error);
                            log(`❌ ERROR en inferencia de contacto para fila ${index + 1}: ${error}`);
                        }
                        return tx;
                    }));

                    transactionsWithContacts.push(...batchResults);

                    // Esperar entre lots (excepte l'últim)
                    if (i + BATCH_SIZE < transactionsToProcess.length) {
                        log(`Esperando ${DELAY_MS / 1000}s antes del siguiente lote...`);
                        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }
            } else {
                // Més de 50 transaccions: importar sense auto-match (massa lent amb la quota gratuïta)
                log(`Se omite la inferencia de contactos con IA (${transactionsToProcess.length} > ${SKIP_AI_THRESHOLD} transacciones)`);
                transactionsWithContacts = transactionsToProcess;
            }

            const transactionsCollectionRef = collection(firestore, 'organizations', organizationId, 'transactions');
            const batch = writeBatch(firestore);

            if (mode === 'replace') {
                existingTransactions.forEach(tx => {
                    batch.delete(doc(transactionsCollectionRef, tx.id));
                })
            }
            
            transactionsWithContacts.forEach(tx => {
                const newDocRef = doc(transactionsCollectionRef);
                const normalizedTx = normalizeTransaction(tx);
                batch.set(newDocRef, normalizedTx);
            });

            await batch.commit();

            toast({
                title: t.importers.transaction.importSuccess,
                description: t.importers.transaction.importSuccessDescription(transactionsToProcess.length, mode, duplicatesFound),
            });
            log('¡Éxito! Importación completada.');

        } else {
             toast({
                title: mode === 'append' && duplicatesFound > 0 ? t.importers.transaction.noNewTransactions : t.importers.transaction.noTransactionsFound,
                description: mode === 'append' && duplicatesFound > 0
                    ? t.importers.transaction.duplicatesOmitted(duplicatesFound)
                    : t.importers.transaction.noValidTransactions,
             });
             log('No se encontraron transacciones nuevas para importar.');
        }
    } catch (error: any) {
        console.error("Error processing parsed data:", error);
        toast({
        variant: 'destructive',
        title: t.importers.transaction.errors.processingError,
        description: error.message || t.importers.transaction.errors.cannotProcessContent,
        });
        log(`ERROR: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  }


  const handleMenuClick = (mode: ImportMode) => {
    setImportMode(mode);
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        className="hidden"
        disabled={isImporting}
      />
      <div className="flex items-center rounded-md">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                 <Button disabled={isImporting} className="rounded-r-none">
                    {isImporting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <FileUp className="mr-2 h-4 w-4" />
                    )}
                    {t.importers.transaction.title}
                    <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleMenuClick('append')}>
                    <ListPlus className="mr-2 h-4 w-4" />
                    <span>{t.importers.transaction.addMovements}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleMenuClick('replace')} className="text-red-500">
                     <Trash2 className="mr-2 h-4 w-4" />
                    <span>{t.importers.transaction.replaceAll}</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>

       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.importers.transaction.replaceAllWarning}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.importers.transaction.replaceAllDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>{t.importers.transaction.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReplace}>
              {t.importers.transaction.confirmReplace}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
