'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2, ChevronDown, Trash2, ListPlus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, AnyContact, Category } from '@/lib/data';
import { detectReturnType } from '@/lib/data';
import { isCategoryIdCompatibleStrict } from '@/lib/constants';
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
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, writeBatch, doc, serverTimestamp, setDoc, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { createImportRunDoc, type ImportRun } from '@/lib/import-runs';
import { useTranslations } from '@/i18n';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { suggestPendingDocumentMatches } from '@/lib/pending-documents';
import { classifyTransactions, type ClassifiedRow } from '@/lib/transaction-dedupe';
import { DedupeCandidateResolver } from '@/components/dedupe-candidate-resolver';


type ImportMode = 'append' | 'replace';

// Firestore batch limit: max 50 operacions per batch
const BATCH_LIMIT = 50;

/**
 * Divideix un array en chunks de mida màxima
 */
function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

interface TransactionImporterProps {
  existingTransactions: Transaction[];
  availableCategories?: Category[] | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS PER DEDUPE GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula rang de dates (YYYY-MM-DD) d'un array de transaccions parsejades
 */
function getDateRangeFromParsedRows(txs: Array<{ date: string }>): { minDate: string; maxDate: string } | null {
  const dates = txs
    .map(tx => tx.date.split('T')[0]) // Normalitzar a YYYY-MM-DD
    .filter(Boolean)
    .sort();
  if (dates.length === 0) return null;
  return { minDate: dates[0], maxDate: dates[dates.length - 1] };
}

/**
 * Fetch global de transaccions existents per (orgId, bankAccountId, rang de dates)
 * Paginat per si hi ha >500 moviments al rang
 */
async function fetchExistingTransactionsForDedupe(
  firestore: ReturnType<typeof import('@/firebase').useFirebase>['firestore'],
  orgId: string,
  bankAccountId: string,
  minDate: string,
  maxDate: string
): Promise<Transaction[]> {
  const txRef = collection(firestore, 'organizations', orgId, 'transactions');
  const results: Transaction[] = [];
  let lastDoc: any = null;

  // Loop paginat amb limit(500)
  while (true) {
    const baseConstraints = [
      where('bankAccountId', '==', bankAccountId),
      where('date', '>=', minDate),
      where('date', '<=', maxDate + '\uf8ff'), // Inclou YYYY-MM-DD i YYYY-MM-DDT...
      orderBy('date', 'asc'),
      limit(500)
    ];

    const q = lastDoc
      ? query(txRef, ...baseConstraints, startAfter(lastDoc))
      : query(txRef, ...baseConstraints);

    const snapshot = await getDocs(q);
    if (snapshot.empty) break;

    snapshot.docs.forEach(doc => {
      results.push({ id: doc.id, ...doc.data() } as Transaction);
    });

    if (snapshot.docs.length < 500) break;
    lastDoc = snapshot.docs[snapshot.docs.length - 1];
  }

  return results;
}

// ═══════════════════════════════════════════════════════════════════════════════

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


/**
 * Cerca un valor en rawRow per nom de columna (fuzzy, case-insensitive substring)
 */
const findRawValue = (rawRow: Record<string, any>, potentialNames: string[]): any => {
  for (const name of potentialNames) {
    if (rawRow[name] !== undefined && rawRow[name] !== null && rawRow[name] !== '') return rawRow[name];
  }
  const keys = Object.keys(rawRow);
  for (const name of potentialNames) {
    const key = keys.find(k => k.toLowerCase().includes(name.toLowerCase()));
    if (key && rawRow[key] !== undefined && rawRow[key] !== null && rawRow[key] !== '') return rawRow[key];
  }
  return null;
};

/**
 * Parseja un valor de data (Date, DD/MM/YYYY, YYYY-MM-DD) a YYYY-MM-DD string
 */
const parseSingleDate = (val: any): string | null => {
  if (!val) return null;
  let d: Date;
  if (val instanceof Date) {
    d = val;
  } else {
    const s = String(val);
    const parts = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (parts) {
      let year = parseInt(parts[3], 10);
      if (year < 100) year += 2000;
      d = new Date(year, parseInt(parts[2], 10) - 1, parseInt(parts[1], 10));
    } else {
      d = new Date(s);
    }
  }
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
};

export function TransactionImporter({ existingTransactions, availableCategories }: TransactionImporterProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [importMode, setImportMode] = React.useState<ImportMode>('append');
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = React.useState<string | null>(null);
  // UX: Avís inline i fricció per solapament
  const [lastImportedDate, setLastImportedDate] = React.useState<string | null>(null);
  const [overlapAcknowledged, setOverlapAcknowledged] = React.useState(false);
  // Dedupe 3 estats: candidats pendents de resolució
  const [classifiedResults, setClassifiedResults] = React.useState<ClassifiedRow[] | null>(null);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = React.useState(false);
  const [pendingImportContext, setPendingImportContext] = React.useState<{
    mode: ImportMode;
    bankAccountId: string;
    fileName: string | null;
    rawData: any[];
  } | null>(null);
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  const { t } = useTranslations();
  const { user } = useAuth();

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

  // Obtenir última data importada del compte seleccionat
  React.useEffect(() => {
    if (!organizationId || !selectedBankAccountId) {
      setLastImportedDate(null);
      return;
    }

    const fetchLastImportedDate = async () => {
      try {
        const txRef = collection(firestore, 'organizations', organizationId, 'transactions');
        const q = query(
          txRef,
          where('bankAccountId', '==', selectedBankAccountId),
          orderBy('date', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const lastTx = snapshot.docs[0].data();
          // Normalitzar a YYYY-MM-DD
          const dateStr = lastTx.date?.split('T')[0] || null;
          setLastImportedDate(dateStr);
        } else {
          setLastImportedDate(null);
        }
      } catch (error) {
        console.error('Error obtenint última data importada:', error);
        setLastImportedDate(null);
      }
    };

    fetchLastImportedDate();
  }, [organizationId, selectedBankAccountId, firestore]);

  // Reset checkbox quan canvia el compte o el fitxer
  React.useEffect(() => {
    setOverlapAcknowledged(false);
  }, [selectedBankAccountId, pendingFile]);

  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: availableContacts } = useCollection<AnyContact>(contactsQuery);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
        setPendingFile(file);
        // Si només hi ha 1 compte, pre-seleccionar-lo
        if (bankAccounts.length === 1) {
          setSelectedBankAccountId(bankAccounts[0].id);
        }
        // Sempre mostrar el diàleg per garantir que l'usuari veu l'avís de fricció
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

  /**
   * Detecta solapament amb transaccions existents i últim importRun
   */
  // La fricció de solapament ja es gestiona al diàleg de selecció de compte
  // Aquesta funció ara simplement passa les dades a processar
  const checkOverlapAndConfirm = async (parsedData: any[], mode: ImportMode, bankAccountId: string | null, fileName: string | null) => {
    classifyParsedData(parsedData, mode, bankAccountId, fileName);
  };

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

        const dateIndex = findColumnIndex(header, ['f. valor', 'fecha operación', 'fecha', 'f. ejecución', 'data']);
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
        const parsedData = dataRows.map((row: any) => {
            // Preservar totes les columnes per enrichment
            const _rawRow: Record<string, any> = {};
            header.forEach((h, idx) => { _rawRow[h] = row[idx]; });
            return {
              Fecha: row[dateIndex],
              Concepto: row[conceptIndex],
              Importe: row[amountIndex],
              _rawRow,
            };
        });

        checkOverlapAndConfirm(parsedData, mode, bankAccountId, file.name);
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

  /**
   * Detecta el separador més probable d'un CSV (`;` o `,`)
   */
  const detectCsvDelimiter = (text: string): string => {
    const firstLine = text.split('\n')[0] || '';
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const commaCount = (firstLine.match(/,/g) || []).length;
    return semicolonCount > commaCount ? ';' : ',';
  };

  /**
   * Parseja CSV amb suport per Triodos i altres bancs espanyols:
   * - Encoding: UTF-8 o ISO-8859-1 (latin1)
   * - Separador: `;` o `,` (autodetectat)
   * - Headers alternatius: F. ejecución, F. valor, Concepto, Importe
   */
  const parseCsv = async (file: File, mode: ImportMode, bankAccountId: string | null) => {
    // Funció auxiliar per llegir amb un encoding específic
    const readWithEncoding = (encoding: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsText(file, encoding);
      });
    };

