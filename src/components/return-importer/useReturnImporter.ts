'use client';

import * as React from 'react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useAppLog } from '@/hooks/use-app-log';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { collection, query, where, updateDoc, doc, increment, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import type { Transaction, Donor } from '@/lib/data';
import { normalizeIBAN, normalizeTaxId as normalizeLibTaxId } from '@/lib/normalize';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export type Step = 'upload' | 'mapping' | 'preview' | 'processing';

export type DateConfidence = 'line' | 'file' | 'none';

export type NoMatchReason = 'no-date' | 'ambiguous' | 'no-match' | null;

export interface ColumnMapping {
  ibanColumn: number | null;
  amountColumn: number | null;
  dateColumn: number | null;
  dniColumn: number | null;
  nameColumn: number | null;
  reasonColumn: number | null;
  // Columnes bulk (format NET)
  liquidationDateColumn: number | null;
  liquidationNumberColumn: number | null;
}

export interface ParsedReturn {
  rowIndex: number;
  iban: string;
  amount: number;                          // SEMPRE POSITIU (Math.abs)
  date: Date | null;                       // null si no hi ha data (MAI new Date() com fallback)
  dateConfidence: DateConfidence;
  sourceFile?: string;
  dni: string | null;
  originalName: string | null;
  returnReason: string | null;
  // Bulk mode (format NET) - opcional
  liquidationDateISO?: string;             // YYYY-MM-DD
  liquidationNumber?: string;
  // Matching donant
  matchedDonorId: string | null;
  matchedDonor: Donor | null;              // Referència completa per conveniència
  matchedBy: 'iban' | 'dni' | 'name' | 'manual' | null;
  // Matching transacció
  matchType: 'grouped' | 'individual' | 'none';
  noMatchReason: NoMatchReason;
  groupId: string | null;
  groupedTransactionId: string | null;
  groupTotalAmount: number | null;
  matchedTransactionId: string | null;
  matchedTransaction: Transaction | null;  // Referència completa per conveniència
  // Status derivat (per UI)
  status: 'matched' | 'donor_found' | 'not_found';
}

export interface GroupedMatch {
  originalTransaction: Transaction;
  returns: ParsedReturn[];
  totalAmount: number;
  date: Date;
  groupId: string;
}

// Tipus per mode Bulk (format NET)
export type BulkGroupStatus = 'auto' | 'needsReview' | 'noMatch';
export type BulkGroupReason = 'multipleCandidates' | 'outsideWindow' | 'noCandidates' | null;

export interface BulkReturnGroup {
  key: string;                             // `${liquidationDateISO}|${liquidationNumber}`
  liquidationDateISO: string;              // YYYY-MM-DD
  liquidationNumber: string;
  totalAmount: number;                     // POSITIU (suma de amounts)
  rows: ParsedReturn[];
  candidates: Transaction[];               // Pares candidats (amount match)
  candidatesInWindow: Transaction[];       // Candidats dins ±2 dies
  candidatesOutsideWindow: Transaction[];  // Candidats fora finestra
  status: BulkGroupStatus;
  reason: BulkGroupReason;
  selectedParentId: string | null;         // Per UI quan needsReview
  matchedParent: Transaction | null;       // Quan status='auto'
}

export interface ReturnImporterStats {
  total: number;
  matched: number;
  donorFound: number;
  notFound: number;
  grouped: number;
  ambiguous: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAPEIG DE COLUMNES PER BANC
// ═══════════════════════════════════════════════════════════════════════════════

const COLUMN_MAPPINGS = {
  iban: [
    'cuenta de adeudo', 'cuenta destino', 'cuenta del deudor', 'cta destino',
    'cta. destino', 'cta adeudo', 'iban', 'cuenta', 'account', 'compte'
  ],
  amount: [
    'importe', 'cantidad', 'amount', 'monto', 'valor', 'import', 'quantitat'
  ],
  date: [
    'fecha de liquidación', 'fecha de liquidacion', 'fecha rechazo/devolución',
    'fecha rechazo', 'fecha devolución', 'fecha devolucion', 'fecha liquidacion',
    'fecha', 'date', 'data'
  ],
  dni: [
    'referencia externa', 'dni', 'nif', 'cif', 'referencia', 'ref', 'id cliente',
    'identificador', 'documento', 'tax id'
  ],
  name: [
    'nombre cliente', 'nombre del deudor', 'nombre deudor', 'nombre', 'titular',
    'cliente', 'name', 'nom', 'deudor', 'beneficiario'
  ],
  reason: [
    'motivo devolución', 'motivo devolucion', 'motivo rechazo', 'motivo',
    'razón', 'razon', 'reason', 'causa', 'descripción', 'descripcion'
  ]
} as const;

type ColumnType = keyof typeof COLUMN_MAPPINGS;

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITATS
// ═══════════════════════════════════════════════════════════════════════════════

const normalizeIban = (iban: string): string => {
  if (!iban) return '';
  return iban
    .replace(/^IBAN\s*/i, '')
    .replace(/\s/g, '')
    .toUpperCase();
};

const normalizeTaxId = (taxId: string): string => {
  if (!taxId) return '';
  return taxId
    .replace(/[\s-]/g, '')
    .toUpperCase();
};

const normalizeName = (name: string): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Parseja un valor d'import (suporta formats EU i US)
 * Retorna SEMPRE valor absolut (positiu)
 */
const parseAmount = (value: string | number): number => {
  if (typeof value === 'number') return Math.abs(value);
  if (!value) return 0;

  const str = value.toString().trim();
  const cleaned = str.replace(/\s*(EUR|€|USD|\$|£)\s*/gi, '').trim();

  // Format EU: 1.234,56 → 1234.56
  if (/,\d{1,2}$/.test(cleaned)) {
    return Math.abs(parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))) || 0;
  }

  // Format US: 1,234.56 → 1234.56
  return Math.abs(parseFloat(cleaned.replace(/,/g, ''))) || 0;
};

/**
 * Parseja una data en múltiples formats
 * Retorna Date o null (MAI inventa dates)
 */
