export const MISSION_TRANSFER_CATEGORY_KEY = 'missionTransfers';

/** Categories de sistema: el seu systemKey és invariant i no es poden arxivar */
export const SYSTEM_CATEGORY_KEYS = ['missionTransfers'] as const;
export type SystemCategoryKey = (typeof SYSTEM_CATEGORY_KEYS)[number];

/**
 * Troba el docId d'una categoria de sistema dins la llista de categories de l'org.
 * Cerca per systemKey (prioritari) → name com a fallback (orgs legacy).
 */
export function findSystemCategoryId(
  categories: Array<{ id: string; name: string; systemKey?: string | null }>,
  systemKey: SystemCategoryKey
): string | null {
  const byKey = categories.find(c => c.systemKey === systemKey);
  if (byKey) return byKey.id;
  const byName = categories.find(c => c.name === systemKey);
  if (byName) return byName.id;
  return null;
}

// Email de contacte/suport centralitzat
export const SUPPORT_EMAIL = 'hola@summasocial.app';

export const TRANSACTION_URL_FILTERS = [
  'uncategorized',
  'noContact',
  'returns',
  'income',
  'operatingExpenses',
  'missionTransfers',
  'donations',
  'memberFees',
] as const;

export type TransactionUrlFilter = (typeof TRANSACTION_URL_FILTERS)[number];

// Filtre per source de transacció
export type SourceFilter = 'all' | 'bank' | 'remittance' | 'manual' | 'stripe' | 'null';
