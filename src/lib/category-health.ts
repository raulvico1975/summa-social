/**
 * Health Check P0: Utilitats per detectar problemes d'integritat de dades.
 *
 * Blocs implementats:
 * A) Categories legacy/desconegudes
 * B) Dates: barreja de formats
 * C) Origen bancari coherent
 * D) ArchivedAt on no toca
 * E) Signs per tipus
 * F) Categories òrfenes
 * G) Projects/Eixos orfes
 * H) Comptes bancaris orfes
 * I) Contactes orfes
 * J) Tiquets orfes (pendingDocuments amb reportId inexistent)
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
    // source === "bank" o "stripe" però no té bankAccountId → ERROR P0
    if ((tx.source === 'bank' || tx.source === 'stripe') && !tx.bankAccountId) {
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
    // Té bankAccountId però source no és bank/stripe/remittance
    // (remittance hereta bankAccountId del pare, és vàlid)
    else if (tx.bankAccountId && tx.source !== 'bank' && tx.source !== 'stripe' && tx.source !== 'remittance') {
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
// BLOC F: Categories òrfenes (referència a entitat eliminada/inexistent)
// v1.35 - Només detecta si el DOCUMENT no existeix (arxivat NO és orfe)
// =============================================================================

export interface OrphanCategoryIssue {
  id: string;
  date: string;
  amount: number;
  category: string;
  description?: string;
}

export interface OrphanCategoryCheckResult {
  hasIssues: boolean;
  count: number;
  examples: OrphanCategoryIssue[];
}

/**
 * Detecta transaccions amb category que no existeix a la llista de categories vàlides
 * (ni predefinides ni customs de l'org, incloent arxivades)
 *
 * IMPORTANT: Una categoria arxivada NO és òrfena (el doc existeix).
 * validCategoryIds ha d'incloure TOTS els IDs (actius + arxivats).
 */
