'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2, ChevronDown, Trash2, ListPlus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, AnyContact } from '@/lib/data';
import { detectReturnType } from '@/lib/data';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { inferContact } from '@/ai/flows/infer-contact';
import { findMatchingContact } from '@/lib/auto-match';
import { useAppLog } from '@/hooks/use-app-log';
import { normalizeTransaction } from '@/lib/normalize';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import Link from 'next/link';


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
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = React.useState<string | null>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  const { t } = useTranslations();

  // Bank accounts
  const { bankAccounts, defaultAccountId, isLoading: isLoadingBankAccounts } = useBankAccounts();

  // Pre-seleccionar el compte per defecte quan es carreguen
  React.useEffect(() => {
    if (defaultAccountId && !selectedBankAccountId) {
      setSelectedBankAccountId(defaultAccountId);
    } else if (bankAccounts.length > 0 && !selectedBankAccountId) {
      setSelectedBankAccountId(bankAccounts[0].id);
    }
  }, [defaultAccountId, bankAccounts, selectedBankAccountId]);

  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: availableContacts } = useCollection<AnyContact>(contactsQuery);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setPendingFile(file);
        // Sempre mostrar el diàleg de selecció de compte
        setIsAccountDialogOpen(true);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  const handleAccountSelected = () => {
    setIsAccountDialogOpen(false);
    if (!pendingFile) return;

    if (importMode === 'replace') {
        setIsAlertOpen(true);
    } else {
        startImportProcess(pendingFile, 'append', selectedBankAccountId);
        setPendingFile(null);
    }
  };

  const handleConfirmReplace = () => {
    setIsAlertOpen(false);
    if (pendingFile) {
        startImportProcess(pendingFile, 'replace', selectedBankAccountId);
        setPendingFile(null);
    }
  }

  const startImportProcess = (file: File, mode: ImportMode, bankAccountId: string | null) => {
    setIsImporting(true);
    log(`Iniciando importación en modo: ${mode}, cuenta bancaria: ${bankAccountId || 'ninguna'}`);
    if (file.name.endsWith('.csv')) {
        parseCsv(file, mode, bankAccountId);
    } else if (file.name.endsWith('.xlsx')) {
        parseXlsx(file, mode, bankAccountId);
    } else {
        toast({
            variant: 'destructive',
            title: t.importers.transaction.errors.unsupportedFormat,
            description: t.importers.transaction.errors.unsupportedFormatDescription,
        });
        setIsImporting(false);
    }
  }
  
  const parseXlsx = (file: File, mode: ImportMode, bankAccountId: string | null) => {
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

        processParsedData(parsedData, mode, bankAccountId);
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

  const parseCsv = (file: File, mode: ImportMode, bankAccountId: string | null) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        processParsedData(results.data, mode, bankAccountId);
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

  const processParsedData = async (data: any[], mode: ImportMode, bankAccountId: string | null) => {
     if (!organizationId) {
        toast({ variant: 'destructive', title: t.importers.transaction.errors.processingError, description: t.importers.transaction.errors.cannotIdentifyOrg });
        setIsImporting(false);
        return;
     }
    const existingTransactionKeys = new Set(existingTransactions.map(createTransactionKey));
    log(`Iniciando procesamiento de ${data.length} filas con cuenta bancaria: ${bankAccountId || 'ninguna'}.`);

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
                bankAccountId: bankAccountId ?? null,
                source: 'bank' as const,
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
            log(`📊 Transacciones a procesar: ${transactionsToProcess.length}`);
            log(`👥 Contactos disponibles: ${availableContacts?.length || 0}`);

            // ═══════════════════════════════════════════════════════════════════
            // FASE 1: MATCHING PER NOM (instantani, sense IA)
            // ═══════════════════════════════════════════════════════════════════
            log('🔍 FASE 1: Matching per nom de contacte...');

            let matchedCount = 0;
            let unmatchedTransactions: Array<{ tx: any; index: number }> = [];

            const transactionsAfterNameMatch = transactionsToProcess.map((tx, index) => {
                if (!availableContacts || availableContacts.length === 0) {
                    unmatchedTransactions.push({ tx, index });
                    return tx;
                }

                const match = findMatchingContact(tx.description, availableContacts);

                if (match) {
                    matchedCount++;
                    // Obtenir el contacte complet per accedir a defaultCategoryId
                    const contact = availableContacts.find(c => c.id === match.contactId);
                    const defaultCategory = contact?.defaultCategoryId;
                    const willAssignCategory = defaultCategory && !tx.category;
                    log(`✅ [Fila ${index + 1}] Match per nom: "${match.contactName}" (${match.contactType})${willAssignCategory ? ` → categoria: ${defaultCategory}` : defaultCategory ? ' (ja té categoria)' : ' (sense cat. defecte)'} - confiança ${Math.round(match.confidence * 100)}% - "${tx.description.substring(0, 40)}..."`);
                    return {
                        ...tx,
                        contactId: match.contactId,
                        contactType: match.contactType,
                        // Auto-assignar categoria si el contacte en té i la transacció no
                        ...(willAssignCategory ? { category: defaultCategory } : {}),
                    };
                } else {
                    unmatchedTransactions.push({ tx, index });
                    return tx;
                }
            });

            const matchPercentage = Math.round((matchedCount / transactionsToProcess.length) * 100);
            log(`📈 Resultat FASE 1: ${matchedCount}/${transactionsToProcess.length} (${matchPercentage}%) transaccions amb match per nom`);

            // ═══════════════════════════════════════════════════════════════════
            // FASE 2: IA com a fallback (només per les no matchejades, si són poques)
            // ═══════════════════════════════════════════════════════════════════
            const AI_THRESHOLD = 20; // Només usar IA si queden menys de 20 sense match
            const useAI = unmatchedTransactions.length > 0 && unmatchedTransactions.length <= AI_THRESHOLD;

            log(`🤖 FASE 2 (IA): ${useAI ? `ACTIVADA per ${unmatchedTransactions.length} transaccions sense match` : `DESACTIVADA (${unmatchedTransactions.length} > ${AI_THRESHOLD} o ja totes matchejades)`}`);

            let transactionsWithContacts = [...transactionsAfterNameMatch];

            if (useAI && unmatchedTransactions.length > 0) {
                log('🔍 Iniciando inferencia con IA para transacciones sin match...');
                const contactsForAI = availableContacts?.map(c => ({ id: c.id, name: c.name })) || [];

                // Processar en lots per evitar superar la quota de l'API
                const BATCH_SIZE = 10;
                const DELAY_MS = 60000;
                let quotaExceeded = false;
                let aiMatchedCount = 0;

                for (let i = 0; i < unmatchedTransactions.length; i += BATCH_SIZE) {
                    if (quotaExceeded) break;

                    const batch = unmatchedTransactions.slice(i, i + BATCH_SIZE);
                    log(`Procesando lote IA ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(unmatchedTransactions.length / BATCH_SIZE)} (${batch.length} transacciones)...`);

                    await Promise.all(batch.map(async ({ tx, index }) => {
                        if (quotaExceeded) return;

                        try {
                            const result = await inferContact({ description: tx.description, contacts: contactsForAI });
                            if (result.contactId) {
                                const contact = availableContacts?.find(c => c.id === result.contactId);
                                if (contact) {
                                    aiMatchedCount++;
                                    const defaultCategory = contact.defaultCategoryId;
                                    const willAssignCategory = defaultCategory && !tx.category;
                                    log(`✅ [Fila ${index + 1}] Match IA: ${contact.name} (${contact.type})${willAssignCategory ? ` → categoria: ${defaultCategory}` : defaultCategory ? ' (ja té categoria)' : ' (sense cat. defecte)'} - "${tx.description.substring(0, 30)}..."`);
                                    transactionsWithContacts[index] = {
                                        ...tx,
                                        contactId: result.contactId,
                                        contactType: contact.type,
                                        // Auto-assignar categoria si el contacte en té i la transacció no
                                        ...(willAssignCategory ? { category: defaultCategory } : {}),
                                    };
                                }
                            } else {
                                log(`⚠️ [Fila ${index + 1}] IA no troba match - "${tx.description.substring(0, 40)}..."`);
                            }
                        } catch (error: any) {
                            console.error("Error inferring contact:", error);
                            log(`❌ ERROR IA fila ${index + 1}: ${error}`);

                            const errorMsg = error?.message || error?.toString() || '';
                            if (!quotaExceeded && (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit'))) {
                                log('⚠️ QUOTA EXCEDIDA - Desactivando IA');
                                quotaExceeded = true;
                                toast({
                                    variant: 'destructive',
                                    title: t.importers.transaction.errors.aiQuotaExceeded,
                                    description: t.importers.transaction.errors.aiQuotaExceededDescription,
                                    duration: 10000,
                                });
                            }
                        }
                    }));

                    // Esperar entre lots (excepte l'últim) si no s'ha excedit la quota
                    if (!quotaExceeded && i + BATCH_SIZE < unmatchedTransactions.length) {
                        log(`Esperando ${DELAY_MS / 1000}s antes del siguiente lote...`);
                        await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                    }
                }

                log(`📈 Resultat FASE 2 (IA): ${aiMatchedCount} transaccions addicionals amb match`);
            }

            // ═══════════════════════════════════════════════════════════════════
            // RESUM FINAL
            // ═══════════════════════════════════════════════════════════════════
            const finalMatched = transactionsWithContacts.filter(tx => tx.contactId).length;
            const finalPercentage = Math.round((finalMatched / transactionsToProcess.length) * 100);
            log(`🎯 RESUM FINAL: ${finalMatched}/${transactionsToProcess.length} (${finalPercentage}%) transaccions amb contacte assignat`)

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

      {/* Diàleg de selecció de compte bancari */}
      <Dialog open={isAccountDialogOpen} onOpenChange={(open) => {
        setIsAccountDialogOpen(open);
        if (!open) setPendingFile(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.settings.bankAccounts.selectAccount}</DialogTitle>
            <DialogDescription>
              {t.settings.bankAccounts.selectAccountRequired}
            </DialogDescription>
          </DialogHeader>

          {isLoadingBankAccounts ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                <span>{t.settings.bankAccounts.noAccountsWarning}</span>
              </div>
              <Button asChild variant="outline">
                <Link href={buildUrl('/configuracion')}>
                  {t.settings.bankAccounts.goToSettings}
                </Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">{t.settings.bankAccounts.name}</Label>
                  <Select
                    value={selectedBankAccountId ?? ''}
                    onValueChange={(value) => setSelectedBankAccountId(value)}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={t.settings.bankAccounts.selectAccount} />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                          {account.isDefault && ` (${t.settings.bankAccounts.default})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsAccountDialogOpen(false);
                    setPendingFile(null);
                  }}
                >
                  {t.common.cancel}
                </Button>
                <Button
                  onClick={handleAccountSelected}
                  disabled={!selectedBankAccountId}
                >
                  {t.common.continue}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

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
