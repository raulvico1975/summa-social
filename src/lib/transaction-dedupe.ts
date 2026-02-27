/**
 * Dedupe determinista per importació de transaccions
 *
 * 3 estats:
 * - DUPLICATE_SAFE: auto-skip (bankRef match o duplicat intra-fitxer)
 * - DUPLICATE_CANDIDATE: match per clau base sense bankRef → decisió de l'usuari
 * - NEW: sense cap match → importar
 */

import type { Transaction } from '@/lib/data';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

export type DedupeStatus = 'NEW' | 'DUPLICATE_SAFE' | 'DUPLICATE_CANDIDATE';
export type DedupeReason = 'BANK_REF' | 'BALANCE_AMOUNT_DATE' | 'BASE_KEY' | 'ENRICHED_KEY' | 'INTRA_FILE';

export interface ClassifiedRow {
  /** Transacció parsejada */
  tx: Omit<Transaction, 'id'>;
  /** Estat de classificació */
  status: DedupeStatus;
  /** Motiu de la classificació (null si NEW sense enrichment) */
  reason: DedupeReason | null;
  /** IDs dels existents que coincideixen (buit si NEW o intra-fitxer) */
  matchedExistingIds: string[];
  /** Dades bàsiques dels existents per mostrar a UI */
  matchedExisting: Array<{
    id: string;
    date: string;
    description: string;
    amount: number;
    operationDate?: string;
    balanceAfter?: number;
  }>;
  /** Fila original CSV/XLSX (totes les columnes) per enrichment i display */
  rawRow: Record<string, any>;
  /** Decisió de l'usuari per candidats: null = sense decidir */
  userDecision: 'import' | 'skip' | null;
}

/**
 * Tipus per transacció mínima per dedupe
 */