export function checkOrphanCategories<T extends {
  id: string;
  date: string;
  amount: number;
  category?: string | null;
  description?: string;
}>(
  transactions: T[],
  validCategoryIds: Set<string>
): OrphanCategoryCheckResult {
  const issues: OrphanCategoryIssue[] = [];
  let totalIssues = 0;

  for (const tx of transactions) {
    // Ignorar si no té categoria assignada
    if (!tx.category) continue;

    // Ignorar si és un nameKey conegut (categoria predefinida)
    if (KNOWN_CATEGORY_KEYS.has(tx.category)) continue;

    // Si no és ni nameKey ni ID vàlid de l'org -> orfe
    if (!validCategoryIds.has(tx.category)) {
      totalIssues++;
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          category: tx.category,
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
// BLOC G: Projects/Eixos òrfans (referència a entitat eliminada/inexistent)
// v1.35 - Només detecta si el DOCUMENT no existeix (arxivat NO és orfe)
// =============================================================================

export interface OrphanProjectIssue {
  id: string;
  date: string;
  amount: number;
  projectId: string;
  description?: string;
}

export interface OrphanProjectCheckResult {
  hasIssues: boolean;
  count: number;
  examples: OrphanProjectIssue[];
}

/**
 * Detecta transaccions amb projectId que no existeix a la llista de projects vàlids
 * (incloent arxivats)
 *
 * IMPORTANT: Un project arxivat NO és orfe (el doc existeix).
 * validProjectIds ha d'incloure TOTS els IDs (actius + arxivats).
 */
export function checkOrphanProjects<T extends {
  id: string;
  date: string;
  amount: number;
  projectId?: string | null;
  description?: string;
}>(
  transactions: T[],
  validProjectIds: Set<string>
): OrphanProjectCheckResult {
  const issues: OrphanProjectIssue[] = [];
  let totalIssues = 0;

  for (const tx of transactions) {
    // Ignorar si no té projectId assignat
    if (!tx.projectId) continue;

    // Si el projectId no existeix a la llista vàlida -> orfe
    if (!validProjectIds.has(tx.projectId)) {
      totalIssues++;
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          projectId: tx.projectId,
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
// BLOC H: Comptes bancaris orfes (referència a compte inexistent)
// v1.36 - Detecta transaccions amb bankAccountId que no existeix
// =============================================================================

export interface OrphanBankAccountIssue {
  id: string;
  date: string;
  amount: number;
  bankAccountId: string;
  description?: string;
}

export interface OrphanBankAccountCheckResult {
  hasIssues: boolean;
  count: number;
  examples: OrphanBankAccountIssue[];
}

/**
 * Detecta transaccions amb bankAccountId que no existeix a la llista de comptes vàlids
 * (incloent arxivats/inactius)
 *
 * IMPORTANT: Un compte arxivat NO és orfe (el doc existeix).
 * validBankAccountIds ha d'incloure TOTS els IDs (actius + arxivats).
 */
export function checkOrphanBankAccounts<T extends {
  id: string;
  date: string;
  amount: number;
  bankAccountId?: string | null;
  description?: string;
}>(
  transactions: T[],
  validBankAccountIds: Set<string>
): OrphanBankAccountCheckResult {
  const issues: OrphanBankAccountIssue[] = [];
  let totalIssues = 0;

  for (const tx of transactions) {
    // Ignorar si no té bankAccountId assignat
    if (!tx.bankAccountId) continue;

    // Si el bankAccountId no existeix a la llista vàlida -> orfe
    if (!validBankAccountIds.has(tx.bankAccountId)) {
      totalIssues++;
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          bankAccountId: tx.bankAccountId,
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
// BLOC I: Contactes orfes (referència a contacte inexistent)
// v1.36 - Detecta transaccions amb contactId que no existeix
// =============================================================================

export interface OrphanContactIssue {
  id: string;
  date: string;
  amount: number;
  contactId: string;
  description?: string;
}

export interface OrphanContactCheckResult {
  hasIssues: boolean;
  count: number;
  examples: OrphanContactIssue[];
}

/**
 * Detecta transaccions amb contactId que no existeix a la llista de contactes vàlids
 * (incloent arxivats)
 *
 * IMPORTANT: Un contacte arxivat NO és orfe (el doc existeix).
 * validContactIds ha d'incloure TOTS els IDs (actius + arxivats).
 */
export function checkOrphanContacts<T extends {
  id: string;
  date: string;
  amount: number;
  contactId?: string | null;
  description?: string;
}>(
  transactions: T[],
  validContactIds: Set<string>
): OrphanContactCheckResult {
  const issues: OrphanContactIssue[] = [];
  let totalIssues = 0;

  for (const tx of transactions) {
    // Ignorar si no té contactId assignat
    if (!tx.contactId) continue;

    // Si el contactId no existeix a la llista vàlida -> orfe
    if (!validContactIds.has(tx.contactId)) {
      totalIssues++;
      if (issues.length < 5) {
        issues.push({
          id: tx.id,
          date: tx.date,
          amount: tx.amount,
          contactId: tx.contactId,
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
// BLOC J: Tiquets orfes (pendingDocuments amb reportId inexistent)
// v1.36 - Detecta tiquets assignats a liquidacions que ja no existeixen
// =============================================================================

export interface OrphanTicketIssue {
  id: string;
  date: string;
  amount: number;
  reportId: string;
  filename?: string;
}

export interface OrphanTicketCheckResult {
  hasIssues: boolean;
  count: number;
  examples: OrphanTicketIssue[];
}

/**
 * Detecta tiquets (pendingDocuments) amb reportId que no existeix a la llista de liquidacions
 *
 * IMPORTANT: Una liquidació arxivada NO fa que els seus tiquets siguin orfes (el doc existeix).
 * validReportIds ha d'incloure TOTS els IDs (actius + arxivats).
 */
export function checkOrphanTickets<T extends {
  id: string;
  invoiceDate?: string | null;
  amount?: number | null;
  reportId?: string | null;
  file?: { filename?: string } | null;
}>(
  tickets: T[],
  validReportIds: Set<string>
): OrphanTicketCheckResult {
  const issues: OrphanTicketIssue[] = [];
  let totalIssues = 0;

  for (const ticket of tickets) {
    // Ignorar si no té reportId assignat
    if (!ticket.reportId) continue;

    // Si el reportId no existeix a la llista vàlida -> orfe
    if (!validReportIds.has(ticket.reportId)) {
      totalIssues++;
      if (issues.length < 5) {
        issues.push({
          id: ticket.id,
          date: ticket.invoiceDate || 'N/A',
          amount: ticket.amount || 0,
          reportId: ticket.reportId,
          filename: ticket.file?.filename,
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
  // v1.35: Nous blocs d'orfes
  orphanCategories: OrphanCategoryCheckResult;
  orphanProjects: OrphanProjectCheckResult;
  // v1.36: Comptes bancaris i contactes orfes
  orphanBankAccounts: OrphanBankAccountCheckResult;
  orphanContacts: OrphanContactCheckResult;
  totalIssues: number;
}

// Nota: checkOrphanTickets s'exporta per separat perquè opera sobre pendingDocuments,
// no sobre transactions. La UI de Health Check pot cridar-lo independentment.

/**
 * Executa tots els checks d'integritat de dades
 *
 * @param transactions - Array de transaccions a validar
 * @param validCategoryIds - Set d'IDs de categories vàlides (actives + arxivades)
 *                           Si no es proporciona, el check d'orfes categories es salta
 * @param validProjectIds - Set d'IDs de projects vàlids (actius + arxivats)
 *                          Si no es proporciona, el check d'orfes projects es salta
 * @param validBankAccountIds - Set d'IDs de comptes bancaris vàlids (actius + arxivats)
 *                              Si no es proporciona, el check d'orfes bankAccounts es salta
 * @param validContactIds - Set d'IDs de contactes vàlids (actius + arxivats)
 *                          Si no es proporciona, el check d'orfes contacts es salta
 */
export function runHealthCheck<T extends {
  id: string;
  date: string;
  amount: number;
  category?: string | null;
  projectId?: string | null;
  contactId?: string | null;
  source?: string | null;
  bankAccountId?: string | null;
  archivedAt?: unknown;
  transactionType?: string | null;
  description?: string;
}>(
  transactions: T[],
  validCategoryIds?: Set<string>,
  validProjectIds?: Set<string>,
  validBankAccountIds?: Set<string>,
  validContactIds?: Set<string>
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

  // F) Orphan categories (v1.35)
  const orphanCategories = validCategoryIds
    ? checkOrphanCategories(transactions, validCategoryIds)
    : { hasIssues: false, count: 0, examples: [] };

  // G) Orphan projects (v1.35)
  const orphanProjects = validProjectIds
    ? checkOrphanProjects(transactions, validProjectIds)
    : { hasIssues: false, count: 0, examples: [] };

  // H) Orphan bank accounts (v1.36)
  const orphanBankAccounts = validBankAccountIds
    ? checkOrphanBankAccounts(transactions, validBankAccountIds)
    : { hasIssues: false, count: 0, examples: [] };

  // I) Orphan contacts (v1.36)
  const orphanContacts = validContactIds
    ? checkOrphanContacts(transactions, validContactIds)
    : { hasIssues: false, count: 0, examples: [] };

  const totalIssues =
    legacyCategories.length +
    dates.invalidCount +
    (dates.hasMixedFormats ? 1 : 0) +
    bankSource.count +
    archived.count +
    signs.count +
    orphanCategories.count +
    orphanProjects.count +
    orphanBankAccounts.count +
    orphanContacts.count;

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
    orphanCategories,
    orphanProjects,
    orphanBankAccounts,
    orphanContacts,
    totalIssues,
  };
}
