import type { ComputedCheck } from "./types";

export interface HealthTx {
  id: string;
  date: string;
  amount: number;
  description?: string;
  category?: string | null;
  projectId?: string | null;
  contactId?: string | null;
  source?: string | null;
  bankAccountId?: string | null;
  archivedAt?: unknown;
  transactionType?: string | null;
  parentTransactionId?: string | null;
  isRemittanceItem?: boolean;
  isSplit?: boolean;
}

export interface PendingDocument {
  id: string;
  invoiceDate?: string | null;
  amount?: number | null;
  reportId?: string | null;
  file?: { filename?: string } | null;
}

export interface IntegrityChecksInput {
  transactions: HealthTx[];
  validTransactionIds: Set<string>;
  validCategoryIds: Set<string>;
  validProjectIds: Set<string>;
  validBankAccountIds: Set<string>;
  validContactIds: Set<string>;
  tickets: PendingDocument[];
  validReportIds: Set<string>;
}

export interface IntegrityChecksResult {
  A: ComputedCheck;
  B: ComputedCheck;
  C: ComputedCheck;
  D: ComputedCheck;
  E: ComputedCheck;
  F: ComputedCheck;
  G: ComputedCheck;
  H: ComputedCheck;
  I: ComputedCheck;
  J: ComputedCheck;
  K: ComputedCheck;
}

type DateFormat = "YYYY-MM-DD" | "ISO_WITH_T" | "INVALID";

const LEGACY_CATEGORY_KEYS = new Set<string>([
  "donations",
  "subsidies",
  "memberFees",
  "sponsorships",
  "productSales",
  "inheritances",
  "events",
  "otherIncome",
  "rent",
  "officeSupplies",
  "utilities",
  "salaries",
  "travel",
  "marketing",
  "professionalServices",
  "insurance",
  "projectMaterials",
  "training",
  "bankFees",
  "missionTransfers",
  "otherExpenses",
  "Revisar",
]);

const POSITIVE_AMOUNT_TYPES = new Set(["donation", "membership", "remittance_in"]);
const NEGATIVE_AMOUNT_TYPES = new Set(["fee", "commission", "expense", "return", "return_fee"]);
const SAMPLE_IDS_LIMIT = 10;

function classifyDateFormat(dateStr: string | null | undefined): DateFormat {
  if (!dateStr) return "INVALID";
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "YYYY-MM-DD";
  if (/^\d{4}-\d{2}-\d{2}T/.test(dateStr)) return "ISO_WITH_T";
  return "INVALID";
}

function pushIssue(
  examples: Array<Record<string, unknown>>,
  issue: Record<string, unknown>,
  maxExamples = 5
): void {
  if (examples.length < maxExamples) {
    examples.push(issue);
  }
}

function pushSampleId(sampleIds: string[], id: string | null | undefined): void {
  if (!id) return;
  if (sampleIds.length >= SAMPLE_IDS_LIMIT) return;
  if (sampleIds.includes(id)) return;
  sampleIds.push(id);
}

