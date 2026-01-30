/**
 * Health Check P0: Utilitats per detectar problemes d'integritat de dades.
 *
 * Blocs implementats:
 * A) Categories legacy/desconegudes
 * B) Dates: barreja de formats
 * C) Origen bancari coherent
 * D) ArchivedAt on no toca
 * E) Signs per tipus
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

// =============================================================================
// BLOC B: Dates - barreja de formats
// =============================================================================

export type DateFormat = 'YYYY-MM-DD' | 'ISO_WITH_T' | 'INVALID';

/**
 * Classifica el format d'una data string
 */
export function classifyDateFormat(dateStr: string | null | undefined): DateFormat {
  if (!dateStr) return 'INVALID';

  // YYYY-MM-DD (format canònic)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return 'YYYY-MM-DD';
  }

  // ISO amb T (ex: 2024-01-15T10:30:00.000Z)
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) {
    return 'ISO_WITH_T';
  }

  return 'INVALID';
}

export interface DateFormatIssue {
  id: string;
  date: string;
  format: DateFormat;
  amount: number;
  description?: string;
}

export interface DateFormatCheckResult {
  hasIssues: boolean;
  invalidCount: number;
  hasMixedFormats: boolean;
  formatCounts: Record<DateFormat, number>;
  examples: DateFormatIssue[];
}

/**
 * Detecta problemes amb el format de dates
 */
export function checkDateFormats<T extends { id: string; date: string; amount: number; description?: string }>(
  transactions: T[]
): DateFormatCheckResult {
  const formatCounts: Record<DateFormat, number> = {
    'YYYY-MM-DD': 0,
    'ISO_WITH_T': 0,
    'INVALID': 0,
  };

  const issues: DateFormatIssue[] = [];

  for (const tx of transactions) {
    const format = classifyDateFormat(tx.date);
    formatCounts[format]++;

    // Només guardem exemples d'INVALID o ISO_WITH_T (formats no canònics)
    if (format !== 'YYYY-MM-DD' && issues.length < 5) {
      issues.push({
        id: tx.id,
        date: tx.date,
        format,
        amount: tx.amount,
        description: tx.description,
      });
    }
  }

  // Hi ha barreja si més d'un format té comptador > 0
  const formatsPresent = Object.values(formatCounts).filter(c => c > 0).length;
  const hasMixedFormats = formatsPresent > 1;

  return {
    hasIssues: formatCounts['INVALID'] > 0 || hasMixedFormats,
    invalidCount: formatCounts['INVALID'],
    hasMixedFormats,
    formatCounts,
    examples: issues,
  };
}

// =============================================================================
// BLOC C: Origen bancari coherent
// =============================================================================

export interface BankSourceIssue {
  id: string;
  date: string;
  amount: number;
  source: string | null | undefined;
  bankAccountId: string | null | undefined;
  issue: 'source_bank_no_bankAccountId' | 'bankAccountId_source_not_bank';
  description?: string;
}

export interface BankSourceCheckResult {
  hasIssues: boolean;
  count: number;
  examples: BankSourceIssue[];
}

/**
 * Detecta incoherències entre source i bankAccountId
 */
export function checkBankSourceCoherence<T extends {
  id: string;
  date: string;
  amount: number;
  source?: string | null;
  bankAccountId?: string | null;
  description?: string;
}>(
  transactions: T[]
): BankSourceCheckResult {
  const issues: BankSourceIssue[] = [];

  for (const tx of transactions) {
    // source === "bank" però no té bankAccountId
    if (tx.source === 'bank' && !tx.bankAccountId) {
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          source: tx.source,
          bankAccountId: tx.bankAccountId,
          issue: 'source_bank_no_bankAccountId',
          description: tx.description,
        });
      }
    }
    // Té bankAccountId però source !== "bank"
    else if (tx.bankAccountId && tx.source !== 'bank') {
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          source: tx.source,
          bankAccountId: tx.bankAccountId,
          issue: 'bankAccountId_source_not_bank',
          description: tx.description,
        });
      }
    }
  }

  return {
    hasIssues: issues.length > 0,
    count: issues.length,
    examples: issues.slice(0, 5),
  };
}

// =============================================================================
// BLOC D: ArchivedAt on no toca
// =============================================================================

export interface ArchivedIssue {
  id: string;
  date: string;
  amount: number;
  archivedAt: unknown;
  description?: string;
}

