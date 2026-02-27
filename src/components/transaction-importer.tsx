'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { FileUp, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Transaction, AnyContact, Category } from '@/lib/data';
import { detectReturnType } from '@/lib/data';
import { isCategoryIdCompatibleStrict } from '@/lib/constants';
import Papa from 'papaparse';
import { inferContact } from '@/ai/flows/infer-contact';
import { findMatchingContact } from '@/lib/auto-match';
import { normalizeTransaction } from '@/lib/normalize';
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
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { useBankAccounts } from '@/hooks/use-bank-accounts';
import Link from 'next/link';
import { suggestPendingDocumentMatches } from '@/lib/pending-documents';
import { classifyTransactions, type ClassifiedRow } from '@/lib/transaction-dedupe';
import { DedupeCandidateResolver } from '@/components/dedupe-candidate-resolver';
import {
  findHeaderRow,
  findColumnIndexByKeywords,
  findRawValueByKeywords,
  normalizeCell,
} from '@/lib/importers/bank/findHeaderRow';

interface ImportTransactionsApiResponse {
  success: boolean;
  idempotent?: boolean;
  createdCount?: number;
  importRunId?: string;
  inputHash?: string;
  createdTransactions?: Transaction[];
  error?: string;
  code?: string;
}

interface TransactionImporterProps {
  availableCategories?: Category[] | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS PER DEDUPE GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula rang de dates (YYYY-MM-DD) d'un array de transaccions parsejades
 */
function getDateRangeFromParsedRows(
  txs: Array<{ date: string; operationDate?: string }>
): { minDate: string; maxDate: string } | null {
  const rangeValues = txs
    .map((tx) => (tx.operationDate ? tx.operationDate : tx.date).split('T')[0])
    .filter(Boolean)
    .sort();
  if (rangeValues.length === 0) return null;

  return { minDate: rangeValues[0], maxDate: rangeValues[rangeValues.length - 1] };
}

function parseAmount(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value !== 'string') return NaN;
  const normalized = value.replace(/\./g, '').replace(',', '.');
  return parseFloat(normalized);
}

