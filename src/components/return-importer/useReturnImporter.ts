'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useAppLog } from '@/hooks/use-app-log';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, query, where, updateDoc, doc, increment } from 'firebase/firestore';
import type { Transaction, Donor } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export type Step = 'upload' | 'mapping' | 'preview' | 'processing';

export interface ColumnMapping {
  ibanColumn: number | null;
  amountColumn: number | null;
  dateColumn: number | null;
  dniColumn: number | null;
}

export interface ParsedReturn {
  rowIndex: number;
  iban: string;
  amount: number;
  date: string | null;
  dni: string | null;
  // Matching results
  matchedDonor: Donor | null;
  matchedTransaction: Transaction | null;
  status: 'matched' | 'donor_found' | 'not_found';
}

export interface ReturnImporterStats {
  total: number;
  matched: number;
  donorFound: number;
  notFound: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalitza IBAN eliminant prefix "IBAN ", espais i passant a majúscules
 */
const normalizeIban = (iban: string): string => {
  if (!iban) return '';
  return iban
    .replace(/^IBAN\s*/i, '')
    .replace(/\s/g, '')
    .toUpperCase();
};

/**
 * Normalitza DNI/CIF eliminant espais i guions
 */
const normalizeTaxId = (taxId: string): string => {
  if (!taxId) return '';
  return taxId
    .replace(/[\s-]/g, '')
    .toUpperCase();
};

/**
 * Parseja un valor d'import (format europeu: 15,00 € -> 15.00)
 * Retorna sempre valor absolut (positiu)
 */
const parseAmount = (value: string): number => {
  if (!value) return 0;
  let cleaned = value.replace(/[^\d,.-]/g, '');
  if (cleaned.includes(',')) {
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }
  return Math.abs(parseFloat(cleaned) || 0);
};

/**
 * Parseja una data en diversos formats
 */
const parseDate = (value: string): string | null => {
  if (!value) return null;

  // Format DD/MM/YYYY o DD-MM-YYYY
  const ddmmyyyy = value.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  // Format YYYY-MM-DD
  const yyyymmdd = value.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmdd) {
    const [, year, month, day] = yyyymmdd;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  return null;
};

/**
 * Detecta automàticament la fila on comencen les dades
 */
const detectStartRow = (rows: string[][]): number => {
  const ibanPattern = /^(IBAN\s*)?[A-Z]{2}[0-9]{2}[A-Z0-9\s]{10,30}$/i;

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    // Busca si alguna cel·la conté un IBAN
    const hasIban = row.some(cell => {
      const cleaned = (cell || '').toString().trim().replace(/\s/g, '');
      return ibanPattern.test(cleaned);
    });

    if (hasIban) return i;
  }

  return 0;
};

/**
 * Detecta automàticament les columnes basant-se en el contingut
 */