export function runIntegrityChecks(input: IntegrityChecksInput): IntegrityChecksResult {
  const {
    transactions,
    validTransactionIds,
    validCategoryIds,
    validProjectIds,
    validBankAccountIds,
    validContactIds,
    tickets,
    validReportIds,
  } = input;

  // A) Categories legacy/desconegudes
  let countA = 0;
  const examplesA: Array<Record<string, unknown>> = [];
  const sampleIdsA: string[] = [];
  for (const tx of transactions) {
    if (tx.category && LEGACY_CATEGORY_KEYS.has(tx.category)) {
      countA++;
      pushSampleId(sampleIdsA, tx.id);
      pushIssue(examplesA, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        category: tx.category,
        description: tx.description,
      });
    }
  }

  // B) Dates mal formades / mixtes
  const formatCounts: Record<DateFormat, number> = {
    "YYYY-MM-DD": 0,
    "ISO_WITH_T": 0,
    INVALID: 0,
  };
  let invalidDateCount = 0;
  const examplesB: Array<Record<string, unknown>> = [];
  const sampleIdsB: string[] = [];
  for (const tx of transactions) {
    const format = classifyDateFormat(tx.date);
    formatCounts[format]++;
    if (format === "INVALID") invalidDateCount++;
    if (format !== "YYYY-MM-DD") {
      pushSampleId(sampleIdsB, tx.id);
      pushIssue(examplesB, {
        id: tx.id,
        date: tx.date,
        format,
        amount: tx.amount,
      });
    }
  }
  const formatsPresent = Object.values(formatCounts).filter((v) => v > 0).length;
  const hasMixedFormats = formatsPresent > 1;
  const countB = invalidDateCount + (hasMixedFormats ? 1 : 0);

  // C) Coherència source ↔ bankAccountId
  let countC = 0;
  const examplesC: Array<Record<string, unknown>> = [];
  const sampleIdsC: string[] = [];
  for (const tx of transactions) {
    const missingAccount = (tx.source === "bank" || tx.source === "stripe") && !tx.bankAccountId;
    const wrongSource = !!tx.bankAccountId && tx.source !== "bank" && tx.source !== "stripe" && tx.source !== "remittance";
    if (missingAccount || wrongSource) {
      countC++;
      pushSampleId(sampleIdsC, tx.id);
      pushIssue(examplesC, {
        id: tx.id,
        date: tx.date,
        source: tx.source ?? null,
        bankAccountId: tx.bankAccountId ?? null,
        issue: missingAccount ? "source_bank_no_bankAccountId" : "bankAccountId_source_not_bank",
      });
    }
  }

  // D) Archived colat al dataset operatiu
  let countD = 0;
  const examplesD: Array<Record<string, unknown>> = [];
  const sampleIdsD: string[] = [];
  for (const tx of transactions) {
    if (tx.archivedAt != null) {
      countD++;
      pushSampleId(sampleIdsD, tx.id);
      pushIssue(examplesD, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        archivedAt: tx.archivedAt,
      });
    }
  }

  // E) Signes incoherents
  let countE = 0;
  const examplesE: Array<Record<string, unknown>> = [];
  const sampleIdsE: string[] = [];
  for (const tx of transactions) {
    const type = tx.transactionType;
    if (!type || type === "normal") continue;

    if (POSITIVE_AMOUNT_TYPES.has(type) && tx.amount <= 0) {
      countE++;
      pushSampleId(sampleIdsE, tx.id);
      pushIssue(examplesE, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        transactionType: type,
        expectedSign: "positive",
      });
      continue;
    }

    if (NEGATIVE_AMOUNT_TYPES.has(type) && tx.amount >= 0) {
      countE++;
      pushSampleId(sampleIdsE, tx.id);
      pushIssue(examplesE, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        transactionType: type,
        expectedSign: "negative",
      });
    }
  }

  // F) Categories inexistents
  let countF = 0;
  const examplesF: Array<Record<string, unknown>> = [];
  const sampleIdsF: string[] = [];
  for (const tx of transactions) {
    if (!tx.category) continue;
    if (LEGACY_CATEGORY_KEYS.has(tx.category)) continue;
    if (!validCategoryIds.has(tx.category)) {
      countF++;
      pushSampleId(sampleIdsF, tx.id);
      pushIssue(examplesF, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        category: tx.category,
      });
    }
  }

  // G) Projectes inexistents
  let countG = 0;
  const examplesG: Array<Record<string, unknown>> = [];
  const sampleIdsG: string[] = [];
  for (const tx of transactions) {
    if (!tx.projectId) continue;
    if (!validProjectIds.has(tx.projectId)) {
      countG++;
      pushSampleId(sampleIdsG, tx.id);
      pushIssue(examplesG, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        projectId: tx.projectId,
      });
    }
  }

  // H) Comptes bancaris inexistents
  let countH = 0;
  const examplesH: Array<Record<string, unknown>> = [];
  const sampleIdsH: string[] = [];
  for (const tx of transactions) {
    if (!tx.bankAccountId) continue;
    if (!validBankAccountIds.has(tx.bankAccountId)) {
      countH++;
      pushSampleId(sampleIdsH, tx.id);
      pushIssue(examplesH, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        bankAccountId: tx.bankAccountId,
      });
    }
  }

  // I) Contactes inexistents
  let countI = 0;
  const examplesI: Array<Record<string, unknown>> = [];
  const sampleIdsI: string[] = [];
  for (const tx of transactions) {
    if (!tx.contactId) continue;
    if (!validContactIds.has(tx.contactId)) {
      countI++;
      pushSampleId(sampleIdsI, tx.id);
      pushIssue(examplesI, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        contactId: tx.contactId,
      });
    }
  }

  // J) Tiquets orfes
  let countJ = 0;
  const examplesJ: Array<Record<string, unknown>> = [];
  const sampleIdsJ: string[] = [];
  for (const ticket of tickets) {
    if (!ticket.reportId) continue;
    if (!validReportIds.has(ticket.reportId)) {
      countJ++;
      pushSampleId(sampleIdsJ, ticket.id);
      pushIssue(examplesJ, {
        id: ticket.id,
        date: ticket.invoiceDate ?? "N/A",
        amount: ticket.amount ?? 0,
        reportId: ticket.reportId,
        filename: ticket.file?.filename ?? null,
      });
    }
  }

  // K) Remeses òrfenes
  let countK = 0;
  const examplesK: Array<Record<string, unknown>> = [];
  const sampleIdsK: string[] = [];
  for (const tx of transactions) {
    if (!tx.isRemittanceItem) continue;

    if (!tx.parentTransactionId) {
      countK++;
      pushSampleId(sampleIdsK, tx.id);
      pushIssue(examplesK, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        parentTransactionId: "(buit)",
      });
      continue;
    }

    if (!validTransactionIds.has(tx.parentTransactionId)) {
      countK++;
      pushSampleId(sampleIdsK, tx.id);
      pushIssue(examplesK, {
        id: tx.id,
        date: tx.date,
        amount: tx.amount,
        parentTransactionId: tx.parentTransactionId,
      });
    }
  }

  return {
    A: { count: countA, sampleIds: sampleIdsA, examples: examplesA },
    B: {
      count: countB,
      sampleIds: sampleIdsB,
      examples: examplesB,
      details: {
        invalidCount: invalidDateCount,
        hasMixedFormats,
        formatCounts,
      },
    },
    C: { count: countC, sampleIds: sampleIdsC, examples: examplesC },
    D: { count: countD, sampleIds: sampleIdsD, examples: examplesD },
    E: { count: countE, sampleIds: sampleIdsE, examples: examplesE },
    F: { count: countF, sampleIds: sampleIdsF, examples: examplesF },
    G: { count: countG, sampleIds: sampleIdsG, examples: examplesG },
    H: { count: countH, sampleIds: sampleIdsH, examples: examplesH },
    I: { count: countI, sampleIds: sampleIdsI, examples: examplesI },
    J: { count: countJ, sampleIds: sampleIdsJ, examples: examplesJ },
    K: { count: countK, sampleIds: sampleIdsK, examples: examplesK },
  };
}