const parseDate = (value: string | number | Date | null | undefined): Date | null => {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  const str = value.toString().trim();
  if (!str) return null;

  // Format ISO: 2025-11-12 o 2025-11-12T00:00:00
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str.split(' ')[0].split('T')[0]);
    return isNaN(d.getTime()) ? null : d;
  }

  // Format EU: DD/MM/YYYY o DD-MM-YYYY
  const euMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (euMatch) {
    const [, day, month, year] = euMatch;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return isNaN(d.getTime()) ? null : d;
  }

  // Intentar parse directe com a últim recurs
  try {
    const parsed = new Date(str);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch {
    // Ignorar errors
  }

  return null;
};

/**
 * Extreu la data global de la capçalera del fitxer (per bancs com Santander)
 * Busca patrons com "Fecha de liquidación" i la data adjacent
 */
const extractGlobalDateFromHeaders = (rows: string[][]): Date | null => {
  const datePatterns = [
    'fecha de liquidación', 'fecha de liquidacion',
    'fecha liquidación', 'fecha liquidacion',
    'fecha rechazo', 'fecha devolución', 'fecha devolucion'
  ];

  // Buscar en les primeres 20 files
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;

    for (let j = 0; j < row.length; j++) {
      const cell = (row[j] || '').toString().toLowerCase().trim();

      if (datePatterns.some(pattern => cell.includes(pattern))) {
        // La data pot estar a cel·les adjacents
        const candidates = [
          row[j + 1],
          row[j + 2],
          rows[i + 1]?.[j],
          rows[i + 1]?.[j + 1],
          rows[i + 1]?.[j - 1]
        ];

        for (const val of candidates) {
          if (val) {
            const parsed = parseDate(val);
            if (parsed) {
              console.log('[extractGlobalDate] Data trobada:', parsed.toISOString().split('T')[0]);
              return parsed;
            }
          }
        }
      }
    }
  }

  console.log('[extractGlobalDate] Cap data global trobada');
  return null;
};

/**
 * Obté la data d'una transacció (gestiona Firestore Timestamp)
 */
const getTxDate = (tx: Transaction): Date => {
  if (typeof tx.date === 'string') {
    return new Date(tx.date);
  } else if (tx.date && typeof (tx.date as any).toDate === 'function') {
    return (tx.date as any).toDate();
  }
  return tx.date as Date;
};

const detectStartRow = (rows: string[][]): number => {
  const ibanPattern = /^(IBAN\s*)?[A-Z]{2}[0-9]{2}[A-Z0-9\s]{10,30}$/i;

  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const row = rows[i];
    if (!row || row.length < 2) continue;

    const hasIban = row.some(cell => {
      const cleaned = (cell || '').toString().trim().replace(/\s/g, '');
      return ibanPattern.test(cleaned);
    });

    if (hasIban) return i;
  }

  return 0;
};

const detectColumnByHeader = (headers: string[], fieldType: ColumnType): number => {
  const normalizedHeaders = headers.map(h => (h || '').toString().toLowerCase().trim());
  const patterns = COLUMN_MAPPINGS[fieldType];

  for (const pattern of patterns) {
    const index = normalizedHeaders.findIndex(h => h.includes(pattern));
    if (index !== -1) return index;
  }
  return -1;
};