function parseOperationDate(rawDate: unknown): string | null {
  const parsed = parseSingleDate(rawDate);
  return parsed && isIsoDateOnly(parsed) ? parsed : null;
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

const DATE_COLUMN_NAMES = [
  'f. valor',
  'f valor',
  'fecha valor',
  'fecha operación',
  'fecha operacion',
  'fecha',
  'f. ejecución',
  'f. ejecucion',
  'f ejecucion',
  'data',
  'date',
  'valor',
];
const DESCRIPTION_COLUMN_NAMES = [
  'concepte',
  'concepto',
  'descripción',
  'descripcion',
  'descripció',
  'descripcio',
  'description',
  'detalle',
  'detall',
];
const AMOUNT_COLUMN_NAMES = ['import', 'importe', 'amount', 'cantidad', 'quantitat'];
const BALANCE_COLUMN_NAMES = ['saldo', 'balance'];
const OPERATION_DATE_COLUMN_NAMES = [
  'f. ejecución',
  'f. ejecucion',
  'f ejecucion',
  'fecha ejecución',
  'fecha ejecucion',
  'fecha operación',
  'fecha operacion',
  'operación',
  'operacion',
];
const VALUE_DATE_COLUMN_NAMES = ['f. valor', 'f valor', 'fecha valor', 'valor'];
const GENERIC_DATE_COLUMN_NAMES = ['fecha', 'data', 'date'];

const LEGACY_HEADER_KEYWORDS = ['fecha', 'concepto', 'importe', 'descrip', 'amount'];

const findColumnIndex = (header: string[], potentialNames: string[]): number => {
  return findColumnIndexByKeywords(header, potentialNames);
};

const isLegacyHeaderRow = (row: unknown[]): boolean => {
  const rowString = row.map((cell) => String(cell ?? '')).join(' ').toLowerCase();
  const matches = LEGACY_HEADER_KEYWORDS.filter((keyword) => rowString.includes(keyword)).length;
  return matches >= 2;
};

const isRowCompletelyEmpty = (row: unknown[]): boolean => {
  return row.every((cell) => normalizeCell(cell) === '');
};


/**
 * Cerca un valor en rawRow per nom de columna (fuzzy, case-insensitive substring)
 */
const findRawValue = (rawRow: Record<string, any>, potentialNames: string[]): any => {
  return findRawValueByKeywords(rawRow as Record<string, unknown>, potentialNames);
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

const isIsoDateOnly = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value);

export function TransactionImporter({ availableCategories }: TransactionImporterProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = React.useState(false);
  const [pendingFile, setPendingFile] = React.useState<File | null>(null);
  const [selectedBankAccountId, setSelectedBankAccountId] = React.useState<string | null>(null);
  // UX: Avís inline i fricció per solapament
  const [lastImportedDate, setLastImportedDate] = React.useState<string | null>(null);
  const [overlapAcknowledged, setOverlapAcknowledged] = React.useState(false);
  // Dedupe 3 estats: candidats pendents de resolució
  const [classifiedResults, setClassifiedResults] = React.useState<ClassifiedRow[] | null>(null);
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = React.useState(false);
  const [dedupeSummary, setDedupeSummary] = React.useState<{
    newCount: number;
    safeDuplicatesCount: number;
    candidateCount: number;
    totalCount: number;
  } | null>(null);
  const [pendingImportContext, setPendingImportContext] = React.useState<{
    bankAccountId: string;
    fileName: string | null;
    rawData: any[];
  } | null>(null);
  const { toast } = useToast();
  const { firestore, auth } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { buildUrl } = useOrgUrl();
  const { t, tr } = useTranslations();

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
    startImportProcess(pendingFile, selectedBankAccountId);
    setPendingFile(null);
  };

  const startImportProcess = (file: File, bankAccountId: string | null) => {
    setIsImporting(true);
    if (file.name.endsWith('.csv')) {
        parseCsv(file, bankAccountId);
    } else if (file.name.endsWith('.xlsx')) {
        parseXlsx(file, bankAccountId);
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
  const checkOverlapAndConfirm = async (parsedData: any[], bankAccountId: string | null, fileName: string | null) => {
    classifyParsedData(parsedData, bankAccountId, fileName);
  };

  const parseXlsx = (file: File, bankAccountId: string | null) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const XLSX = await import('xlsx');
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (!json || json.length === 0) {
            throw new Error(t.importers.transaction.errors.emptyXlsx);
        }

        const rows = (json as unknown[][]).map((row) => (Array.isArray(row) ? row : []));
        const headerDetection = findHeaderRow(rows);
        let headerRowIndex = -1;
        let usedHeuristicHeader = false;

        if (headerDetection.index !== null) {
          headerRowIndex = headerDetection.index;
          usedHeuristicHeader = true;
        } else {
          // Guardrail: si la heurística no té prou confiança, mantenir detecció legacy
          for (let i = 0; i < rows.length; i++) {
            if (isLegacyHeaderRow(rows[i])) {
              headerRowIndex = i;
              break;
            }
          }
        }

        if (headerRowIndex === -1) {
             throw new Error(t.importers.transaction.errors.headerNotFound);
        }

        const header = (rows[headerRowIndex] as string[]).map(h => String(h || '').trim());

        const operationDateIndex = findColumnIndex(header, OPERATION_DATE_COLUMN_NAMES);
        const valueDateIndex = findColumnIndex(header, [...VALUE_DATE_COLUMN_NAMES, ...GENERIC_DATE_COLUMN_NAMES]);
        const conceptIndex = findColumnIndex(header, DESCRIPTION_COLUMN_NAMES);
        const amountIndex = findColumnIndex(header, AMOUNT_COLUMN_NAMES);

        if (operationDateIndex === -1 || conceptIndex === -1 || amountIndex === -1) {
            const missing = [
                ...(operationDateIndex === -1 ? ['F. ejecución'] : []),
                ...(conceptIndex === -1 ? ['Concepto'] : []),
                ...(amountIndex === -1 ? ['Importe'] : [])
            ].join(', ');
            throw new Error(t.importers.transaction.errors.requiredColumnsNotFound(missing));
        }

        const dataRows = usedHeuristicHeader
          ? rows.slice(headerRowIndex + 1).filter((row) => !isRowCompletelyEmpty(row))
          : rows.slice(headerRowIndex + 1);
        const parsedData = dataRows.map((row: any) => {
            // Preservar totes les columnes per enrichment
            const _rawRow: Record<string, any> = {};
            header.forEach((h, idx) => { _rawRow[h] = row?.[idx]; });
            return {
              Fecha: row?.[operationDateIndex],
              Valor: row?.[valueDateIndex],
              Concepto: row?.[conceptIndex],
              Importe: row?.[amountIndex],
              _rawRow,
            };
        });

        checkOverlapAndConfirm(parsedData, bankAccountId, file.name);
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
  const parseCsv = async (file: File, bankAccountId: string | null) => {
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
        const rawRow = row as Record<string, any>;
        const operationDateValue = parseOperationDate(findRawValue(rawRow, OPERATION_DATE_COLUMN_NAMES));
        const descriptionValue = findRawValue(rawRow, DESCRIPTION_COLUMN_NAMES);
        const amountValue = findRawValue(rawRow, AMOUNT_COLUMN_NAMES);
        const amount = parseAmount(amountValue);

        if (
          operationDateValue &&
          descriptionValue &&
          Number.isFinite(amount)
        ) {
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
        // Intent 2: ISO-8859-1 (latin1) - comú en bancs espanyols com Triodos
        text = await readWithEncoding('ISO-8859-1');
        data = await parseText(text);
      }

      if (hasValidTransactions(data)) {
        checkOverlapAndConfirm(data, bankAccountId, file.name);
      } else {
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

  const classifyParsedData = async (data: any[], bankAccountId: string | null, fileName: string | null) => {
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

    try {
        // Parsejar files a transaccions, preservant rawRow per enrichment
        const allParsedWithRaw = data
        .map((row: any) => {
            // rawRow: còpia per poder afegir _opDate/_valueDate sense mutar l'original
            const rawRow: Record<string, any> = { ...(row._rawRow || row) };

            // Detectar ambdues dates per separat (enrichment E1)
            const valueDateRaw = findRawValue(rawRow, VALUE_DATE_COLUMN_NAMES);
            const opDateRaw = findRawValue(rawRow, OPERATION_DATE_COLUMN_NAMES);
            const genericDateRaw = findRawValue(rawRow, GENERIC_DATE_COLUMN_NAMES);
            const dateValue = valueDateRaw || opDateRaw || genericDateRaw;
            const descriptionValueRaw = findRawValue(rawRow, DESCRIPTION_COLUMN_NAMES);
            const descriptionValue = typeof descriptionValueRaw === 'string'
              ? descriptionValueRaw.trim()
              : String(descriptionValueRaw ?? '').trim();
            let amountValue = findRawValue(rawRow, AMOUNT_COLUMN_NAMES);

            if (typeof amountValue === 'string') {
                amountValue = amountValue.replace(/\./g, '').replace(',', '.');
            }
            const amount = parseFloat(amountValue);

            const hasContent = Boolean(descriptionValue) || Number.isFinite(amount) || Boolean(opDateRaw);
            const parsedOpDate = parseOperationDate(opDateRaw);

            if (!dateValue || !descriptionValue || !Number.isFinite(amount)) {
              if (!hasContent) {
                return null;
              }

              throw new Error(t.importers.transaction.errors.cannotProcessContent);
            }

            if (!parsedOpDate) {
              throw new Error(tr('import.errors.operationDateRequired'));
            }

            if (!dateValue) {
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
                return null;
            }

            // Enrichment: executionDate (F. ejecución) — sempre que existeixi
            const normalizedOpDate = parsedOpDate;
            rawRow._opDate = normalizedOpDate;

            // Enrichment: saldo/balance — parsejar format EU a number
            let parsedBalanceAfter: number | undefined;
            const balanceRaw = findRawValue(rawRow, BALANCE_COLUMN_NAMES);
            if (balanceRaw !== null) {
              let balanceNum: number;
              if (typeof balanceRaw === 'number') {
                balanceNum = balanceRaw;
              } else {
                const cleaned = String(balanceRaw).replace(/\./g, '').replace(',', '.');
                balanceNum = parseFloat(cleaned);
              }
              if (Number.isFinite(balanceNum)) {
                rawRow._balance = balanceNum;
                parsedBalanceAfter = balanceNum;
              }
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
                ...(parsedBalanceAfter !== undefined && Number.isFinite(parsedBalanceAfter) ? { balanceAfter: parsedBalanceAfter } : {}),
                operationDate: normalizedOpDate,
            } as Omit<Transaction, 'id'>;

            return { tx, rawRow };
        })
        .filter((item): item is { tx: Omit<Transaction, 'id'>; rawRow: Record<string, any> } => item !== null);

        // Classificar amb dedupe (Mode A: cap bloqueig)
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

        const existingInRange = await fetchExistingTransactionsForDedupe(
            firestore,
            organizationId,
            bankAccountId,
            dateRange.minDate,
            dateRange.maxDate
        );

        // Classificar: 3 estats amb enrichment F. ejecución + Saldo
        const extraFields = ['_opDate', '_balance'];

        const classified = classifyTransactions(allParsedWithRaw, existingInRange, bankAccountId, extraFields);

        const safeDupes = classified.filter(c => c.status === 'DUPLICATE_SAFE');
        const candidates = classified.filter(c => c.status === 'DUPLICATE_CANDIDATE');
        const newTxs = classified.filter(c => c.status === 'NEW');
        const summary = {
          newCount: newTxs.length,
          safeDuplicatesCount: safeDupes.length,
          candidateCount: candidates.length,
          totalCount: classified.length,
        };

        const transactionsToImport = summary.newCount + summary.candidateCount;
        if (transactionsToImport === 0) {
          toast({
            title: t.importers.transaction.noTransactionsFound,
            description: t.importers.transaction.noValidTransactions,
          });
          setIsImporting(false);
          return;
        }

        // Mostrar sempre resum previ abans d'importar
        setClassifiedResults(classified);
        setPendingImportContext({ bankAccountId, fileName, rawData: data });
        setDedupeSummary(summary);
        setIsCandidateDialogOpen(true);
        setIsImporting(false);
        return;
    } catch (error: any) {
        console.error("Error classifying parsed data:", error);
        toast({
          variant: 'destructive',
          title: t.importers.transaction.errors.processingError,
          description: error.message || t.importers.transaction.errors.cannotProcessContent,
        });
        setIsImporting(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // HANDLER: Resolució de candidats
  // ═══════════════════════════════════════════════════════════════════════════════

  const handleCandidatesContinue = () => {
    setIsCandidateDialogOpen(false);

    if (!pendingImportContext || !classifiedResults) {
      setIsImporting(false);
      return;
    }

    setIsImporting(true);

    const candidates = classifiedResults.filter(c => c.status === 'DUPLICATE_CANDIDATE');
    const newTxs = classifiedResults.filter(c => c.status === 'NEW');
    const safeDupes = classifiedResults.filter(c => c.status === 'DUPLICATE_SAFE');

    const transactionsToImport = [
      ...newTxs.map(c => c.tx),
      ...candidates.map(c => c.tx),
    ];

    const stats = {
      duplicateSkippedCount: safeDupes.length,
      candidateCount: candidates.length,
      candidateUserImportedCount: candidates.length,
      candidateUserSkippedCount: 0,
    };

    if (transactionsToImport.length > 0) {
      executeImport(
        transactionsToImport,
        pendingImportContext.bankAccountId,
        pendingImportContext.fileName,
        pendingImportContext.rawData.length,
        stats
      );
    } else {
      toast({
        title: t.importers.transaction.noNewTransactions,
        description: t.importers.transaction.noValidTransactions,
      });
      setClassifiedResults(null);
      setPendingImportContext(null);
      setDedupeSummary(null);
      setIsImporting(false);
    }
  };

  const handleCandidatesCancelled = () => {
    setIsCandidateDialogOpen(false);
    setClassifiedResults(null);
    setPendingImportContext(null);
    setDedupeSummary(null);
    setIsImporting(false);
  };

  // ═══════════════════════════════════════════════════════════════════════════════
  // FASE 2: EXECUCIÓ (contact matching + batch write + importRun)
  // ═══════════════════════════════════════════════════════════════════════════════

  const executeImport = async (
    transactionsToProcess: Array<Omit<Transaction, 'id'>>,
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
    setDedupeSummary(null);

    if (!organizationId) {
      setIsImporting(false);
      return;
    }

    try {
        // ═══════════════════════════════════════════════════════════════════
        // MATCHING PER NOM (instantani, sense IA)
        // ═══════════════════════════════════════════════════════════════════

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

        // ═══════════════════════════════════════════════════════════════════
        // IA com a fallback (només per les no matchejades, si són poques)
        // ═══════════════════════════════════════════════════════════════════
        const AI_THRESHOLD = 20;
        const useAI = unmatchedTransactions.length > 0 && unmatchedTransactions.length <= AI_THRESHOLD;

        let transactionsWithContacts = [...transactionsAfterNameMatch];

        if (useAI && unmatchedTransactions.length > 0) {
            const contactsForAI = availableContacts?.map(c => ({ id: c.id, name: c.name })) || [];

            const BATCH_SIZE = 10;
            const DELAY_MS = 60000;
            let quotaExceeded = false;
            let aiMatchedCount = 0;

            for (let i = 0; i < unmatchedTransactions.length; i += BATCH_SIZE) {
                if (quotaExceeded) break;

                const batch = unmatchedTransactions.slice(i, i + BATCH_SIZE);

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
                                transactionsWithContacts[index] = {
                                    ...tx,
                                    contactId: result.contactId,
                                    contactType: contact.type,
                                    ...(willAssignCategory ? { category: defaultCategory } : {}),
                                };
                            }
                        }
                    } catch (error: any) {
                        console.error("Error inferring contact:", error);

                        const errorMsg = error?.message || error?.toString() || '';
                        if (!quotaExceeded && (errorMsg.includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit'))) {
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
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            }

        }

        // ═══════════════════════════════════════════════════════════════════
        // RESUM FINAL
        // ═══════════════════════════════════════════════════════════════════

        const authUser = auth.currentUser;
        if (!authUser) {
          throw new Error('Sessió no vàlida. Torna a iniciar sessió.');
        }

        const idToken = await authUser.getIdToken();
        const normalizedTransactions = transactionsWithContacts.map((tx) => {
          const normalizedTx = normalizeTransaction(tx) as Record<string, unknown>;
          const { id: _ignored, ...withoutId } = normalizedTx as { id?: string } & Record<string, unknown>;
          const sanitizedTx = { ...withoutId };

          // Import bancari: no crear "returns" automàtiques sense flux dedicat
          if (sanitizedTx.transactionType === 'return') {
            sanitizedTx.transactionType = 'normal';

            if (!sanitizedTx.contactId) {
              sanitizedTx.contactId = null;
            }

            if ('linkedTransactionId' in sanitizedTx) {
              sanitizedTx.linkedTransactionId = null;
            }
          }

          return sanitizedTx;
        });

        const source: 'csv' | 'xlsx' = fileName?.endsWith('.xlsx') ? 'xlsx' : 'csv';

        const apiResponse = await fetch('/api/transactions/import', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            orgId: organizationId,
            bankAccountId,
            fileName,
            source,
            totalRows: totalRawRows,
            stats,
            transactions: normalizedTransactions,
          }),
        });

        let result: ImportTransactionsApiResponse | null = null;
        try {
          result = await apiResponse.json() as ImportTransactionsApiResponse;
        } catch {
          result = null;
        }

        if (!apiResponse.ok || !result?.success) {
          const errorMessage = result?.error || `Error importació (${apiResponse.status})`;
          throw new Error(errorMessage);
        }

        const newTransactions = (result.createdTransactions || []) as Transaction[];

        // Post-import: suggerir conciliació amb documents pendents
        if (newTransactions.length > 0 && availableContacts) {
          try {
            await suggestPendingDocumentMatches(
              firestore,
              organizationId,
              newTransactions,
              availableContacts
            );
          } catch (error) {
            console.error('Error suggesting matches:', error);
          }
        }

        // Missatge d'èxit
          const totalDuplicatesSkipped = stats.duplicateSkippedCount + (stats.candidateUserSkippedCount ?? 0);
        const createdCount = result.createdCount ?? transactionsToProcess.length;

        if (result.idempotent) {
          toast({
            title: t.importers.transaction.noNewTransactions,
            description: 'Aquest fitxer ja s’havia importat prèviament (idempotent).',
          });
        } else {
          toast({
            title: t.importers.transaction.importSuccess,
            description: t.importers.transaction.importSuccessDescription(createdCount, totalDuplicatesSkipped),
          });
        }

    } catch (error: any) {
        console.error("Error executing import:", error);
        toast({
          variant: 'destructive',
          title: t.importers.transaction.errors.processingError,
          description: error.message || t.importers.transaction.errors.cannotProcessContent,
        });
    } finally {
      setIsImporting(false);
    }
  }



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
      <div className="flex flex-wrap items-center gap-2">
        {bankAccounts.length > 0 ? (
          <div className="min-w-[220px] max-w-[320px]">
            <Select
              value={selectedBankAccountId ?? ''}
              onValueChange={(value) => setSelectedBankAccountId(value)}
              disabled={isImporting || isLoadingBankAccounts}
            >
              <SelectTrigger>
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
        ) : (
          <Button variant="outline" asChild>
            <Link href={buildUrl('/configuracion')}>
              {t.settings.bankAccounts.goToSettings}
            </Link>
          </Button>
        )}

        <Button disabled={isImporting} onClick={() => fileInputRef.current?.click()}>
          {isImporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="mr-2 h-4 w-4" />
          )}
          {t.importers.transaction.title}
        </Button>
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

      {/* Diàleg de resolució de candidats a duplicat */}
      <DedupeCandidateResolver
        open={isCandidateDialogOpen}
        candidates={classifiedResults?.filter(c => c.status === 'DUPLICATE_CANDIDATE') ?? []}
        newCount={dedupeSummary?.newCount ?? 0}
        safeDuplicatesCount={dedupeSummary?.safeDuplicatesCount ?? (classifiedResults?.filter(c => c.status === 'DUPLICATE_SAFE').length ?? 0)}
        candidateCount={dedupeSummary?.candidateCount ?? (classifiedResults?.filter(c => c.status === 'DUPLICATE_CANDIDATE').length ?? 0)}
        totalCount={dedupeSummary?.totalCount ?? (classifiedResults?.length ?? 0)}
        onContinue={handleCandidatesContinue}
        onCancel={handleCandidatesCancelled}
      />
    </>
  );
}
