export const MISSION_TRANSFER_CATEGORY_KEY = 'missionTransfers';

export const TRANSACTION_URL_FILTERS = [
  'uncategorized',
  'noContact',
  'returns',
  'income',
  'operatingExpenses',
  'missionTransfers',
] as const;

export type TransactionUrlFilter = (typeof TRANSACTION_URL_FILTERS)[number];