export interface ArchivedCheckResult {
  hasIssues: boolean;
  count: number;
  examples: ArchivedIssue[];
}

/**
 * Detecta transaccions amb archivedAt != null en el conjunt "normal"
 * (Això indica que la query no està filtrant correctament els arxivats)
 */
export function checkArchivedTransactions<T extends {
  id: string;
  date: string;
  amount: number;
  archivedAt?: unknown;
  description?: string;
}>(
  transactions: T[]
): ArchivedCheckResult {
  const issues: ArchivedIssue[] = [];

  for (const tx of transactions) {
    if (tx.archivedAt != null) {
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          archivedAt: tx.archivedAt,
          description: tx.description,
        });
      }
    }
  }

  return {
    hasIssues: issues.length > 0,
    count: issues.length,
    examples: issues.slice(0, 5),
  };
}

// =============================================================================
// BLOC E: Signs per tipus (transactionType)
// =============================================================================

// Tipus que requereixen amount > 0
const POSITIVE_AMOUNT_TYPES = new Set(['donation', 'membership', 'remittance_in']);
// Tipus que requereixen amount < 0
const NEGATIVE_AMOUNT_TYPES = new Set(['fee', 'commission', 'expense', 'return', 'return_fee']);

export interface SignIssue {
  id: string;
  date: string;
  amount: number;
  transactionType: string;
  expectedSign: 'positive' | 'negative';
  description?: string;
}

export interface SignCheckResult {
  hasIssues: boolean;
  count: number;
  examples: SignIssue[];
}

/**
 * Detecta incoherències entre transactionType i el signe de l'amount
 */
export function checkSignCoherence<T extends {
  id: string;
  date: string;
  amount: number;
  transactionType?: string | null;
  description?: string;
}>(
  transactions: T[]
): SignCheckResult {
  const issues: SignIssue[] = [];
  let totalIssues = 0;

  for (const tx of transactions) {
    // Si no té transactionType o és "normal", no validem
    if (!tx.transactionType || tx.transactionType === 'normal') {
      continue;
    }

    const type = tx.transactionType;

    // Tipus que requereixen amount > 0
    if (POSITIVE_AMOUNT_TYPES.has(type) && tx.amount <= 0) {
      totalIssues++;
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          transactionType: type,
          expectedSign: 'positive',
          description: tx.description,
        });
      }
    }
    // Tipus que requereixen amount < 0
    else if (NEGATIVE_AMOUNT_TYPES.has(type) && tx.amount >= 0) {
      totalIssues++;
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          transactionType: type,
          expectedSign: 'negative',
          description: tx.description,
        });
      }
    }
  }

  return {
    hasIssues: totalIssues > 0,
    count: totalIssues,
    examples: issues,
  };
}

// =============================================================================
// HEALTH CHECK COMPLET
// =============================================================================

export interface HealthCheckResult {
  categories: {
    hasIssues: boolean;
    count: number;
    examples: LegacyCategoryTransaction[];
  };
  dates: DateFormatCheckResult;
  bankSource: BankSourceCheckResult;
  archived: ArchivedCheckResult;
  signs: SignCheckResult;
  totalIssues: number;
}

/**
 * Executa tots els checks d'integritat de dades
 */
export function runHealthCheck<T extends {
  id: string;
  date: string;
  amount: number;
  category?: string | null;
  source?: string | null;
  bankAccountId?: string | null;
  archivedAt?: unknown;
  transactionType?: string | null;
  description?: string;
}>(
  transactions: T[]
): HealthCheckResult {
  // A) Categories legacy
  const legacyCategories = detectLegacyCategoryTransactions(
    transactions.filter(tx => tx.category != null) as Array<T & { category: string | null }>
  );

  // B) Dates
  const dates = checkDateFormats(transactions);

  // C) Bank source
  const bankSource = checkBankSourceCoherence(transactions);

  // D) Archived
  const archived = checkArchivedTransactions(transactions);

  // E) Signs
  const signs = checkSignCoherence(transactions);

  const totalIssues =
    legacyCategories.length +
    dates.invalidCount +
    (dates.hasMixedFormats ? 1 : 0) +
    bankSource.count +
    archived.count +
    signs.count;

  return {
    categories: {
      hasIssues: legacyCategories.length > 0,
      count: legacyCategories.length,
      examples: legacyCategories.slice(0, 5),
    },
    dates,
    bankSource,
    archived,
    signs,
    totalIssues,
  };
}
