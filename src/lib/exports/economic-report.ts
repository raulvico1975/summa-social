import type { Transaction, Category, Project, Contact } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';
import { MISSION_TRANSFER_CATEGORY_KEY } from '@/lib/constants';

export interface AggregateRow {
  id: string;
  name: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface AggregateResult {
  aggregated: AggregateRow[];
  complete: AggregateRow[];
  total: number;
}

export interface EconomicReportLabels {
  uncategorized: string;
  generalProject: string;
  generalProjectDescriptor: string;
  noCounterpart: string;
  others: string;
}

export interface EconomicNarrativeTexts {
  summary: {
    noMovements: (params: { period: string }) => string;
    general: (params: { period: string; income: string; expenses: string; balance: string }) => string;
  };
  income: {
    noData: string;
    primary: (params: { source: string; percentage: string }) => string;
    fallbackPrimary: (params: { percentage: string }) => string;
    secondary: (params: { source: string; percentage: string }) => string;
    fallbackSecondary: (params: { percentage: string }) => string;
  };
  expenses: {
    noData: string;
    allGeneral: (params: { label: string }) => string;
    generalDescriptor: (params: { label: string; descriptor: string }) => string;
    primary: (params: { area: string; percentage: string }) => string;
    secondary: (params: { area: string; percentage: string }) => string;
    others: (params: { percentage: string }) => string;
  };
  transfers: {
    noData: string;
    primary: (params: { counterpart: string; percentage: string }) => string;
    fallbackPrimary: (params: { percentage: string }) => string;
    secondary: (params: { counterpart: string; percentage: string }) => string;
    fallbackSecondary: (params: { percentage: string }) => string;
    others: (params: { percentage: string }) => string;
  };
}

interface IncomeAggregationParams {
  transactions?: Transaction[] | null;
  categories?: (Category & { id: string })[] | null;
  topN?: number;
  labels: EconomicReportLabels;
}

interface ExpenseAggregationParams {
  transactions?: Transaction[] | null;
  projects?: (Project & { id: string })[] | null;
  topN?: number;
  missionKey: string;
  labels: EconomicReportLabels;
}

interface TransferAggregationParams {
  transactions?: Transaction[] | null;
  contacts?: (Contact & { id: string })[] | null;
  topN?: number;
  missionKey: string;
  labels: EconomicReportLabels;
}

const UNCATEGORIZED_ID = 'uncategorized';
const GENERAL_PROJECT_ID = 'general';
const NO_COUNTERPART_ID = 'no-counterpart';
const OTHERS_ID = 'others';

const DEFAULT_TOP_N = 3;

export function aggregateIncomeByCategory({
  transactions,
  categories,
  topN = DEFAULT_TOP_N,
  labels,
}: IncomeAggregationParams): AggregateResult {
  const categoryMap = new Map<string, Category & { id: string }>();
  categories?.forEach((category) => {
    categoryMap.set(category.id, category);
  });

  const rows = new Map<string, AggregateRow>();
  let total = 0;

  transactions?.forEach((tx) => {
    if (tx.amount <= 0) return;
    const category = tx.category ? categoryMap.get(tx.category) : undefined;
    const isValidCategory = category && category.type === 'income';
    const key = isValidCategory ? category!.id : UNCATEGORIZED_ID;
    const name = isValidCategory ? category!.name : labels.uncategorized;

    const amount = tx.amount;
    total += amount;

    if (!rows.has(key)) {
      rows.set(key, { id: key, name, amount: 0, percentage: 0, count: 0 });
    }
    const entry = rows.get(key)!;
    entry.amount += amount;
    entry.count += 1;
  });

  return finalizeAggregation(rows, total, topN, labels);
}

export function aggregateOperationalExpensesByProject({
  transactions,
  projects,
  topN = DEFAULT_TOP_N,
  missionKey = MISSION_TRANSFER_CATEGORY_KEY,
  labels,
}: ExpenseAggregationParams): AggregateResult {
  const projectMap = new Map<string, Project & { id: string }>();
  projects?.forEach((project) => {
    projectMap.set(project.id, project);
  });

  const rows = new Map<string, AggregateRow>();
  let total = 0;

  transactions?.forEach((tx) => {
    if (tx.amount >= 0) return;
    if (tx.category === missionKey) return;

    const project = tx.projectId ? projectMap.get(tx.projectId) : undefined;
    const key = project ? project.id : GENERAL_PROJECT_ID;
    const name = project ? project.name : labels.generalProject;

    const amount = Math.abs(tx.amount);
    total += amount;

    if (!rows.has(key)) {
      rows.set(key, { id: key, name, amount: 0, percentage: 0, count: 0 });
    }
    const entry = rows.get(key)!;
    entry.amount += amount;
    entry.count += 1;
  });

  return finalizeAggregation(rows, total, topN, labels);
}

export function aggregateMissionTransfersByContact({
  transactions,
  contacts,
  topN = DEFAULT_TOP_N,
  missionKey = MISSION_TRANSFER_CATEGORY_KEY,
  labels,
}: TransferAggregationParams): AggregateResult {
  const contactMap = new Map<string, Contact & { id: string }>();
  contacts?.forEach((contact) => {
    contactMap.set(contact.id, contact);
  });

  const rows = new Map<string, AggregateRow>();
  let total = 0;

  transactions?.forEach((tx) => {
    if (tx.category !== missionKey) return;
    const contact = tx.contactId ? contactMap.get(tx.contactId) : undefined;
    const key = contact ? contact.id : NO_COUNTERPART_ID;
    const name = contact ? contact.name : labels.noCounterpart;

    const amount = Math.abs(tx.amount);
    total += amount;

    if (!rows.has(key)) {
      rows.set(key, { id: key, name, amount: 0, percentage: 0, count: 0 });
    }
    const entry = rows.get(key)!;
    entry.amount += amount;
    entry.count += 1;
  });

  return finalizeAggregation(rows, total, topN, labels);
}

function finalizeAggregation(
  rows: Map<string, AggregateRow>,
  total: number,
  topN: number,
  labels: EconomicReportLabels,
): AggregateResult {
  const complete = Array.from(rows.values())
    .map((row) => ({
      ...row,
      percentage: total > 0 ? (row.amount / total) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const effectiveTopN = topN > 0 ? topN : complete.length;
  const topRows = complete.slice(0, effectiveTopN);

  let aggregated = [...topRows];
  if (complete.length > effectiveTopN) {
    const othersAmount = complete
      .slice(effectiveTopN)
      .reduce((sum, row) => sum + row.amount, 0);
    const othersCount = complete
      .slice(effectiveTopN)
      .reduce((sum, row) => sum + row.count, 0);
    aggregated = [
      ...topRows,
      {
        id: OTHERS_ID,
        name: labels.others,
        amount: othersAmount,
        count: othersCount,
        percentage: total > 0 ? (othersAmount / total) * 100 : 0,
      },
    ];
  }

  return { aggregated, complete, total };
}

export interface NarrativeDraft {
  summary: string;
  income: string;
  expenses: string;
  transfers: string;
}

interface NarrativeParams {
  periodLabel: string;
  income: AggregateResult;
  expenses: AggregateResult;
  transfers: AggregateResult;
  netBalance: number;
}

export function buildNarrativesFromAggregates({
  periodLabel,
  income,
  expenses,
  transfers,
  netBalance,
  texts,
  labels,
}: NarrativeParams & { texts: EconomicNarrativeTexts; labels: EconomicReportLabels }): NarrativeDraft {
  const summary = buildSummaryNarrative(periodLabel, income.total, expenses.total, netBalance, texts.summary);
  const incomeText = buildIncomeNarrative(income, texts.income);
  const expensesText = buildExpenseNarrative(expenses, texts.expenses, labels);
  const transfersText = buildTransfersNarrative(transfers, texts.transfers);

  return {
    summary,
    income: incomeText,
    expenses: expensesText,
    transfers: transfersText,
  };
}

function buildSummaryNarrative(
  periodLabel: string,
  incomeTotal: number,
  expenseTotal: number,
  netBalance: number,
  texts: EconomicNarrativeTexts['summary'],
): string {
  if (incomeTotal === 0 && expenseTotal === 0) {
    return texts.noMovements({ period: periodLabel });
  }
  return texts.general({
    period: periodLabel,
    income: formatCurrencyEU(incomeTotal),
    expenses: formatCurrencyEU(expenseTotal),
    balance: formatCurrencyEU(netBalance),
  });
}

function buildIncomeNarrative(income: AggregateResult, texts: EconomicNarrativeTexts['income']): string {
  if (income.total === 0) {
    return texts.noData;
  }

  const ordered = income.aggregated.filter((row) => row.id !== OTHERS_ID);
  const primary = ordered.find((row) => row.id !== UNCATEGORIZED_ID);
  const fallback = ordered.find((row) => row.id === UNCATEGORIZED_ID);
  const secondary = ordered.filter((row) => row !== primary && row.id !== UNCATEGORIZED_ID)[0];

  const parts: string[] = [];
  if (primary) {
    parts.push(texts.primary({ source: primary.name, percentage: formatPercentage(primary.percentage) }));
  } else if (fallback) {
    parts.push(texts.fallbackPrimary({ percentage: formatPercentage(fallback.percentage) }));
  }

  if (secondary) {
    parts.push(texts.secondary({ source: secondary.name, percentage: formatPercentage(secondary.percentage) }));
  } else if (fallback && primary) {
    parts.push(texts.fallbackSecondary({ percentage: formatPercentage(fallback.percentage) }));
  }

  return parts.join(' ');
}

function buildExpenseNarrative(
  expenses: AggregateResult,
  texts: EconomicNarrativeTexts['expenses'],
  labels: EconomicReportLabels,
): string {
  if (expenses.total === 0) {
    return texts.noData;
  }

  const ordered = expenses.aggregated.filter((row) => row.id !== OTHERS_ID);
  const primary = ordered[0];
  const secondary = ordered[1];
  const others = expenses.aggregated.find((row) => row.id === OTHERS_ID);

  if (primary && primary.id === GENERAL_PROJECT_ID && primary.percentage >= 99.5) {
    return texts.allGeneral({ label: labels.generalProject });
  }

  const parts: string[] = [];
  if (primary) {
    const area =
      primary.id === GENERAL_PROJECT_ID
        ? texts.generalDescriptor({ label: labels.generalProject, descriptor: labels.generalProjectDescriptor })
        : primary.name;
    parts.push(texts.primary({ area, percentage: formatPercentage(primary.percentage) }));
  }
  if (secondary) {
    parts.push(texts.secondary({ area: secondary.name, percentage: formatPercentage(secondary.percentage) }));
  }
  if (others && others.amount > 0) {
    parts.push(texts.others({ percentage: formatPercentage(others.percentage) }));
  }
  return parts.join(' ');
}

function buildTransfersNarrative(
  transfers: AggregateResult,
  texts: EconomicNarrativeTexts['transfers'],
): string {
  if (transfers.total === 0) {
    return texts.noData;
  }

  const ordered = transfers.aggregated.filter((row) => row.id !== OTHERS_ID);
  const primary = ordered.find((row) => row.id !== NO_COUNTERPART_ID);
  const fallback = ordered.find((row) => row.id === NO_COUNTERPART_ID);
  const secondary = ordered.filter((row) => row !== primary && row.id !== NO_COUNTERPART_ID)[0];
  const others = transfers.aggregated.find((row) => row.id === OTHERS_ID);

  const parts: string[] = [];
  if (primary) {
    parts.push(texts.primary({ counterpart: primary.name, percentage: formatPercentage(primary.percentage) }));
  } else if (fallback) {
    parts.push(texts.fallbackPrimary({ percentage: formatPercentage(fallback.percentage) }));
  }

  if (secondary) {
    parts.push(texts.secondary({ counterpart: secondary.name, percentage: formatPercentage(secondary.percentage) }));
  } else if (fallback && primary) {
    parts.push(texts.fallbackSecondary({ percentage: formatPercentage(fallback.percentage) }));
  }

  if (others && others.amount > 0) {
    parts.push(texts.others({ percentage: formatPercentage(others.percentage) }));
  }

  return parts.join(' ');
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
