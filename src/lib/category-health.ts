/**
 * Utilitats per detectar categories legacy (docIds en lloc de nameKeys)
 * i validar la integritat de les dades de transaccions.
 */

import { CATEGORY_TRANSLATION_KEYS } from './default-data';

// Set de nameKeys vàlids (els que existeixen a CATEGORY_TRANSLATION_KEYS)
const KNOWN_CATEGORY_KEYS = new Set(Object.keys(CATEGORY_TRANSLATION_KEYS));

// Afegir valors especials que són vàlids però no estan a CATEGORY_TRANSLATION_KEYS
KNOWN_CATEGORY_KEYS.add('Revisar'); // Categoria especial per moviments pendents

/**
 * Comprova si una categoria és un nameKey conegut (vàlid)
 */
export function isKnownCategoryKey(category: string | null | undefined): boolean {
  if (!category) return true; // null/undefined és vàlid (sense categoria)
  return KNOWN_CATEGORY_KEYS.has(category);
}

/**
 * Heurística per detectar si una categoria té pinta de docId legacy
 * (string llarg alfanumèric, típicament >= 20 chars)
 */
export function looksLikeLegacyDocId(category: string | null | undefined): boolean {
  if (!category) return false;
  // DocIds de Firestore són típicament 20+ chars alfanumèrics
  if (category.length < 20) return false;
  // Si és un nameKey conegut, no és legacy
  if (isKnownCategoryKey(category)) return false;
  // Comprova si té pinta de docId (alfanumèric)
  return /^[a-zA-Z0-9]+$/.test(category);
}

/**
 * Tipus per a una transacció amb category legacy detectada
 */
export interface LegacyCategoryTransaction {
  id: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
}

/**
 * Analitza un array de transaccions i retorna les que tenen categories legacy
 */
export function detectLegacyCategoryTransactions<T extends { id: string; date: string; amount: number; category: string | null; description?: string }>(
  transactions: T[]
): LegacyCategoryTransaction[] {
  return transactions
    .filter(tx => tx.category && looksLikeLegacyDocId(tx.category))
    .map(tx => ({
      id: tx.id,
      date: tx.date,
      amount: tx.amount,
      category: tx.category!,
      description: tx.description,
    }));
}

/**
 * Genera un resum de categories legacy per logging
 */
export function logLegacyCategorySummary(
  orgId: string,
  legacyTransactions: LegacyCategoryTransaction[]
): void {
  if (legacyTransactions.length === 0) return;

  const examples = legacyTransactions.slice(0, 5);

  console.warn(
    `[CATEGORY-HEALTH] ⚠️ Detectades ${legacyTransactions.length} transaccions amb category legacy (docId)`,
    {
      orgId,
      count: legacyTransactions.length,
      examples: examples.map(tx => ({
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        category: tx.category,
      })),
    }
  );
}