export interface DedupeTransaction {
  date: string;
  operationDate?: string;
  description: string;
  amount: number;
  balanceAfter?: number;
  bankRef?: string | null;
  valueDate?: string;
  bankAccountId?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALITZACIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalitza descripció per dedupe (determinista)
 * - trim
 * - reemplaçar NBSP (U+00A0) per espai normal
 * - col·lapsar espais múltiples
 * - uppercase
 */
export function normalizeDescriptionForDedupe(desc: string): string {
  return desc
    .trim()
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

/**
 * Normalitza data per dedupe
 * Usa valueDate si existeix (més precisa), sinó date
 * Retorna YYYY-MM-DD
 */
export function normalizeDateForDedupe(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Normalitza amount per dedupe (cents, evita decimals)
 */
export function normalizeAmountForDedupe(amount: number): number {
  return Math.round(amount * 100);
}

/**
 * Normalitza referència bancària per dedupe (opcional)
 */
export function normalizeBankRefForDedupe(ref: string | undefined | null): string | null {
  if (!ref) return null;
  return ref.trim().toUpperCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAU DE DEDUPE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Crea clau única per detectar duplicats
 *
 * Regla:
 * 1. La clau sempre inclou bankAccountId (dedupe per compte, no global)
 * 2. Si bankRef existeix → bankAccountId:ref:bankRef
 * 3. Sinó → bankAccountId:dateKey|amountCents|descKey
 *
 * INVARIANT: El dedupe és per compte bancari, no global.
 */
export function createDedupeKey(tx: {
  date: string;
  description: string;
  amount: number;
  bankRef?: string | null;
  valueDate?: string;
  bankAccountId?: string | null;
}): string {
  const accountPrefix = tx.bankAccountId || 'no-account';

  // Prioritat 1: referència bancària (si existeix)
  if (tx.bankRef) {
    const normalizedRef = normalizeBankRefForDedupe(tx.bankRef);
    if (normalizedRef) {
      return `${accountPrefix}:ref:${normalizedRef}`;
    }
  }

  // Prioritat 2: dedupe per camps normalitzats
  const dateKey = normalizeDateForDedupe(tx.valueDate || tx.date);
  const amountCents = normalizeAmountForDedupe(tx.amount);
  const descKey = normalizeDescriptionForDedupe(tx.description);

  return `${accountPrefix}:${dateKey}|${amountCents}|${descKey}`;
}

/**
 * Determina si una clau de dedupe és basada en bankRef
 */
function isRefKey(key: string): boolean {
  return key.includes(':ref:');
}

/**
 * Clau forta de dedupe amb saldo:
 * bankAccountId + balanceAfter + amount + operationDate
 */
function createBalanceAmountDateKey(tx: {
  date: string;
  operationDate?: string;
  amount: number;
  balanceAfter?: number;
  bankAccountId?: string | null;
}): string | null {
  if (typeof tx.balanceAfter !== 'number' || !Number.isFinite(tx.balanceAfter)) {
    return null;
  }
  if (!tx.operationDate) {
    return null;
  }

  const accountPrefix = tx.bankAccountId || 'no-account';
  const balanceAfterCents = normalizeAmountForDedupe(tx.balanceAfter);
  const amountCents = normalizeAmountForDedupe(tx.amount);
  const dateKey = normalizeDateForDedupe(tx.operationDate);

  return `${accountPrefix}:bal:${balanceAfterCents}|${amountCents}|${dateKey}`;
}

function hasFullModernBalanceData(tx: {
  operationDate?: unknown;
  balanceAfter?: unknown;
}): tx is { operationDate: string; balanceAfter: number } {
  return (
    typeof tx.operationDate === 'string' &&
    tx.operationDate.trim() !== '' &&
    typeof tx.balanceAfter === 'number' &&
    Number.isFinite(tx.balanceAfter)
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ENRICHMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calcula signatura extra a partir de camps compartits entre incoming i existing.
 *
 * Si fields és buit → retorna '' (sense info extra disponible).
 * Només inclou camps presents i no buits. Normalitza strings.
 */
export function getExtraSignature(
  obj: Record<string, any>,
  fields: string[]
): string {
  if (fields.length === 0) return '';

  const parts: string[] = [];
  for (const field of [...fields].sort()) {
    const val = obj[field];
    if (val !== undefined && val !== null && val !== '') {
      let normalized: string;
      if (typeof val === 'number') {
        // Arrodonir a cèntims per evitar floating point (1234.5600001 → 123456)
        normalized = String(Math.round(val * 100));
      } else if (typeof val === 'string') {
        normalized = val.trim().replace(/\s+/g, ' ').toUpperCase();
      } else {
        normalized = String(val);
      }
      parts.push(`${field}=${normalized}`);
    }
  }
  return parts.join('|');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFICACIÓ 3 ESTATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Classifica un array de transaccions parsejades en 3 estats:
 * - DUPLICATE_SAFE: auto-skip (bankRef match o duplicat intra-fitxer)
 * - DUPLICATE_CANDIDATE: match base sense bankRef → decisió usuari
 * - NEW: sense match
 *
 * @param parsedRows - Files parsejades amb tx i rawRow
 * @param existingTransactions - Transaccions existents a Firestore (rang de dates)
 * @param bankAccountId - Compte bancari seleccionat per l'import
 * @param extraFields - Camps extra compartits entre rawRow i Transaction (inicialment [])
 */
export function classifyTransactions(
  parsedRows: Array<{ tx: Omit<Transaction, 'id'>; rawRow: Record<string, any> }>,
  existingTransactions: Transaction[],
  bankAccountId: string,
  extraFields: string[] = []
): ClassifiedRow[] {
  // Indexar existents per refKey i baseKey
  const existingByRefKey = new Map<string, Array<{ id: string; tx: Transaction }>>();
  const existingByBalanceAmountDateKey = new Map<string, Array<{ id: string; tx: Transaction }>>();
  const existingByBaseKey = new Map<string, Array<{ id: string; tx: Transaction }>>();

  for (const etx of existingTransactions) {
    const key = createDedupeKey({
      date: etx.date,
      description: etx.description,
      amount: etx.amount,
      bankAccountId: etx.bankAccountId,
    });

    if (isRefKey(key)) {
      const arr = existingByRefKey.get(key) || [];
      arr.push({ id: etx.id, tx: etx });
      existingByRefKey.set(key, arr);
    } else {
      const arr = existingByBaseKey.get(key) || [];
      arr.push({ id: etx.id, tx: etx });
      existingByBaseKey.set(key, arr);
    }

    const balanceAmountDateKey = hasFullModernBalanceData(etx)
      ? createBalanceAmountDateKey({
        date: etx.date,
        operationDate: etx.operationDate,
        amount: etx.amount,
        balanceAfter: etx.balanceAfter,
        bankAccountId: etx.bankAccountId,
      })
      : null;
    if (balanceAmountDateKey) {
      const arr = existingByBalanceAmountDateKey.get(balanceAmountDateKey) || [];
      arr.push({ id: etx.id, tx: etx });
      existingByBalanceAmountDateKey.set(balanceAmountDateKey, arr);
    }
  }

  // Seguiment intra-fitxer: usa la mateixa noció de clau
  const seenInFileKeys = new Set<string>();

  const results: ClassifiedRow[] = [];

  for (const { tx, rawRow } of parsedRows) {
    // Construir clau efectiva amb el bankAccountId del selector
    const effectiveKey = createDedupeKey({
      date: tx.date,
      description: tx.description,
      amount: tx.amount,
      bankRef: (tx as any).bankRef,
      valueDate: (tx as any).valueDate,
      bankAccountId,
    });

    // Enrichment signature (calculada aviat per usar-la també a intra-fitxer)
    const incomingSig = getExtraSignature(rawRow, extraFields);

    // 1. Intra-fitxer: DUPLICATE_SAFE només si podem distingir amb certesa.
    //    - Amb bankRef (ref key): mateixa ref al fitxer = segur duplicat
    //    - Amb enrichment: mateixa key+signatura = segur duplicat
    //    - Sense cap dels dos: NO auto-skip (podrien ser transaccions legítimes
    //      amb mateixa data/import/descripció, com passa amb Triodos)
    const intraFileKey = incomingSig ? `${effectiveKey}||${incomingSig}` : effectiveKey;
    const canSafeSkipIntraFile = isRefKey(effectiveKey) || incomingSig !== '';

    if (canSafeSkipIntraFile && seenInFileKeys.has(intraFileKey)) {
      results.push({
        tx,
        status: 'DUPLICATE_SAFE',
        reason: 'INTRA_FILE',
        matchedExistingIds: [],
        matchedExisting: [],
        rawRow,
        userDecision: null,
      });
      continue;
    }
    seenInFileKeys.add(intraFileKey);

    // 2. Match amb bankRef
    if (isRefKey(effectiveKey)) {
      const refMatches = existingByRefKey.get(effectiveKey);
      if (refMatches && refMatches.length > 0) {
        results.push({
          tx,
          status: 'DUPLICATE_SAFE',
          reason: 'BANK_REF',
          matchedExistingIds: refMatches.map(m => m.id),
          matchedExisting: refMatches.map(m => ({
            id: m.id,
            date: m.tx.date,
            description: m.tx.description,
            amount: m.tx.amount,
            operationDate: m.tx.operationDate,
            balanceAfter: m.tx.balanceAfter,
          })),
          rawRow,
          userDecision: null,
        });
      } else {
        // bankRef present però sense match → NEW
        results.push({
          tx,
          status: 'NEW',
          reason: null,
          matchedExistingIds: [],
          matchedExisting: [],
          rawRow,
          userDecision: null,
        });
      }
      continue;
    }

    // 3. Regla forta amb saldo: bankAccount + balanceAfter + amount + operationDate
    const incomingHasFullData = hasFullModernBalanceData(tx);
    const balanceAmountDateKey = incomingHasFullData
      ? createBalanceAmountDateKey({
        date: tx.date,
        operationDate: tx.operationDate,
        amount: tx.amount,
        balanceAfter: (tx as { balanceAfter?: number }).balanceAfter,
        bankAccountId,
      })
      : null;
    if (balanceAmountDateKey) {
      const strongMatches = (existingByBalanceAmountDateKey.get(balanceAmountDateKey) || [])
        .filter(match => hasFullModernBalanceData(match.tx));
      if (strongMatches && strongMatches.length > 0) {
        results.push({
          tx: { ...tx, duplicateReason: 'balance+amount+date' },
          status: 'DUPLICATE_SAFE',
          reason: 'BALANCE_AMOUNT_DATE',
          matchedExistingIds: strongMatches.map(m => m.id),
          matchedExisting: strongMatches.map(m => ({
            id: m.id,
            date: m.tx.date,
            description: m.tx.description,
            amount: m.tx.amount,
            operationDate: m.tx.operationDate,
            balanceAfter: m.tx.balanceAfter,
          })),
          rawRow,
          userDecision: null,
        });
        continue;
      }
    }

    // 4. Sense bankRef/saldo fort: comprovar match per clau base
    const baseMatches = existingByBaseKey.get(effectiveKey);
    if (!baseMatches || baseMatches.length === 0) {
      // Sense match → NEW
      results.push({
        tx,
        status: 'NEW',
        reason: null,
        matchedExistingIds: [],
        matchedExisting: [],
        rawRow,
        userDecision: null,
      });
      continue;
    }

    // Hi ha match base. Intentar enrichment per reduir falsos candidats.

    if (incomingSig !== '') {
      // Tenim signatura extra: comprovar si algun existing coincideix
      let anyExistingExactMatch = false;
      let anyExistingMissingSig = false;
      for (const m of baseMatches) {
        const existingSig = getExtraSignature(m.tx as unknown as Record<string, any>, extraFields);
        if (existingSig === '') {
          // L'existent no té els camps extra → no es pot distingir per enrichment
          anyExistingMissingSig = true;
        } else if (existingSig === incomingSig) {
          anyExistingExactMatch = true;
          break;
        }
      }

      if (!anyExistingExactMatch && !anyExistingMissingSig) {
        // Tots els existents tenen signatura i cap coincideix → NEW (enrichment guanya)
        results.push({
          tx,
          status: 'NEW',
          reason: 'ENRICHED_KEY',
          matchedExistingIds: [],
          matchedExisting: [],
          rawRow,
          userDecision: null,
        });
        continue;
      }
    }

    // Fallback: DUPLICATE_CANDIDATE
    results.push({
      tx,
      status: 'DUPLICATE_CANDIDATE',
      reason: 'BASE_KEY',
      matchedExistingIds: baseMatches.map(m => m.id),
      matchedExisting: baseMatches.map(m => ({
        id: m.id,
        date: m.tx.date,
        description: m.tx.description,
        amount: m.tx.amount,
        operationDate: m.tx.operationDate,
        balanceAfter: m.tx.balanceAfter,
      })),
      rawRow,
      userDecision: null,
    });
  }

  return results;
}
