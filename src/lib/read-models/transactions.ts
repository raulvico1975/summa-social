import type { Transaction } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { isVisibleInMovementsLedger } from '@/lib/transactions/remittance-visibility';

type SearchParamsLike = {
  get(name: string): string | null;
};

export interface PeriodRange {
  start: string | null;
  end: string | null;
}

export interface DashboardSummary {
  income: number;
  expense: number;
  missionTransfers: number;
  balance: number;
  count: number;
}

export interface TransactionPageCursor {
  id: string;
}

export type TransactionMovementType = 'income' | 'expense';

export interface TransactionPageFilters {
  search: string;
  movementType: TransactionMovementType | null;
  contactId: string | null;
  categoryId: string | null;
  source: 'bank' | 'remittance' | 'manual' | 'stripe' | 'null' | null;
  bankAccountId: string | null;
}

export interface TransactionSearchContext {
  contactNamesById?: Record<string, string>;
  categoryLabelsById?: Record<string, string>;
  projectNamesById?: Record<string, string>;
}

function parseIntParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseTrimmedParam(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed || null;
}

function parseMovementType(value: string | null): TransactionMovementType | null {
  if (value === 'income' || value === 'expense') return value;
  return null;
}

function parseSourceFilter(value: string | null): TransactionPageFilters['source'] {
  if (
    value === 'bank' ||
    value === 'remittance' ||
    value === 'manual' ||
    value === 'stripe' ||
    value === 'null'
  ) {
    return value;
  }
  return null;
}