const detectColumns = (rows: string[][], startRow: number): ColumnMapping => {
  const sampleRows = rows.slice(startRow, startRow + 10);

  let ibanColumn: number | null = null;
  let amountColumn: number | null = null;
  let dateColumn: number | null = null;
  let dniColumn: number | null = null;

  if (sampleRows.length === 0 || sampleRows[0].length === 0) {
    return { ibanColumn: null, amountColumn: null, dateColumn: null, dniColumn: null };
  }

  const numCols = Math.max(...sampleRows.map(r => r.length));

  for (let col = 0; col < numCols; col++) {
    const values = sampleRows.map(row => (row[col] || '').toString().trim());
    const nonEmptyValues = values.filter(v => v.length > 0);
    if (nonEmptyValues.length === 0) continue;

    // Detecta IBAN (ES + 22 dígits o similar)
    const ibanMatches = nonEmptyValues.filter(v => {
      const cleaned = v.replace(/^IBAN\s*/i, '').replace(/\s/g, '').toUpperCase();
      return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(cleaned);
    });
    if (ibanMatches.length > nonEmptyValues.length * 0.5 && ibanColumn === null) {
      ibanColumn = col;
      continue;
    }

    // Detecta import (números amb format monetari)
    const amountMatches = nonEmptyValues.filter(v => {
      const amount = parseAmount(v);
      return amount > 0 && amount < 100000;
    });
    if (amountMatches.length > nonEmptyValues.length * 0.5 && amountColumn === null) {
      amountColumn = col;
      continue;
    }

    // Detecta data (DD/MM/YYYY o similar)
    const dateMatches = nonEmptyValues.filter(v => parseDate(v) !== null);
    if (dateMatches.length > nonEmptyValues.length * 0.5 && dateColumn === null) {
      dateColumn = col;
      continue;
    }

    // Detecta DNI/CIF (8-9 dígits + lletra)
    const dniMatches = nonEmptyValues.filter(v => {
      const cleaned = v.replace(/[\s-]/g, '').toUpperCase();
      return /^[0-9]{7,8}[A-Z]$/.test(cleaned) ||
             /^[A-Z][0-9]{7,8}$/.test(cleaned) ||
             /^[XYZ][0-9]{7}[A-Z]$/.test(cleaned);
    });
    if (dniMatches.length > nonEmptyValues.length * 0.3 && dniColumn === null) {
      dniColumn = col;
    }
  }

  return { ibanColumn, amountColumn, dateColumn, dniColumn };
};

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useReturnImporter() {
  const { toast } = useToast();
  const { log } = useAppLog();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();

  // Estat de navegació
  const [step, setStep] = React.useState<Step>('upload');
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Estat dels fitxers
  const [files, setFiles] = React.useState<File[]>([]);
  const [allRows, setAllRows] = React.useState<string[][]>([]);
  const [startRow, setStartRow] = React.useState(0);

  // Estat de mapejat
  const [mapping, setMapping] = React.useState<ColumnMapping>({
    ibanColumn: null,
    amountColumn: null,
    dateColumn: null,
    dniColumn: null,
  });

  // Estat de resultats
  const [parsedReturns, setParsedReturns] = React.useState<ParsedReturn[]>([]);

  // Carregar donants amb IBAN
  const donorsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: allContacts } = useCollection<Donor>(donorsQuery);

  const donors = React.useMemo(() => {
    return (allContacts || []).filter(c => c.type === 'donor');
  }, [allContacts]);

  // Carregar devolucions pendents (transactionType = 'return' i contactId = null)
  const pendingReturnsQuery = useMemoFirebase(
    () => organizationId
      ? query(
          collection(firestore, 'organizations', organizationId, 'transactions'),
          where('transactionType', '==', 'return'),
          where('contactId', '==', null)
        )
      : null,
    [firestore, organizationId]
  );
  const { data: pendingReturns } = useCollection<Transaction>(pendingReturnsQuery);

  // Estadístiques
  const stats = React.useMemo<ReturnImporterStats>(() => {
    const matched = parsedReturns.filter(r => r.status === 'matched').length;
    const donorFound = parsedReturns.filter(r => r.status === 'donor_found').length;
    const notFound = parsedReturns.filter(r => r.status === 'not_found').length;
    return { total: parsedReturns.length, matched, donorFound, notFound };
  }, [parsedReturns]);

  // Reset
  const reset = React.useCallback(() => {
    setStep('upload');
    setIsProcessing(false);
    setFiles([]);
    setAllRows([]);
    setStartRow(0);
    setMapping({ ibanColumn: null, amountColumn: null, dateColumn: null, dniColumn: null });
    setParsedReturns([]);
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // PARSING DE FITXERS
  // ═══════════════════════════════════════════════════════════════════════════

  const parseFiles = React.useCallback(async (inputFiles: File[]) => {
    setIsProcessing(true);
    const allParsedRows: string[][] = [];

    try {
      for (const file of inputFiles) {
        const fileName = file.name.toLowerCase();
        const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');

        if (isExcel) {
          const data = await file.arrayBuffer();
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: string[][] = XLSX.utils.sheet_to_json(firstSheet, {
            header: 1,
            defval: '',
            raw: false
          });

          const filteredRows = rows
            .filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== ''))
            .map(row => row.map(cell => String(cell ?? '').trim()));

          allParsedRows.push(...filteredRows);
        } else {
          // CSV/TXT
          const text = await file.text();
          const delimiter = text.includes(';') ? ';' : ',';
          const lines = text.split('\n').filter(line => line.trim());
          const rows = lines.map(line => line.split(delimiter).map(cell => cell.trim()));
          allParsedRows.push(...rows);
        }
      }

      if (allParsedRows.length === 0) {
        toast({ variant: 'destructive', title: 'Error', description: 'Els fitxers estan buits' });
        setIsProcessing(false);
        return;
      }

      setAllRows(allParsedRows);
      setFiles(inputFiles);

      // Detecta fila inicial i columnes
      const detectedStartRow = detectStartRow(allParsedRows);
      setStartRow(detectedStartRow);

      const detectedMapping = detectColumns(allParsedRows, detectedStartRow);
      setMapping(detectedMapping);

      log(`[ReturnImporter] Fitxers carregats: ${inputFiles.length}, files: ${allParsedRows.length}`);
      log(`[ReturnImporter] Detecció - IBAN: col ${detectedMapping.ibanColumn}, Import: col ${detectedMapping.amountColumn}, Data: col ${detectedMapping.dateColumn}, DNI: col ${detectedMapping.dniColumn}`);

      setStep('mapping');
    } catch (error: any) {
      console.error('Error parsing files:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, log]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MATCHING
  // ═══════════════════════════════════════════════════════════════════════════

  const performMatching = React.useCallback(() => {
    if (mapping.ibanColumn === null || mapping.amountColumn === null) {
      toast({
        variant: 'destructive',
        title: 'Falten columnes',
        description: 'Has de seleccionar les columnes IBAN i Import'
      });
      return;
    }

    setIsProcessing(true);

    try {
      const results: ParsedReturn[] = [];
      const dataRows = allRows.slice(startRow);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        const rawIban = mapping.ibanColumn !== null ? (row[mapping.ibanColumn] || '') : '';
        const iban = normalizeIban(rawIban);
        if (!iban) continue; // Saltar files sense IBAN

        const amount = parseAmount(row[mapping.amountColumn!] || '');
        if (amount <= 0) continue; // Saltar files sense import

        const rawDate = mapping.dateColumn !== null ? (row[mapping.dateColumn] || '') : '';
        const date = parseDate(rawDate);

        const rawDni = mapping.dniColumn !== null ? (row[mapping.dniColumn] || '') : '';
        const dni = normalizeTaxId(rawDni);

        // 1. Buscar donant per IBAN
        let matchedDonor = donors.find(d => d.iban && normalizeIban(d.iban) === iban);

        // 2. Si no trobat per IBAN i tenim DNI, buscar per DNI
        if (!matchedDonor && dni) {
          matchedDonor = donors.find(d => d.taxId && normalizeTaxId(d.taxId) === dni);
        }

        // 3. Buscar devolució pendent que coincideixi
        let matchedTransaction: Transaction | null = null;

        if (matchedDonor && pendingReturns) {
          // Buscar devolució amb import exacte (negatiu)
          const targetAmount = -amount;

          // Si tenim data, prioritzar devolucions dins de ±20 dies
          if (date) {
            const fileDate = new Date(date);
            const dayMs = 24 * 60 * 60 * 1000;
            const maxDiff = 20 * dayMs;

            matchedTransaction = pendingReturns.find(tx => {
              if (Math.abs(tx.amount - targetAmount) > 0.01) return false;

              const txDate = tx.date instanceof Date ? tx.date : new Date(tx.date);
              const diff = Math.abs(fileDate.getTime() - txDate.getTime());

              return diff <= maxDiff;
            }) || null;
          }

          // Si no hem trobat per mes, buscar per import exacte
          if (!matchedTransaction) {
            matchedTransaction = pendingReturns.find(tx =>
              Math.abs(tx.amount - targetAmount) < 0.01
            ) || null;
          }
        }

        // Determinar estat
        let status: ParsedReturn['status'];
        if (matchedDonor && matchedTransaction) {
          status = 'matched';
        } else if (matchedDonor) {
          status = 'donor_found';
        } else {
          status = 'not_found';
        }

        results.push({
          rowIndex: startRow + i + 1,
          iban,
          amount,
          date,
          dni,
          matchedDonor: matchedDonor || null,
          matchedTransaction,
          status,
        });
      }

      setParsedReturns(results);
      log(`[ReturnImporter] Matching completat: ${results.length} devolucions, ${results.filter(r => r.status === 'matched').length} coincidències`);
      setStep('preview');
    } catch (error: any) {
      console.error('Error in matching:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [allRows, startRow, mapping, donors, pendingReturns, toast, log]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSAR DEVOLUCIONS
  // ═══════════════════════════════════════════════════════════════════════════

  const processReturns = React.useCallback(async () => {
    if (!organizationId) return;

    const toProcess = parsedReturns.filter(r => r.status === 'matched' || r.status === 'donor_found');
    if (toProcess.length === 0) {
      toast({ variant: 'destructive', title: 'Res a processar', description: 'No hi ha devolucions per assignar' });
      return;
    }

    setStep('processing');
    setIsProcessing(true);

    try {
      let processed = 0;

      for (const returnItem of toProcess) {
        if (!returnItem.matchedDonor) continue;

        // Si tenim transacció coincident, actualitzar-la
        if (returnItem.matchedTransaction) {
          const txRef = doc(firestore, 'organizations', organizationId, 'transactions', returnItem.matchedTransaction.id);
          await updateDoc(txRef, {
            contactId: returnItem.matchedDonor.id,
            contactType: 'donor',
          });
        }

        // Actualitzar donant: incrementar returnCount i actualitzar lastReturnDate
        const donorRef = doc(firestore, 'organizations', organizationId, 'contacts', returnItem.matchedDonor.id);
        await updateDoc(donorRef, {
          returnCount: increment(1),
          lastReturnDate: returnItem.date || new Date().toISOString().split('T')[0],
          status: 'pending_return',
        });

        processed++;
      }

      log(`[ReturnImporter] ${processed} devolucions processades`);
      toast({
        title: 'Devolucions assignades',
        description: `S'han assignat ${processed} devolucions correctament`
      });

      reset();
    } catch (error: any) {
      console.error('Error processing returns:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [organizationId, parsedReturns, firestore, toast, log, reset]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  const previewRows = React.useMemo(() => {
    return allRows.slice(startRow, startRow + 8);
  }, [allRows, startRow]);

  const numColumns = React.useMemo(() => {
    return Math.max(...allRows.map(r => r.length), 0);
  }, [allRows]);

  return {
    // Estat
    step,
    setStep,
    isProcessing,

    // Fitxers
    files,
    allRows,
    startRow,
    setStartRow,
    previewRows,
    numColumns,

    // Mapejat
    mapping,
    setMapping,

    // Resultats
    parsedReturns,
    stats,

    // Accions
    parseFiles,
    performMatching,
    processReturns,
    reset,
  };
}