    // Funció auxiliar per parsejar el text CSV
    const parseText = (text: string): Promise<any[]> => {
      return new Promise((resolve) => {
        const delimiter = detectCsvDelimiter(text);
        log(`Delimitador detectat: "${delimiter}"`);

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          delimiter,
          complete: (results) => {
            resolve(results.data);
          },
          error: () => {
            resolve([]);
          }
        });
      });
    };

    // Funció per verificar si les dades són vàlides (tenen transaccions processables)
    const hasValidTransactions = (data: any[]): boolean => {
      if (!data || data.length === 0) return false;

      // Comprovar si almenys una fila té les columnes necessàries
      for (const row of data.slice(0, 5)) { // Només mirem les primeres 5 files
        const dateValue = row.Fecha || row.fecha || row['Fecha Operación'] || row['fecha operación'] ||
                          row['F. ejecución'] || row['F. valor'] || row['F. Valor'] || row['F. Ejecución'];
        const descriptionValue = row.Concepto || row.concepto || row.description || row.descripción;
        const amountValue = row.Importe || row.importe || row.amount;

        if (dateValue && descriptionValue && amountValue !== undefined) {
          return true;
        }
      }
      return false;
    };

    try {
      // Intent 1: UTF-8
      let text = await readWithEncoding('UTF-8');
      let data = await parseText(text);

      if (!hasValidTransactions(data)) {
        log('UTF-8 no ha trobat transaccions vàlides, provant ISO-8859-1...');
        // Intent 2: ISO-8859-1 (latin1) - comú en bancs espanyols com Triodos
        text = await readWithEncoding('ISO-8859-1');
        data = await parseText(text);
      }

      if (hasValidTransactions(data)) {
        log(`CSV parsejat correctament: ${data.length} files`);
        checkOverlapAndConfirm(data, mode, bankAccountId, file.name);
      } else {
        log('No s\'han trobat transaccions vàlides en cap encoding');
        toast({
          variant: 'destructive',
          title: t.importers.transaction.errors.importError,
          description: t.importers.transaction.noValidTransactions,
        });
        setIsImporting(false);
      }
    } catch (error) {
      console.error("CSV parse error:", error);
      toast({
        variant: 'destructive',
        title: t.importers.transaction.errors.importError,
        description: t.importers.transaction.errors.cannotReadCsv,
      });
      setIsImporting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // FASE 1: CLASSIFICACIÓ (parse + dedupe 3 estats)
  // ═══════════════════════════════════════════════════════════════════════════════

  const classifyParsedData = async (data: any[], mode: ImportMode, bankAccountId: string | null, fileName: string | null) => {
     if (!organizationId) {
        toast({ variant: 'destructive', title: t.importers.transaction.errors.processingError, description: t.importers.transaction.errors.cannotIdentifyOrg });
        setIsImporting(false);
        return;
     }

     // GUARD: bankAccountId és obligatori per importar
     if (!bankAccountId) {
        toast({ variant: 'destructive', title: t.importers.transaction.errors.processingError, description: 'Selecciona un compte bancari per importar' });
        setIsImporting(false);
        return;
     }

    log(`Iniciando procesamiento de ${data.length} filas con cuenta bancaria: ${bankAccountId}.`);

    try {
        // Parsejar files a transaccions, preservant rawRow per enrichment
        const allParsedWithRaw = data
        .map((row: any, index: number) => {
            // rawRow: còpia per poder afegir _opDate/_valueDate sense mutar l'original
            const rawRow: Record<string, any> = { ...(row._rawRow || row) };

            // Detectar ambdues dates per separat (enrichment E1)
            const valueDateRaw = findRawValue(rawRow, ['f. valor', 'fecha valor']);
            const opDateRaw = findRawValue(rawRow, ['f. ejecución', 'fecha ejecución', 'fecha operación']);
            const genericDateRaw = findRawValue(rawRow, ['fecha', 'data', 'date']);
            const dateValue = valueDateRaw || opDateRaw || genericDateRaw;
            const descriptionValue = row.Concepto || row.concepto || row.description || row.descripción;
            let amountValue = row.Importe || row.importe || row.amount;

            if (typeof amountValue === 'string') {
                amountValue = amountValue.replace(/\./g, '').replace(',', '.');
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

                    if (month > 12 && day <= 12) {
                         date = new Date(year, month - 1, day);
                    } else {
                         date = new Date(year, month - 1, day);
                    }
                } else {
                    date = new Date(dateString);
                }
            }

            if (isNaN(date.getTime())) {
                log(`Fila ${index + 2} con fecha inválida, saltando: ${JSON.stringify(row)}`);
                return null;
            }

            // Enrichment: executionDate (F. ejecución) — sempre que existeixi
            if (opDateRaw) {
              const normalizedOpDate = parseSingleDate(opDateRaw);
              if (normalizedOpDate) rawRow._opDate = normalizedOpDate;
            }

            // Enrichment: saldo/balance — parsejar format EU a number
            const balanceRaw = findRawValue(rawRow, ['saldo', 'balance']);
            if (balanceRaw !== null) {
              let balanceNum: number;
              if (typeof balanceRaw === 'number') {
                balanceNum = balanceRaw;
              } else {
                const cleaned = String(balanceRaw).replace(/\./g, '').replace(',', '.');
                balanceNum = parseFloat(cleaned);
              }
              if (!isNaN(balanceNum)) rawRow._balance = balanceNum;
            }

            const transactionType = detectReturnType(descriptionValue) || 'normal';

            const tx = {
                id: '',
                date: date.toISOString(),
                description: descriptionValue,
                amount: amount,
                category: null,
                document: null,
                contactId: null,
                transactionType,
                bankAccountId: bankAccountId ?? null,
                source: 'bank' as const,
            } as Omit<Transaction, 'id'>;

            return { tx, rawRow };
        })
        .filter((item): item is { tx: Omit<Transaction, 'id'>; rawRow: Record<string, any> } => item !== null);

        // Mode replace: no dedupe, executar directament
        if (mode === 'replace') {
            const txsToImport = allParsedWithRaw.map(r => r.tx);
            executeImport(txsToImport, mode, bankAccountId, fileName, data.length, {
                duplicateSkippedCount: 0,
            });
            return;
        }

        // Mode append: classificar amb dedupe 3 estats
        const dateRange = getDateRangeFromParsedRows(allParsedWithRaw.map(r => r.tx));
        if (!dateRange) {
            toast({ variant: 'destructive', title: t.importers.transaction.errors.processingError, description: 'No s\'han trobat dates vàlides al fitxer' });
            setIsImporting(false);
            return;
        }

        // E4: Ampliar rang amb opDate si cau fora del rang de valueDate
        for (const { rawRow } of allParsedWithRaw) {
          const opDate = rawRow._opDate;
          if (opDate && typeof opDate === 'string') {
            if (opDate < dateRange.minDate) dateRange.minDate = opDate;
            if (opDate > dateRange.maxDate) dateRange.maxDate = opDate;
          }
        }

        log(`🔍 [DEDUPE] Rang de dates del fitxer: ${dateRange.minDate} - ${dateRange.maxDate}`);

        const existingInRange = await fetchExistingTransactionsForDedupe(
            firestore,
            organizationId,
            bankAccountId,
            dateRange.minDate,
            dateRange.maxDate
        );
        log(`🔍 [DEDUPE] Carregades ${existingInRange.length} transaccions existents del rang`);

        // Classificar: 3 estats amb enrichment F. ejecución + Saldo
        const extraFields = ['_opDate', '_balance'];
        const classified = classifyTransactions(allParsedWithRaw, existingInRange, bankAccountId, extraFields);

        const safeDupes = classified.filter(c => c.status === 'DUPLICATE_SAFE');
        const candidates = classified.filter(c => c.status === 'DUPLICATE_CANDIDATE');
        const newTxs = classified.filter(c => c.status === 'NEW');

        log(`🔍 [DEDUPE] Resultat: ${newTxs.length} noves, ${safeDupes.length} duplicats segurs, ${candidates.length} candidats`);

        if (candidates.length > 0) {
            // Guardar context i obrir diàleg de resolució
            setClassifiedResults(classified);
            setPendingImportContext({ mode, bankAccountId, fileName, rawData: data });
            setIsCandidateDialogOpen(true);
            // NO setIsImporting(false) — mantenim loading fins que l'usuari resolgui
            return;
        }

        // Sense candidats: executar directament amb les NEW
        const duplicateSkippedCount = safeDupes.length;
        if (newTxs.length > 0) {
            executeImport(newTxs.map(c => c.tx), mode, bankAccountId, fileName, data.length, {
                duplicateSkippedCount,
            });
        } else {
            toast({
                title: duplicateSkippedCount > 0 ? t.importers.transaction.noNewTransactions : t.importers.transaction.noTransactionsFound,
                description: duplicateSkippedCount > 0
                    ? t.importers.transaction.duplicatesOmitted(duplicateSkippedCount)
                    : t.importers.transaction.noValidTransactions,
            });
            log('No se encontraron transacciones nuevas para importar.');
            setIsImporting(false);
        }
    } catch (error: any) {
        console.error("Error classifying parsed data:", error);
        toast({
          variant: 'destructive',
          title: t.importers.transaction.errors.processingError,
          description: error.message || t.importers.transaction.errors.cannotProcessContent,
        });
        log(`ERROR: ${error.message}`);
        setIsImporting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLER: Resolució de candidats
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleCandidatesResolved = (resolved: ClassifiedRow[]) => {
    setIsCandidateDialogOpen(false);

    if (!pendingImportContext || !classifiedResults) {
      setIsImporting(false);
      return;
    }

    const userImported = resolved.filter(c => c.userDecision === 'import');
    const userSkipped = resolved.filter(c => c.userDecision === 'skip');
    const newTxs = classifiedResults.filter(c => c.status === 'NEW');
    const safeDupes = classifiedResults.filter(c => c.status === 'DUPLICATE_SAFE');

    const transactionsToImport = [...newTxs.map(c => c.tx), ...userImported.map(c => c.tx)];

    const stats = {
      duplicateSkippedCount: safeDupes.length,
      candidateCount: resolved.length,
      candidateUserImportedCount: userImported.length,
      candidateUserSkippedCount: userSkipped.length,
    };

    log(`🔍 [DEDUPE] Resolució: ${userImported.length} importar, ${userSkipped.length} ometre, ${safeDupes.length} auto-skip`);

    if (transactionsToImport.length > 0) {
      executeImport(
        transactionsToImport,
        pendingImportContext.mode,
        pendingImportContext.bankAccountId,
        pendingImportContext.fileName,
        pendingImportContext.rawData.length,
        stats
      );
    } else {
      const totalSkipped = safeDupes.length + userSkipped.length;
      toast({
        title: t.importers.transaction.noNewTransactions,
        description: t.importers.transaction.duplicatesOmitted(totalSkipped),
      });
      log('No se encontraron transacciones nuevas para importar.');
      setClassifiedResults(null);
      setPendingImportContext(null);
      setIsImporting(false);
    }
  };

  const handleCandidatesCancelled = () => {
    setIsCandidateDialogOpen(false);
    setClassifiedResults(null);
    setPendingImportContext(null);
    setIsImporting(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // FASE 2: EXECUCIÓ (contact matching + batch write + importRun)
  // ═══════════════════════════════════════════════════════════════════════════════

  const executeImport = async (
    transactionsToProcess: Array<Omit<Transaction, 'id'>>,
    mode: ImportMode,
    bankAccountId: string,
    fileName: string | null,
    totalRawRows: number,
    stats: {
      duplicateSkippedCount: number;
      candidateCount?: number;
      candidateUserImportedCount?: number;
      candidateUserSkippedCount?: number;
    }
  ) => {
    // Netejar estat de classificació
    setClassifiedResults(null);
    setPendingImportContext(null);

    if (!organizationId) {
      setIsImporting(false);
      return;
    }

    try {
        log(`📊 Transacciones a procesar: ${transactionsToProcess.length}`);
        log(`👥 Contactos disponibles: ${availableContacts?.length || 0}`);

        // ═══════════════════════════════════════════════════════════════════
        // MATCHING PER NOM (instantani, sense IA)
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
                const contact = availableContacts.find(c => c.id === match.contactId);
                const defaultCategory = contact?.defaultCategoryId;
                const willAssignCategory = defaultCategory && !tx.category
                  && availableCategories
                  && isCategoryIdCompatibleStrict(tx.amount, defaultCategory, availableCategories);
                log(`✅ [Fila ${index + 1}] Match per nom: "${match.contactName}" (${match.contactType})${willAssignCategory ? ` → categoria: ${defaultCategory}` : defaultCategory ? ' (ja té categoria o incompatible)' : ' (sense cat. defecte)'} - confiança ${Math.round(match.confidence * 100)}% - "${tx.description.substring(0, 40)}..."`);
                return {
                    ...tx,
                    contactId: match.contactId,
                    contactType: match.contactType,
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
        // IA com a fallback (només per les no matchejades, si són poques)
        // ═══════════════════════════════════════════════════════════════════
        const AI_THRESHOLD = 20;
        const useAI = unmatchedTransactions.length > 0 && unmatchedTransactions.length <= AI_THRESHOLD;

        log(`🤖 FASE 2 (IA): ${useAI ? `ACTIVADA per ${unmatchedTransactions.length} transaccions sense match` : `DESACTIVADA (${unmatchedTransactions.length} > ${AI_THRESHOLD} o ja totes matchejades)`}`);

        let transactionsWithContacts = [...transactionsAfterNameMatch];

        if (useAI && unmatchedTransactions.length > 0) {
            log('🔍 Iniciando inferencia con IA para transacciones sin match...');
            const contactsForAI = availableContacts?.map(c => ({ id: c.id, name: c.name })) || [];

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
                                const willAssignCategory = defaultCategory && !tx.category
                                  && availableCategories
                                  && isCategoryIdCompatibleStrict(tx.amount, defaultCategory, availableCategories);
                                log(`✅ [Fila ${index + 1}] Match IA: ${contact.name} (${contact.type})${willAssignCategory ? ` → categoria: ${defaultCategory}` : defaultCategory ? ' (ja té categoria o incompatible)' : ' (sense cat. defecte)'} - "${tx.description.substring(0, 30)}..."`);
                                transactionsWithContacts[index] = {
                                    ...tx,
                                    contactId: result.contactId,
                                    contactType: contact.type,
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

        // ═══════════════════════════════════════════════════════════════════
        // CHUNKING: Dividir operacions en lots de màxim 50
        // ═══════════════════════════════════════════════════════════════════

        const deleteOperations: string[] = mode === 'replace'
            ? existingTransactions.map(tx => tx.id)
            : [];

        const newTransactions: Transaction[] = [];
        const createOperations: { ref: ReturnType<typeof doc>; data: ReturnType<typeof normalizeTransaction> }[] = [];

        transactionsWithContacts.forEach(tx => {
            const newDocRef = doc(transactionsCollectionRef);
            const normalizedTx = normalizeTransaction(tx);
            createOperations.push({ ref: newDocRef, data: normalizedTx });
            newTransactions.push({ ...tx, id: newDocRef.id } as Transaction);
        });

        const totalOperations = deleteOperations.length + createOperations.length;
        const totalChunks = Math.ceil(totalOperations / BATCH_LIMIT);

        log(`📦 Import: ${totalOperations} operacions totals (${deleteOperations.length} deletes, ${createOperations.length} creates) → ${totalChunks} lots`);

        let operationsProcessed = 0;
        let chunksCompleted = 0;

        try {
            if (deleteOperations.length > 0) {
                const deleteChunks = chunk(deleteOperations, BATCH_LIMIT);
                for (let i = 0; i < deleteChunks.length; i++) {
                    const fbBatch = writeBatch(firestore);
                    deleteChunks[i].forEach(txId => {
                        fbBatch.delete(doc(transactionsCollectionRef, txId));
                    });
                    await fbBatch.commit();
                    operationsProcessed += deleteChunks[i].length;
                    chunksCompleted++;
                    log(`🗑️ Lot ${chunksCompleted}/${totalChunks}: ${deleteChunks[i].length} transaccions eliminades`);
                }
            }

            const createChunks = chunk(createOperations, BATCH_LIMIT);
            for (let i = 0; i < createChunks.length; i++) {
                const fbBatch = writeBatch(firestore);
                createChunks[i].forEach(op => {
                    fbBatch.set(op.ref, op.data);
                });
                await fbBatch.commit();
                operationsProcessed += createChunks[i].length;
                chunksCompleted++;
                log(`✅ Lot ${chunksCompleted}/${totalChunks}: ${createChunks[i].length} transaccions creades`);
            }

            log(`🎉 Import complet: ${operationsProcessed} operacions en ${chunksCompleted} lots`);

        } catch (batchError: any) {
            console.error('Error during batch commit:', batchError);
            const errorMessage = `Error al lot ${chunksCompleted + 1}/${totalChunks}. S'han processat ${operationsProcessed} operacions. No repeteixis sense revisar si s'han creat moviments parcials.`;

            toast({
                variant: 'destructive',
                title: t.importers.transaction.errors.processingError,
                description: errorMessage,
                duration: 15000,
            });
            log(`❌ ERROR al lot ${chunksCompleted + 1}: ${batchError.message}`);
            throw batchError;
        }

        // Post-import: suggerir conciliació amb documents pendents
        if (newTransactions.length > 0 && availableContacts) {
          try {
            const result = await suggestPendingDocumentMatches(
              firestore,
              organizationId,
              newTransactions,
              availableContacts
            );
            if (result.suggestedCount > 0 || result.linkedRemittanceCount > 0) {
              log(`🔗 Conciliació: ${result.suggestedCount} docs suggerits, ${result.linkedRemittanceCount} remeses vinculades`);
            }
          } catch (error) {
            console.error('Error suggesting matches:', error);
          }
        }

        // Missatge d'èxit
        const totalDuplicatesSkipped = stats.duplicateSkippedCount + (stats.candidateUserSkippedCount ?? 0);
        toast({
            title: t.importers.transaction.importSuccess,
            description: t.importers.transaction.importSuccessDescription(transactionsToProcess.length, mode, totalDuplicatesSkipped),
        });
        log('¡Éxito! Importación completada.');

        // Escriure importRun
        try {
          if (transactionsToProcess.length > 0) {
            const dates = transactionsToProcess.map(tx => tx.date).sort();
            const dateMin = dates[0];
            const dateMax = dates[dates.length - 1];

            const source: 'csv' | 'xlsx' = fileName?.endsWith('.xlsx') ? 'xlsx' : 'csv';

            const importRunData = createImportRunDoc({
              type: 'bankTransactions',
              source,
              fileName,
              dateMin,
              dateMax,
              totalRows: totalRawRows,
              createdCount: transactionsToProcess.length,
              duplicateSkippedCount: stats.duplicateSkippedCount,
              createdBy: user?.uid || 'unknown',
              bankAccountId,
              candidateCount: stats.candidateCount,
              candidateUserImportedCount: stats.candidateUserImportedCount,
              candidateUserSkippedCount: stats.candidateUserSkippedCount,
            });

            const importRunRef = doc(collection(firestore, 'organizations', organizationId, 'importRuns'));
            await setDoc(importRunRef, {
              ...importRunData,
              createdAt: serverTimestamp(),
            });

            log(`📝 ImportRun creat: ${importRunRef.id} (${dateMin} → ${dateMax})`);
          }
        } catch (importRunError) {
          console.error('Error escrivint importRun (no crític):', importRunError);
          log(`⚠️ No s'ha pogut guardar l'històric d'importació (no afecta les transaccions)`);
        }

    } catch (error: any) {
        console.error("Error executing import:", error);
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
                  <div className="col-span-3 col-start-2 text-xs text-muted-foreground">
                    {t.movements.import.formatsHelp}
                  </div>
                </div>

                {/* Avís inline persistent: recomanació d'importació */}
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {t.importers.transaction.importRecommendationTitle || 'Recomanació d\'importació'}
                      </p>
                      <p className="text-amber-700 dark:text-amber-300">
                        {t.importers.transaction.importRecommendationText ||
                         'Per garantir un registre net i ràpid, recomanem importar només extractes no solapats.'}
                      </p>
                      <p className="text-amber-600 dark:text-amber-400">
                        {t.importers.transaction.dedupeNote ||
                         'Summa detecta i evita duplicats, però no és la manera òptima de treballar.'}
                      </p>
                      {lastImportedDate && (
                        <>
                          <p className="mt-2 font-medium text-amber-800 dark:text-amber-200">
                            {t.importers.transaction.lastImportedUntil || 'Últim import registrat fins al:'}{' '}
                            {new Date(lastImportedDate).toLocaleDateString('ca-ES')}
                          </p>
                          <p className="text-amber-600 dark:text-amber-400">
                            {t.importers.transaction.recommendedFrom || 'Extracte recomanat: a partir del'}{' '}
                            {new Date(new Date(lastImportedDate).getTime() + 86400000).toLocaleDateString('ca-ES')}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Checkbox de fricció si hi ha dades existents (potencial solapament) */}
                {lastImportedDate && (
                  <div className="rounded-md border border-muted bg-muted/50 p-3">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id="overlap-acknowledge"
                        checked={overlapAcknowledged}
                        onCheckedChange={(checked) => setOverlapAcknowledged(checked === true)}
                      />
                      <div className="space-y-1">
                        <label
                          htmlFor="overlap-acknowledge"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {t.importers.transaction.overlapAcknowledge ||
                           'Entenc que aquest extracte pot solapar períodes ja importats i que només l\'estic important perquè és necessari.'}
                        </label>
                        <p className="text-xs text-muted-foreground">
                          {t.importers.transaction.overlapAcknowledgeNote ||
                           'Això pot augmentar el temps d\'importació i generar avisos innecessaris.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
                  disabled={!selectedBankAccountId || (lastImportedDate !== null && !overlapAcknowledged)}
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

      {/* Diàleg de resolució de candidats a duplicat */}
      <DedupeCandidateResolver
        open={isCandidateDialogOpen}
        candidates={classifiedResults?.filter(c => c.status === 'DUPLICATE_CANDIDATE') ?? []}
        safeDuplicatesCount={classifiedResults?.filter(c => c.status === 'DUPLICATE_SAFE').length ?? 0}
        onResolved={handleCandidatesResolved}
        onCancel={handleCandidatesCancelled}
      />
    </>
  );
}