function normalizeSearchTerm(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeSearchDigits(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function buildMonthDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function resolvePeriodRange(params: SearchParamsLike): PeriodRange {
  const explicitYear = parseIntParam(params.get('year'));
  if (explicitYear) {
    return {
      start: `${explicitYear}-01-01`,
      end: `${explicitYear}-12-31`,
    };
  }

  const periodType = params.get('periodType');
  if (!periodType || periodType === 'all') {
    return { start: null, end: null };
  }

  const year = parseIntParam(params.get('periodYear'));
  if (periodType === 'year' && year) {
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
  }

  if (periodType === 'quarter' && year) {
    const quarter = parseIntParam(params.get('periodQuarter'));
    if (quarter && quarter >= 1 && quarter <= 4) {
      const startMonth = (quarter - 1) * 3 + 1;
      const endMonth = quarter * 3;
      const lastDay = new Date(year, endMonth, 0).getDate();
      return {
        start: buildMonthDate(year, startMonth, 1),
        end: buildMonthDate(year, endMonth, lastDay),
      };
    }
  }

  if (periodType === 'month' && year) {
    const month = parseIntParam(params.get('periodMonth'));
    if (month && month >= 1 && month <= 12) {
      const lastDay = new Date(year, month, 0).getDate();
      return {
        start: buildMonthDate(year, month, 1),
        end: buildMonthDate(year, month, lastDay),
      };
    }
  }

  if (periodType === 'custom') {
    const start = params.get('periodFrom');
    const end = params.get('periodTo');
    if (start || end) {
      return {
        start: start ?? null,
        end: end ?? null,
      };
    }
  }

  return { start: null, end: null };
}

export function parseTransactionPageFilters(params: SearchParamsLike): TransactionPageFilters {
  return {
    search: parseTrimmedParam(params.get('search')) ?? '',
    movementType: parseMovementType(params.get('movementType')),
    contactId: parseTrimmedParam(params.get('contactId')),
    categoryId: parseTrimmedParam(params.get('categoryId')),
    source: parseSourceFilter(params.get('source')),
    bankAccountId: parseTrimmedParam(params.get('bankAccountId')),
  };
}

export function hasServerSideTransactionFilters(filters: TransactionPageFilters): boolean {
  return Boolean(
    filters.search ||
    filters.movementType ||
    filters.contactId ||
    filters.categoryId ||
    filters.source ||
    filters.bankAccountId
  );
}

export function isArchivedTransaction(tx: Pick<Transaction, 'archivedAt'>): boolean {
  return tx.archivedAt != null && tx.archivedAt !== '';
}

export function matchesTransactionPageFilters(
  tx: Transaction,
  filters: TransactionPageFilters,
  context: TransactionSearchContext = {}
): boolean {
  if (filters.movementType === 'income' && tx.amount <= 0) return false;
  if (filters.movementType === 'expense' && tx.amount >= 0) return false;
  if (filters.contactId && tx.contactId !== filters.contactId) return false;
  if (filters.categoryId && tx.category !== filters.categoryId) return false;

  if (filters.source) {
    if (filters.source === 'null') {
      if (tx.source) return false;
    } else if (tx.source !== filters.source) {
      return false;
    }
  }

  if (filters.bankAccountId && tx.bankAccountId !== filters.bankAccountId) {
    return false;
  }

  if (!filters.search) return true;

  const query = normalizeSearchTerm(filters.search);
  if (!query) return true;

  const normalizedDigits = normalizeSearchDigits(query);
  const amountAsDigits = normalizeSearchDigits(String(Math.abs(tx.amount)));
  const amountAsFormattedDigits = normalizeSearchDigits(formatCurrencyEU(tx.amount));
  const contactName = tx.contactId ? context.contactNamesById?.[tx.contactId] ?? '' : '';
  const projectName = tx.projectId ? context.projectNamesById?.[tx.projectId] ?? '' : '';
  const categoryLabel = tx.category
    ? context.categoryLabelsById?.[tx.category] ?? tx.category
    : '';

  const searchableFields = [
    tx.description,
    tx.note,
    contactName,
    projectName,
    categoryLabel,
    formatCurrencyEU(tx.amount),
  ]
    .filter(Boolean)
    .map((value) => normalizeSearchTerm(String(value)));

  if (searchableFields.some((value) => value.includes(query))) {
    return true;
  }

  return Boolean(normalizedDigits) && (
    amountAsDigits.includes(normalizedDigits) ||
    amountAsFormattedDigits.includes(normalizedDigits)
  );
}

export function isDashboardLedgerTransaction(
  tx: Pick<Transaction, 'archivedAt' | 'amount' | 'isRemittance' | 'isRemittanceItem' | 'parentTransactionId' | 'source' | 'transactionType'>
): boolean {
  if (tx.parentTransactionId) return false;
  if (!isVisibleInMovementsLedger(tx, { showArchived: false })) return false;
  if (tx.transactionType === 'donation') return false;
  if (tx.transactionType === 'fee') return false;
  return true;
}

export function buildDashboardSummary(
  transactions: Array<
    Pick<Transaction, 'archivedAt' | 'amount' | 'category' | 'isRemittance' | 'isRemittanceItem' | 'parentTransactionId' | 'source' | 'transactionType'>
  >,
  missionTransferCategoryId: string | null
): DashboardSummary {
  const summary = {
    income: 0,
    expense: 0,
    missionTransfers: 0,
    balance: 0,
    count: 0,
  };

  for (const tx of transactions) {
    if (!isDashboardLedgerTransaction(tx)) continue;
    summary.count += 1;
    if (tx.amount > 0) {
      summary.income += tx.amount;
      continue;
    }
    if (missionTransferCategoryId && tx.category === missionTransferCategoryId) {
      summary.missionTransfers += tx.amount;
      continue;
    }
    summary.expense += tx.amount;
  }

  summary.balance = summary.income + summary.expense + summary.missionTransfers;
  return summary;
}

export function encodeTransactionPageCursor(cursor: TransactionPageCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeTransactionPageCursor(value: string | null): TransactionPageCursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (!parsed || typeof parsed.id !== 'string' || !parsed.id.trim()) {
      return null;
    }
    return { id: parsed.id };
  } catch {
    return null;
  }
}