const detectColumns = (rows: string[][], startRow: number): ColumnMapping => {
  const headerRow = startRow > 0 ? rows[startRow - 1] : null;

  let ibanColumn: number | null = null;
  let amountColumn: number | null = null;
  let dateColumn: number | null = null;
  let dniColumn: number | null = null;
  let nameColumn: number | null = null;
  let reasonColumn: number | null = null;

  if (headerRow && headerRow.length > 0) {
    const ibanIdx = detectColumnByHeader(headerRow, 'iban');
    const amountIdx = detectColumnByHeader(headerRow, 'amount');
    const dateIdx = detectColumnByHeader(headerRow, 'date');
    const dniIdx = detectColumnByHeader(headerRow, 'dni');
    const nameIdx = detectColumnByHeader(headerRow, 'name');
    const reasonIdx = detectColumnByHeader(headerRow, 'reason');

    if (ibanIdx >= 0) ibanColumn = ibanIdx;
    if (amountIdx >= 0) amountColumn = amountIdx;
    if (dateIdx >= 0) dateColumn = dateIdx;
    if (dniIdx >= 0) dniColumn = dniIdx;
    if (nameIdx >= 0) nameColumn = nameIdx;
    if (reasonIdx >= 0) reasonColumn = reasonIdx;
  }

  const sampleRows = rows.slice(startRow, startRow + 10);
  if (sampleRows.length === 0 || sampleRows[0].length === 0) {
    return { ibanColumn, amountColumn, dateColumn, dniColumn, nameColumn, reasonColumn, liquidationDateColumn: null, liquidationNumberColumn: null };
  }

  const numCols = Math.max(...sampleRows.map(r => r.length));

  for (let col = 0; col < numCols; col++) {
    const values = sampleRows.map(row => (row[col] || '').toString().trim());
    const nonEmptyValues = values.filter(v => v.length > 0);
    if (nonEmptyValues.length === 0) continue;

    if (ibanColumn === null) {
      const ibanMatches = nonEmptyValues.filter(v => {
        const cleaned = v.replace(/^IBAN\s*/i, '').replace(/\s/g, '').toUpperCase();
        return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{10,30}$/.test(cleaned);
      });
      if (ibanMatches.length > nonEmptyValues.length * 0.5) {
        ibanColumn = col;
        continue;
      }
    }

    if (amountColumn === null) {
      const amountMatches = nonEmptyValues.filter(v => {
        const amount = parseAmount(v);
        return amount > 0 && amount < 100000;
      });
      if (amountMatches.length > nonEmptyValues.length * 0.5) {
        amountColumn = col;
        continue;
      }
    }

    if (dateColumn === null) {
      const dateMatches = nonEmptyValues.filter(v => parseDate(v) !== null);
      if (dateMatches.length > nonEmptyValues.length * 0.5) {
        dateColumn = col;
        continue;
      }
    }

    if (dniColumn === null) {
      const dniMatches = nonEmptyValues.filter(v => {
        const cleaned = v.replace(/[\s-]/g, '').toUpperCase();
        return /^[0-9]{7,8}[A-Z]$/.test(cleaned) ||
               /^[A-Z][0-9]{7,8}$/.test(cleaned) ||
               /^[XYZ][0-9]{7}[A-Z]$/.test(cleaned);
      });
      if (dniMatches.length > nonEmptyValues.length * 0.3) {
        dniColumn = col;
      }
    }
  }

  return { ibanColumn, amountColumn, dateColumn, dniColumn, nameColumn, reasonColumn, liquidationDateColumn: null, liquidationNumberColumn: null };
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
    nameColumn: null,
    reasonColumn: null,
    liquidationDateColumn: null,
    liquidationNumberColumn: null,
  });

  // Estat de resultats
  const [parsedReturns, setParsedReturns] = React.useState<ParsedReturn[]>([]);
  const [groupedMatches, setGroupedMatches] = React.useState<GroupedMatch[]>([]);
  const [bulkReturnGroups, setBulkReturnGroups] = React.useState<BulkReturnGroup[]>([]);

  // Carregar donants
  const donorsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: allContacts } = useCollection<Donor>(donorsQuery);

  const donors = React.useMemo(() => {
    return (allContacts || []).filter(c => c.type === 'donor');
  }, [allContacts]);

  // Carregar transaccions candidates per matching:
  // - transactionType = 'return' amb contactId = null (individuals sense donant)
  // - Excloem remittanceStatus === 'complete' (ja resoltes)
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
  const { data: pendingReturnsRaw } = useCollection<Transaction>(pendingReturnsQuery);

  // Filtrar en memòria les que ja estan completes (remittanceStatus === 'complete')
  // Aquestes ja no són "pendents" i no han d'aparèixer al llistat
  const pendingReturns = React.useMemo(() => {
    if (!pendingReturnsRaw) return null;
    return pendingReturnsRaw.filter(tx => tx.remittanceStatus !== 'complete');
  }, [pendingReturnsRaw]);

  // Estadístiques
  const stats = React.useMemo<ReturnImporterStats>(() => {
    const matched = parsedReturns.filter(r => r.status === 'matched').length;
    const donorFound = parsedReturns.filter(r => r.status === 'donor_found').length;
    const notFound = parsedReturns.filter(r => r.status === 'not_found').length;
    const grouped = parsedReturns.filter(r => r.matchType === 'grouped').length;
    const ambiguous = parsedReturns.filter(r => r.noMatchReason === 'ambiguous').length;
    return { total: parsedReturns.length, matched, donorFound, notFound, grouped, ambiguous };
  }, [parsedReturns]);

  // Reset
  const reset = React.useCallback(() => {
    setStep('upload');
    setIsProcessing(false);
    setFiles([]);
    setAllRows([]);
    setStartRow(0);
    setMapping({ ibanColumn: null, amountColumn: null, dateColumn: null, dniColumn: null, nameColumn: null, reasonColumn: null, liquidationDateColumn: null, liquidationNumberColumn: null });
    setParsedReturns([]);
    setGroupedMatches([]);
    setBulkReturnGroups([]);
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

      const detectedStartRow = detectStartRow(allParsedRows);
      setStartRow(detectedStartRow);

      const detectedMapping = detectColumns(allParsedRows, detectedStartRow);
      setMapping(detectedMapping);

      log(`[ReturnImporter] Fitxers carregats: ${inputFiles.length}, files: ${allParsedRows.length}`);
      setStep('mapping');
    } catch (error: any) {
      console.error('Error parsing files:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [toast, log]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MATCHING - FLUX COMPLET REFACTORITZAT
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
      // ═══════════════════════════════════════════════════════════════════════
      // FASE 1: PARSEJAR DADES
      // ═══════════════════════════════════════════════════════════════════════

      const globalDate = extractGlobalDateFromHeaders(allRows);
      const results: ParsedReturn[] = [];
      const dataRows = allRows.slice(startRow);

      for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];

        const rawIban = mapping.ibanColumn !== null ? (row[mapping.ibanColumn] || '') : '';
        const iban = normalizeIban(rawIban);
        if (!iban) continue;

        const amount = parseAmount(row[mapping.amountColumn!] || '');
        if (amount <= 0) continue;

        // ═══════════════════════════════════════════════════════════════════
        // FASE 2: NORMALITZAR (dates + dateConfidence)
        // ═══════════════════════════════════════════════════════════════════

        const rawDate = mapping.dateColumn !== null ? (row[mapping.dateColumn] || '') : '';
        const lineDate = parseDate(rawDate);

        let date: Date | null = null;
        let dateConfidence: DateConfidence = 'none';

        if (lineDate) {
          date = lineDate;
          dateConfidence = 'line';
        } else if (globalDate) {
          date = globalDate;
          dateConfidence = 'file';
        }
        // Si no hi ha data, deixem date=null i dateConfidence='none' (MAI new Date())

        const rawDni = mapping.dniColumn !== null ? (row[mapping.dniColumn] || '') : '';
        const dni = normalizeTaxId(rawDni);

        const originalName = mapping.nameColumn !== null ? (row[mapping.nameColumn] || '').trim() : null;
        const returnReason = mapping.reasonColumn !== null ? (row[mapping.reasonColumn] || '').trim() : null;

        // Bulk mode (format NET): parsejar liquidationDate i liquidationNumber
        let liquidationDateISO: string | undefined;
        let liquidationNumber: string | undefined;
        if (mapping.liquidationDateColumn !== null && mapping.liquidationNumberColumn !== null) {
          const rawLiqDate = row[mapping.liquidationDateColumn] || '';
          const liqDate = parseDate(rawLiqDate);
          if (liqDate) {
            liquidationDateISO = liqDate.toISOString().split('T')[0]; // YYYY-MM-DD
          }
          liquidationNumber = (row[mapping.liquidationNumberColumn] || '').trim() || undefined;
        }

        results.push({
          rowIndex: startRow + i + 1,
          iban,
          amount,  // Ja és positiu (parseAmount fa Math.abs)
          date,
          dateConfidence,
          sourceFile: files[0]?.name,
          dni,
          originalName: originalName || null,
          returnReason: returnReason || null,
          matchedDonorId: null,
          matchedDonor: null,
          matchedBy: null,
          matchType: 'none',
          noMatchReason: null,
          groupId: null,
          groupedTransactionId: null,
          groupTotalAmount: null,
          matchedTransactionId: null,
          matchedTransaction: null,
          status: 'not_found',
          // Bulk mode (format NET)
          liquidationDateISO,
          liquidationNumber,
        });
      }

      // Log: breakdown per dateConfidence
      const lineCount = results.filter(r => r.dateConfidence === 'line').length;
      const fileCount = results.filter(r => r.dateConfidence === 'file').length;
      const noneCount = results.filter(r => r.dateConfidence === 'none').length;
      console.log(`[performMatching] FASE 1-2: ${results.length} parsejades (line:${lineCount}, file:${fileCount}, none:${noneCount})`);

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 3: MATCHING DONANTS (sense tocar transaccions)
      // ═══════════════════════════════════════════════════════════════════════

      for (const r of results) {
        // Buscar per IBAN
        let matchedDonor = donors.find(d => d.iban && normalizeIban(d.iban) === r.iban);
        let matchedBy: ParsedReturn['matchedBy'] = matchedDonor ? 'iban' : null;

        // Buscar per DNI
        if (!matchedDonor && r.dni) {
          matchedDonor = donors.find(d => d.taxId && normalizeTaxId(d.taxId) === r.dni);
          if (matchedDonor) matchedBy = 'dni';
        }

        // Buscar per nom
        if (!matchedDonor && r.originalName && r.originalName.length > 3) {
          const normalizedFileName = normalizeName(r.originalName);
          matchedDonor = donors.find(d => {
            if (!d.name) return false;
            const normalizedDonorName = normalizeName(d.name);
            return normalizedFileName === normalizedDonorName ||
                   normalizedFileName.includes(normalizedDonorName) ||
                   normalizedDonorName.includes(normalizedFileName);
          });
          if (matchedDonor) matchedBy = 'name';
        }

        r.matchedDonor = matchedDonor || null;
        r.matchedDonorId = matchedDonor?.id || null;
        r.matchedBy = matchedBy;
      }

      const withDonorCount = results.filter(r => r.matchedDonorId).length;
      console.log(`[performMatching] FASE 3: ${withDonorCount} amb donant trobat`);

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 4: DETECTAR AGRUPACIONS (ABANS del matching individual!)
      // Mode BULK: agrupa per liquidationDateISO|liquidationNumber amb ±2 dies
      // Mode NORMAL: agrupa per data amb ±5 dies
      // ═══════════════════════════════════════════════════════════════════════

      const usedTransactionIds = new Set<string>();
      const foundGroups: GroupedMatch[] = [];
      const bulkGroups: BulkReturnGroup[] = [];

      // Detectar mode bulk: totes les columnes NET han d'estar definides
      const isBulkNetFormat = mapping.liquidationDateColumn !== null && mapping.liquidationNumberColumn !== null;

      if (isBulkNetFormat) {
        // ═══════════════════════════════════════════════════════════════════
        // MODE BULK: Agrupar per liquidationDateISO|liquidationNumber
        // ═══════════════════════════════════════════════════════════════════
        console.log('[performMatching] FASE 4: Mode BULK detectat');

        const DAY_MS = 24 * 60 * 60 * 1000;
        const BULK_WINDOW_DAYS = 2; // ±2 dies per bulk mode

        // Agrupar per clau de liquidació
        const liquidationGroups = new Map<string, ParsedReturn[]>();
        for (const r of results) {
          if (r.liquidationDateISO && r.liquidationNumber) {
            const key = `${r.liquidationDateISO}|${r.liquidationNumber}`;
            if (!liquidationGroups.has(key)) liquidationGroups.set(key, []);
            liquidationGroups.get(key)!.push(r);
          }
        }

        console.log(`[performMatching] BULK: ${liquidationGroups.size} grups de liquidació`);

        let bulkGroupCounter = 0;
        for (const [key, returns] of liquidationGroups) {
          const [liquidationDateISO, liquidationNumber] = key.split('|');
          const liquidationDate = new Date(liquidationDateISO);
          const totalAmount = returns.reduce((sum, r) => sum + r.amount, 0);

          // Buscar TOTS els candidats per import (sense filtre de data)
          const allCandidates = (pendingReturns || []).filter(tx => {
            if (usedTransactionIds.has(tx.id)) return false;
            if (tx.amount >= 0) return false; // Ha de ser negatiu

            const txAmount = Math.abs(tx.amount);
            const amountDiff = Math.abs(txAmount - totalAmount);
            return amountDiff <= 0.02;
          });

          // Separar candidats dins i fora de la finestra ±2 dies
          const candidatesInWindow: typeof allCandidates = [];
          const candidatesOutsideWindow: typeof allCandidates = [];

          for (const tx of allCandidates) {
            const txDate = getTxDate(tx);
            const diffMs = Math.abs(txDate.getTime() - liquidationDate.getTime());
            const diffDays = diffMs / DAY_MS;

            if (diffDays <= BULK_WINDOW_DAYS) {
              candidatesInWindow.push(tx);
            } else {
              candidatesOutsideWindow.push(tx);
            }
          }

          // Determinar status i reason
          let status: BulkGroupStatus;
          let reason: BulkGroupReason = null;
          let matchedParent: Transaction | null = null;

          if (candidatesInWindow.length === 1) {
            // Auto-match: 1 candidat dins la finestra
            status = 'auto';
            matchedParent = candidatesInWindow[0];
          } else if (candidatesInWindow.length > 1) {
            // Múltiples candidats dins la finestra
            status = 'needsReview';
            reason = 'multipleCandidates';
          } else if (candidatesOutsideWindow.length > 0) {
            // 0 dins finestra però hi ha fora
            status = 'needsReview';
            reason = 'outsideWindow';
          } else {
            // 0 candidats totals
            status = 'noMatch';
            reason = 'noCandidates';
          }

          bulkGroupCounter++;
          const groupId = `bulk-${bulkGroupCounter}`;

          // Si auto-match, assignar a les devolucions
          if (status === 'auto' && matchedParent) {
            returns.forEach(r => {
              r.matchType = 'grouped';
              r.groupId = groupId;
              r.groupedTransactionId = matchedParent!.id;
              r.groupTotalAmount = Math.abs(matchedParent!.amount);
              r.matchedTransactionId = matchedParent!.id;
              r.matchedTransaction = matchedParent;
              r.status = 'matched';
            });

            foundGroups.push({
              originalTransaction: matchedParent,
              returns,
              totalAmount,
              date: liquidationDate,
              groupId,
            });

            usedTransactionIds.add(matchedParent.id);
          }

          // Guardar el grup bulk per a la UI
          bulkGroups.push({
            key,
            liquidationDateISO,
            liquidationNumber,
            totalAmount,
            rows: returns,
            candidates: allCandidates,
            candidatesInWindow,
            candidatesOutsideWindow,
            status,
            reason,
            selectedParentId: matchedParent?.id || null,
            matchedParent,
          });

          console.log(`[BULK] Grup ${key}: ${returns.length} devolucions, suma=${totalAmount.toFixed(2)}€, inWindow=${candidatesInWindow.length}, outWindow=${candidatesOutsideWindow.length}, status=${status}`);
        }

        console.log(`[performMatching] FASE 4 BULK: ${bulkGroups.filter(g => g.status === 'auto').length} auto, ${bulkGroups.filter(g => g.status === 'needsReview').length} needsReview, ${bulkGroups.filter(g => g.status === 'noMatch').length} noMatch`);

      } else {
        // ═══════════════════════════════════════════════════════════════════
        // MODE NORMAL: Agrupar per data amb ±5 dies
        // ═══════════════════════════════════════════════════════════════════

        // Considerar TOTES les devolucions AMB data vàlida (NO exigim donant!)
        const withValidDate = results.filter(r =>
          r.dateConfidence !== 'none' &&
          r.date !== null
        );

        // Agrupar per data (YYYY-MM-DD) - NO agrupar les 'no-date'
        const dateGroups = new Map<string, ParsedReturn[]>();
        for (const r of withValidDate) {
          const dateKey = r.date!.toISOString().split('T')[0];
          if (!dateGroups.has(dateKey)) dateGroups.set(dateKey, []);
          dateGroups.get(dateKey)!.push(r);
        }

        let groupCounter = 0;
        for (const [dateKey, returns] of dateGroups) {
          // Ignorar grups amb <2 devolucions
          if (returns.length < 2) continue;

          const totalAmount = returns.reduce((sum, r) => sum + r.amount, 0);
          const groupDate = returns[0].date!;

          // Buscar transaccions candidates
          const candidates = (pendingReturns || []).filter(tx => {
            if (usedTransactionIds.has(tx.id)) return false;
            if (tx.amount >= 0) return false; // Ha de ser negatiu

            const txAmount = Math.abs(tx.amount);
            const amountDiff = Math.abs(txAmount - totalAmount);
            if (amountDiff > 0.02) return false;

            // Filtre de data: ±5 dies
            const txDate = getTxDate(tx);
            const diffMs = Math.abs(txDate.getTime() - groupDate.getTime());
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            if (diffDays > 5) return false;

            return true;
          });

          console.log(`[detectGrouped] Grup ${dateKey}: ${returns.length} devolucions, suma=${totalAmount.toFixed(2)}€, candidates=${candidates.length}`);

          if (candidates.length === 1) {
            // Match únic -> assignar
            const matchingTx = candidates[0];
            groupCounter++;
            const groupId = `group-${groupCounter}`;

            returns.forEach(r => {
              r.matchType = 'grouped';
              r.groupId = groupId;
              r.groupedTransactionId = matchingTx.id;
              r.groupTotalAmount = Math.abs(matchingTx.amount);
              r.matchedTransactionId = matchingTx.id;
              r.matchedTransaction = matchingTx;
              r.status = 'matched';
            });

            foundGroups.push({
              originalTransaction: matchingTx,
              returns,
              totalAmount,
              date: groupDate,
              groupId,
            });

            usedTransactionIds.add(matchingTx.id);
            console.log(`[detectGrouped] ✅ Grup ${groupId} assignat a tx ${matchingTx.id}`);
          } else if (candidates.length > 1) {
            // Ambigüitat -> no assignar, marcar
            returns.forEach(r => {
              r.noMatchReason = 'ambiguous';
            });
            console.log(`[detectGrouped] ⚠️ Grup ${dateKey} ambiguo (${candidates.length} candidates)`);
          }
          // Si candidates.length === 0, no fem res (les devolucions queden per matching individual)
        }
      }

      console.log(`[performMatching] FASE 4: ${foundGroups.length} grups trobats`);

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 5: MATCHING INDIVIDUAL (només per les NO agrupades)
      // ═══════════════════════════════════════════════════════════════════════

      const nonGrouped = results.filter(r =>
        r.matchType !== 'grouped' &&
        r.matchedDonorId &&
        r.noMatchReason !== 'ambiguous'
      );
      console.log(`[performMatching] FASE 5: ${nonGrouped.length} devolucions per matching individual`);

      const DAY_MS = 24 * 60 * 60 * 1000;
      const MAX_DATE_DIFF_DAYS = 20;

      for (const r of nonGrouped) {
        const targetAmount = r.amount;

        // Buscar transaccions candidates
        const candidates = (pendingReturns || []).filter(tx => {
          if (usedTransactionIds.has(tx.id)) return false;

          const txAmount = Math.abs(tx.amount);
          const amountDiff = Math.abs(txAmount - targetAmount);
          if (amountDiff > 0.02) return false;

          // Filtre de data
          if (r.dateConfidence !== 'none' && r.date) {
            const txDate = getTxDate(tx);
            const diffMs = Math.abs(txDate.getTime() - r.date.getTime());
            const diffDays = diffMs / DAY_MS;
            if (diffDays > MAX_DATE_DIFF_DAYS) return false;
          }
          // Si dateConfidence === 'none', NO apliquem filtre de data

          return true;
        });

        if (candidates.length === 1) {
          // Match únic -> assignar
          const matchingTx = candidates[0];
          r.matchType = 'individual';
          r.matchedTransactionId = matchingTx.id;
          r.matchedTransaction = matchingTx;
          r.status = 'matched';
          usedTransactionIds.add(matchingTx.id);
        } else if (candidates.length > 1) {
          // Ambigüitat
          r.matchType = 'none';
          r.noMatchReason = 'ambiguous';
          r.status = 'donor_found';
        } else {
          // Cap candidat
          r.matchType = 'none';
          r.noMatchReason = r.dateConfidence === 'none' ? 'no-date' : 'no-match';
          r.status = 'donor_found';
        }
      }

      // Actualitzar status per les que no tenen donant
      results.forEach(r => {
        if (!r.matchedDonorId) {
          r.status = 'not_found';
        }
      });

      // ═══════════════════════════════════════════════════════════════════════
      // FASE 6: GUARDAR RESULTATS + STATS
      // ═══════════════════════════════════════════════════════════════════════

      setParsedReturns(results);
      setGroupedMatches(foundGroups);
      setBulkReturnGroups(bulkGroups);

      const individualMatched = results.filter(r => r.matchType === 'individual').length;
      const groupedCount = results.filter(r => r.matchType === 'grouped').length;
      const ambiguousCount = results.filter(r => r.noMatchReason === 'ambiguous').length;

      if (isBulkNetFormat) {
        const autoCount = bulkGroups.filter(g => g.status === 'auto').length;
        const reviewCount = bulkGroups.filter(g => g.status === 'needsReview').length;
        const noMatchCount = bulkGroups.filter(g => g.status === 'noMatch').length;
        log(`[ReturnImporter] BULK Matching: ${bulkGroups.length} grups | auto:${autoCount} | needsReview:${reviewCount} | noMatch:${noMatchCount}`);
      } else {
        log(`[ReturnImporter] Matching completat: ${results.length} devolucions | grouped:${groupedCount} (${foundGroups.length} grups) | individual:${individualMatched} | ambiguous:${ambiguousCount}`);
      }

      setStep('preview');

    } catch (error: any) {
      console.error('Error in matching:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setIsProcessing(false);
    }
  }, [allRows, startRow, mapping, donors, pendingReturns, files, toast, log]);

  // ═══════════════════════════════════════════════════════════════════════════
  // PROCESSAR DEVOLUCIONS (escriptura a Firestore)
  // ═══════════════════════════════════════════════════════════════════════════

  interface ProcessReturnsOptions {
    forceRecreateChildren?: boolean;
  }

  const processReturns = React.useCallback(async (options: ProcessReturnsOptions = {}) => {
    const { forceRecreateChildren = false } = options;
    if (!organizationId) return;

    // Separar individuals i agrupades
    const individualReturns = parsedReturns.filter(r =>
      (r.status === 'matched' || r.status === 'donor_found') && r.matchType !== 'grouped'
    );
    const groupedReturnsToProcess = parsedReturns.filter(r =>
      r.status === 'matched' && r.matchType === 'grouped'
    );

    if (individualReturns.length === 0 && groupedReturnsToProcess.length === 0) {
      toast({ variant: 'destructive', title: 'Res a processar', description: 'No hi ha devolucions per assignar' });
      return;
    }

    setStep('processing');
    setIsProcessing(true);

    try {
      let processedIndividual = 0;
      let processedGrouped = 0;

      // 1. Processar devolucions individuals
      for (const returnItem of individualReturns) {
        if (!returnItem.matchedDonor) continue;

        // Si tenim transacció coincident, actualitzar-la
        if (returnItem.matchedTransaction) {
          const txRef = doc(firestore, 'organizations', organizationId, 'transactions', returnItem.matchedTransaction.id);
          await updateDoc(txRef, {
            contactId: returnItem.matchedDonor.id,
            contactType: 'donor',
          });
        }

        // Actualitzar donant
        const donorRef = doc(firestore, 'organizations', organizationId, 'contacts', returnItem.matchedDonor.id);
        await updateDoc(donorRef, {
          returnCount: increment(1),
          lastReturnDate: returnItem.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          status: 'pending_return',
        });

        processedIndividual++;
      }

      // 2. Processar devolucions agrupades (patró remeses: pare + filles)
      const processedGroupIds = new Set<string>();

      for (const returnItem of groupedReturnsToProcess) {
        if (!returnItem.groupId || processedGroupIds.has(returnItem.groupId)) continue;
        processedGroupIds.add(returnItem.groupId);

        const group = groupedMatches.find(g => g.groupId === returnItem.groupId);
        if (!group) continue;

        // ═══════════════════════════════════════════════════════════════════
        // IDEMPOTENCY CHECK: Verificar si ja existeixen fills per aquest pare
        // ═══════════════════════════════════════════════════════════════════
        const existingChildrenQuery = query(
          collection(firestore, 'organizations', organizationId, 'transactions'),
          where('parentTransactionId', '==', group.originalTransaction.id)
        );
        const existingChildrenSnap = await getDocs(existingChildrenQuery);
        const existingChildrenCount = existingChildrenSnap.size;

        // ═══════════════════════════════════════════════════════════════════
        // FORCE RECREATE: Si l'opció està activa, eliminar TOTS els fills existents
        // ═══════════════════════════════════════════════════════════════════
        if (forceRecreateChildren && existingChildrenCount > 0) {
          console.log(`[processReturns] 🔴 FORCE RECREATE: Eliminant ${existingChildrenCount} fills existents del pare ${group.originalTransaction.id}`);

          for (const childDoc of existingChildrenSnap.docs) {
            await deleteDoc(doc(firestore, 'organizations', organizationId, 'transactions', childDoc.id));
            console.log(`[processReturns] Eliminat fill: ${childDoc.id}`);
          }

          console.log(`[processReturns] ✅ Fills eliminats. Ara es crearan de nou.`);
        }

        // Si ja hi ha fills I NO estem forçant recreació, només actualitzem el pare (no creem més fills)
        const skipChildCreation = existingChildrenCount > 0 && !forceRecreateChildren;

        // SEPARAR: resolubles (amb donant) vs pendents (sense donant)
        // Necessari per a la creació de filles (quan !skipChildCreation)
        const resolubles = group.returns.filter(r => r.matchedDonor);
        const pendents = group.returns.filter(r => !r.matchedDonor);

        // Variables per l'estat del pare
        let remittanceStatus: 'complete' | 'partial' | 'pending';
        let itemCount: number;
        let resolvedCount: number;
        let pendingCount: number;
        let pendingTotalAmount: number;
        let pendingReturnsData: Array<{
          iban: string;
          amount: number;
          date: string;
          originalName?: string;
          returnReason?: string;
        }> | null;

        if (skipChildCreation) {
          // ═══════════════════════════════════════════════════════════════════
          // BACKFILL: Actualitzar filles existents sense contactId
          // ═══════════════════════════════════════════════════════════════════
          console.log(`[processReturns] Grup ${group.groupId} ja té ${existingChildrenCount} fills existents (pare: ${group.originalTransaction.id}) - aplicant backfill`);

          // Carregar dades de les filles existents (amb ID del document)
          const existingChildrenWithId = existingChildrenSnap.docs.map(d => {
            const data = d.data() as Transaction;
            // Usar l'ID del document, no el camp id de les dades
            return { ...data, id: d.id };
          });

          // Filles sense contactId (pendents d'assignar)
          const childrenWithoutContact = existingChildrenWithId.filter(c => !c.contactId);
          console.log(`[processReturns] Filles sense contactId: ${childrenWithoutContact.length}`);
          console.log(`[processReturns] Resolubles (amb donant): ${resolubles.length}`);

          // Helper robust per comparar imports
          const sameAmount = (a: number, b: number) => Math.abs(a - b) <= 0.02;

          // Per cada devolució resoluble (amb donant), buscar una filla coincident
          let backfilledCount = 0;
          const usedChildIds = new Set<string>();

          for (const ret of resolubles) {
            const retAmount = ret.amount; // positiu (import de la devolució)
            console.log(`[processReturns] Buscant filla per devolució: ${ret.matchedDonor?.name}, import=${retAmount}€`);

            // Buscar filla amb import coincident (tolerància 0.02€) i sense contactId
            const matchingChild = childrenWithoutContact.find(child => {
              if (usedChildIds.has(child.id)) return false;
              if (typeof child.amount !== 'number') {
                console.log(`[processReturns] Filla ${child.id} té amount invàlid: ${child.amount}`);
                return false;
              }
              const childAmount = Math.abs(child.amount); // positiu
              const matches = sameAmount(childAmount, retAmount);
              console.log(`[processReturns] Comparant filla ${child.id}: ${childAmount}€ vs ${retAmount}€ → ${matches ? 'MATCH' : 'no'}`);
              return matches;
            });

            if (matchingChild) {
              // Marcar com a usada
              usedChildIds.add(matchingChild.id);

              // Actualitzar la filla NOMÉS amb contactId i contactType
              // (no emisorId/emisorName - camps que l'app no llegeix)
              const childRef = doc(firestore, 'organizations', organizationId, 'transactions', matchingChild.id);
              await updateDoc(childRef, {
                contactId: ret.matchedDonor!.id,
                contactType: 'donor',
                transactionType: 'return',
              });

              // NO actualitzem el donant aquí (simplificar per debug)

              backfilledCount++;
              processedGrouped++;
              console.log(`[processReturns] ✅ Backfill: filla ${matchingChild.id} assignada a donant ${ret.matchedDonor!.name} (contactId: ${ret.matchedDonor!.id})`);
            } else {
              console.log(`[processReturns] ⚠️ No s'ha trobat filla per devolució ${ret.matchedDonor?.name} (${retAmount}€)`);
            }
          }

          console.log(`[processReturns] Backfill completat: ${backfilledCount}/${resolubles.length} filles actualitzades`);

          // GUARDRAIL: Si no hem escrit res però hi havia resolubles, avisar
          if (backfilledCount === 0 && resolubles.length > 0) {
            console.warn(`[processReturns] ⚠️ BACKFILL FALLIT: ${resolubles.length} resolubles però 0 filles actualitzades!`);
            console.warn(`[processReturns] Filles disponibles: ${childrenWithoutContact.map(c => `${c.id}:${c.amount}`).join(', ')}`);
            console.warn(`[processReturns] Resolubles: ${resolubles.map(r => `${r.matchedDonor?.name}:${r.amount}`).join(', ')}`);
          }

          // Recalcular estat DESPRÉS del backfill (recarregar de Firestore)
          const updatedChildrenSnap = await getDocs(existingChildrenQuery);
          const updatedChildren = updatedChildrenSnap.docs.map(d => d.data());

          // Comptar resoltes (amb contactId) vs pendents (sense contactId)
          resolvedCount = updatedChildren.filter(c => c.contactId).length;

          // itemCount: usar el del pare si existeix, sinó el nombre de fills actuals
          itemCount = group.originalTransaction.remittanceItemCount ?? existingChildrenCount;

          // pendingCount: diferència entre total i resoltes
          pendingCount = Math.max(0, itemCount - resolvedCount);

          // Calcular estat basat en les dades reals
          if (pendingCount === 0 && itemCount > 0) {
            remittanceStatus = 'complete';
            pendingReturnsData = null;
            pendingTotalAmount = 0;
          } else if (resolvedCount === 0) {
            remittanceStatus = 'pending';
            // Mantenir pendingReturns del pare si existeix
            pendingReturnsData = group.originalTransaction.pendingReturns ?? null;
            pendingTotalAmount = pendingReturnsData?.reduce((sum, r) => sum + r.amount, 0) ?? 0;
          } else {
            remittanceStatus = 'partial';
            // Recalcular pendingReturns basant-se en filles sense contactId
            const stillPending = updatedChildren.filter(c => !c.contactId);
            pendingReturnsData = stillPending.length > 0 ? stillPending.map(c => ({
              iban: '', // No tenim IBAN de la filla
              amount: Math.abs(c.amount || 0),
              date: c.date || '',
            })) : null;
            pendingTotalAmount = stillPending.reduce((sum, c) => sum + Math.abs(c.amount || 0), 0);
          }

          console.log(`[processReturns] Estat recalculat post-backfill: resolved=${resolvedCount}, pending=${pendingCount}, itemCount=${itemCount}, status=${remittanceStatus}`);
        } else {
          // ═══════════════════════════════════════════════════════════════════
          // CALCULAR ESTAT DES DE DADES PARSEJADES (primer processament)
          // ═══════════════════════════════════════════════════════════════════

          itemCount = group.returns.length;
          resolvedCount = resolubles.length;
          pendingCount = pendents.length;
          pendingTotalAmount = pendents.reduce((sum, r) => sum + r.amount, 0);

          // Calcular remittanceStatus
          if (pendingCount === 0) {
            remittanceStatus = 'complete';
          } else if (resolvedCount === 0) {
            remittanceStatus = 'pending';
          } else {
            remittanceStatus = 'partial';
          }

          // Preparar pendingReturns (dades per assistència posterior)
          // IMPORTANT: No passar undefined a Firestore - usar null o ometre el camp
          pendingReturnsData = pendingCount > 0 ? pendents.map(r => {
            const item: {
              iban: string;
              amount: number;
              date: string;
              originalName?: string;
              returnReason?: string;
            } = {
              iban: r.iban,
              amount: r.amount,
              date: r.date?.toISOString().split('T')[0] || '',
            };
            if (r.originalName) item.originalName = r.originalName;
            if (r.returnReason) item.returnReason = r.returnReason;
            return item;
          }) : null;
        }

        // MARCAR EL PARE com a remesa (NO esborrar! NO tocar amount/date/description/contactId)
        const parentTxRef = doc(firestore, 'organizations', organizationId, 'transactions', group.originalTransaction.id);

        // Construir payload sense undefined (Firestore no accepta undefined)
        const parentUpdateData = {
          isRemittance: true,
          remittanceType: 'returns' as const,
          remittanceItemCount: itemCount,
          remittanceResolvedCount: resolvedCount,
          remittancePendingCount: pendingCount,
          remittancePendingTotalAmount: pendingTotalAmount,
          remittanceStatus,
          pendingReturns: pendingReturnsData,
        };

        console.log('[processReturns] parent update payload', parentUpdateData);
        await updateDoc(parentTxRef, parentUpdateData);

        // Crear transaccions FILLES NOMÉS per resolubles (amb donant)
        // SKIP si ja existeixen fills (idempotency)
        if (!skipChildCreation) {
          for (const ret of resolubles) {
            const childTxData = {
              // Camps de la filla
              source: 'remittance',
              parentTransactionId: group.originalTransaction.id,
              amount: -ret.amount,  // Import negatiu (devolució)
              date: ret.date?.toISOString().split('T')[0] || group.date.toISOString().split('T')[0],
              transactionType: 'return',
              description: ret.returnReason || group.originalTransaction.description || 'Devolució',
              // Donant assignat (això fa que compti a Model182)
              contactId: ret.matchedDonor!.id,
              contactType: 'donor',
              emisorId: ret.matchedDonor!.id,
              emisorName: ret.matchedDonor!.name,
            };

            await addDoc(
              collection(firestore, 'organizations', organizationId, 'transactions'),
              childTxData
            );

            // Actualitzar donant
            const donorRef = doc(firestore, 'organizations', organizationId, 'contacts', ret.matchedDonor!.id);
            await updateDoc(donorRef, {
              returnCount: increment(1),
              lastReturnDate: ret.date?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
              status: 'pending_return',
            });

            processedGrouped++;
          }
        }

        // Log de l'estat de la remesa
        if (remittanceStatus === 'partial') {
          console.log(`[processReturns] Remesa ${group.groupId} PARCIAL: ${resolubles.length} resoltes, ${pendents.length} pendents (${pendents.reduce((s, r) => s + r.amount, 0).toFixed(2)}€)`);
        }
      }

      log(`[ReturnImporter] ${processedIndividual} individuals + ${processedGrouped} agrupades processades`);
      toast({
        title: 'Devolucions assignades',
        description: `S'han assignat ${processedIndividual + processedGrouped} devolucions correctament`
      });

      reset();
    } catch (error: any) {
      console.error('Error processing returns:', error);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      setStep('preview');
    } finally {
      setIsProcessing(false);
    }
  }, [organizationId, parsedReturns, groupedMatches, firestore, toast, log, reset]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR DONANT PER A DEVOLUCIÓ PENDENT
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Crea un nou donant i l'assigna a una devolució pendent.
   * - Dedupe per taxId: si ja existeix, assigna l'existent sense crear.
   * - IBAN opcional (pot ser buit).
   * - matchedBy: 'manual' per indicar creació manual.
   */
  const handleCreateDonorForReturn = React.useCallback(async (
    returnIndex: number,
    donorData: {
      name: string;
      taxId: string;
      zipCode?: string;
      iban?: string;
    }
  ): Promise<{ success: boolean; donorId?: string; error?: string }> => {
    if (!organizationId || !firestore) {
      return { success: false, error: 'No organization context' };
    }

    try {
      const normalizedTaxId = normalizeLibTaxId(donorData.taxId);
      const normalizedIban = donorData.iban ? normalizeIBAN(donorData.iban) : '';

      // 1. Dedupe: buscar si ja existeix un donant amb aquest taxId
      const existingDonor = donors?.find(d =>
        normalizeLibTaxId(d.taxId || '') === normalizedTaxId
      );

      let finalDonor: Donor;

      if (existingDonor) {
        // Ja existeix → usar-lo directament
        finalDonor = existingDonor;
      } else {
        // 2. Crear nou donant a Firestore
        const now = new Date().toISOString();
        const contactsRef = collection(firestore, `organizations/${organizationId}/contacts`);
        const newDonorDoc = await addDoc(contactsRef, {
          type: 'donor',
          name: donorData.name.trim(),
          taxId: normalizedTaxId,
          zipCode: donorData.zipCode?.trim() || '',
          ...(normalizedIban ? { iban: normalizedIban } : {}),
          donorType: 'individual',
          membershipType: 'one-time',
          status: 'inactive',
          createdAt: now,
          updatedAt: now,
        });

        finalDonor = {
          id: newDonorDoc.id,
          type: 'donor',
          name: donorData.name.trim(),
          taxId: normalizedTaxId,
          zipCode: donorData.zipCode?.trim() || '',
          iban: normalizedIban || undefined,
          donorType: 'individual',
          membershipType: 'one-time',
          status: 'inactive',
          createdAt: now,
          updatedAt: now,
        };
      }

      // 3. Actualitzar l'estat local: assignar el donant a la devolució
      setParsedReturns(prev => prev.map((item, idx) => {
        if (idx === returnIndex) {
          return {
            ...item,
            matchedDonor: finalDonor,
            matchedDonorId: finalDonor.id,
            matchedBy: 'manual' as const,
            status: 'matched' as const,
          };
        }
        return item;
      }));

      return { success: true, donorId: finalDonor.id };
    } catch (error) {
      console.error('Error creating donor:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }, [organizationId, firestore, donors]);

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
    groupedMatches,
    bulkReturnGroups,
    stats,

    // Accions
    parseFiles,
    performMatching,
    processReturns,
    reset,
    handleCreateDonorForReturn,
  };
}
