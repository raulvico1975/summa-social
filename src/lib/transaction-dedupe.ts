/**
 * Dedupe determinista per importació de transaccions
 *
 * P0: Duplicat segur = dateKey + amountCents + descKey (+ bankRefKey opcional)
 */

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
    // Reemplaçar NBSP (U+00A0) i altres espais Unicode per espai normal
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ') // Col·lapsar espais múltiples
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

/**
 * Crea clau única per detectar duplicats
 *
 * Regla:
 * 1. La clau sempre inclou bankAccountId (dedupe per compte, no global)
 * 2. Si bankRef existeix → bankAccountId:ref:bankRef
 * 3. Sinó → bankAccountId:dateKey|amountCents|descKey
 *
 * INVARIANT: El dedupe és per compte bancari, no global.
 * Si bankAccountId és diferent, NO és duplicat encara que la resta coincideixi.
 *
 * CRÍTIC: Usa sempre el camp `description` per garantir coherència
 * entre transaccions existents i parsejades.
 */
export function createDedupeKey(tx: {
  date: string;
  description: string;
  amount: number;
  bankRef?: string | null;
  valueDate?: string;
  bankAccountId?: string | null;
}): string {
  // Prefix amb bankAccountId (o 'no-account' si no n'hi ha)
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
 * Tipus per transacció mínima per dedupe
 */
export interface DedupeTransaction {
  date: string;
  description: string;
  amount: number;
  bankRef?: string | null;
  valueDate?: string;
  bankAccountId?: string | null;
}
