export const MISSION_TRANSFER_CATEGORY_KEY = 'missionTransfers';

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
