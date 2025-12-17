import type { Transaction, Category, Project, Contact } from '@/lib/data';
import { formatCurrencyEU } from '@/lib/normalize';

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

interface IncomeAggregationParams {
  transactions?: Transaction[] | null;
  categories?: (Category & { id: string })[] | null;
  topN?: number;
}

interface ExpenseAggregationParams {
  transactions?: Transaction[] | null;
  projects?: (Project & { id: string })[] | null;
  topN?: number;
  missionKey: string;
}

interface TransferAggregationParams {
  transactions?: Transaction[] | null;
  contacts?: (Contact & { id: string })[] | null;
  topN?: number;
  missionKey: string;
}

const UNCATEGORIZED_ID = 'uncategorized';
const UNCATEGORIZED_NAME = 'Sense categoria';
const GENERAL_PROJECT_ID = 'general';
const GENERAL_PROJECT_NAME = 'Funcionament general';
const NO_COUNTERPART_ID = 'no-counterpart';
const NO_COUNTERPART_NAME = 'Sense contrapart';
const OTHERS_ID = 'others';
const OTHERS_NAME = 'Altres';

const DEFAULT_TOP_N = 3;

export function aggregateIncomeByCategory({
  transactions,
  categories,
  topN = DEFAULT_TOP_N,
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
    const name = isValidCategory ? category!.name : UNCATEGORIZED_NAME;

    const amount = tx.amount;
    total += amount;

    if (!rows.has(key)) {
      rows.set(key, { id: key, name, amount: 0, percentage: 0, count: 0 });
    }
    const entry = rows.get(key)!;
    entry.amount += amount;
    entry.count += 1;
  });

  return finalizeAggregation(rows, total, topN);
}

export function aggregateOperationalExpensesByProject({
  transactions,
  projects,
  topN = DEFAULT_TOP_N,
  missionKey,
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
    const name = project ? project.name : GENERAL_PROJECT_NAME;

    const amount = Math.abs(tx.amount);
    total += amount;

    if (!rows.has(key)) {
      rows.set(key, { id: key, name, amount: 0, percentage: 0, count: 0 });
    }
    const entry = rows.get(key)!;
    entry.amount += amount;
    entry.count += 1;
  });

  return finalizeAggregation(rows, total, topN);
}

export function aggregateMissionTransfersByContact({
  transactions,
  contacts,
  topN = DEFAULT_TOP_N,
  missionKey,
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
    const name = contact ? contact.name : NO_COUNTERPART_NAME;

    const amount = Math.abs(tx.amount);
    total += amount;

    if (!rows.has(key)) {
      rows.set(key, { id: key, name, amount: 0, percentage: 0, count: 0 });
    }
    const entry = rows.get(key)!;
    entry.amount += amount;
    entry.count += 1;
  });

  return finalizeAggregation(rows, total, topN);
}

function finalizeAggregation(
  rows: Map<string, AggregateRow>,
  total: number,
  topN: number,
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
        name: OTHERS_NAME,
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
}: NarrativeParams): NarrativeDraft {
  const summary = buildSummaryNarrative(periodLabel, income.total, expenses.total, netBalance);
  const incomeText = buildIncomeNarrative(income);
  const expensesText = buildExpenseNarrative(expenses);
  const transfersText = buildTransfersNarrative(transfers);

  return {
    summary,
    income: incomeText,
    expenses: expensesText,
    transfers: transfersText,
  };
}

function buildSummaryNarrative(periodLabel: string, incomeTotal: number, expenseTotal: number, netBalance: number): string {
  if (incomeTotal === 0 && expenseTotal === 0) {
    return `Durant ${periodLabel} no s'han registrat moviments econòmics destacables.`;
  }
  return `Durant ${periodLabel} s'han reconegut ${formatCurrencyEU(incomeTotal)} d'ingressos i ${formatCurrencyEU(expenseTotal)} d'aplicació operativa, amb un tancament net de ${formatCurrencyEU(netBalance)}.`;
}

function buildIncomeNarrative(income: AggregateResult): string {
  if (income.total === 0) {
    return 'En aquest període no consten entrades de recursos.';
  }

  const ordered = income.aggregated.filter((row) => row.id !== OTHERS_ID);
  const primary = ordered.find((row) => row.id !== UNCATEGORIZED_ID);
  const fallback = ordered.find((row) => row.id === UNCATEGORIZED_ID);
  const secondary = ordered.filter((row) => row !== primary && row.id !== UNCATEGORIZED_ID)[0];

  const parts: string[] = [];
  if (primary) {
    parts.push(`La principal font d'ingressos ha estat ${primary.name} (${formatPercentage(primary.percentage)}).`);
  } else if (fallback) {
    parts.push(`La major part dels ingressos encara no té categoria assignada (${formatPercentage(fallback.percentage)}).`);
  }

  if (secondary) {
    parts.push(`També destaca ${secondary.name} (${formatPercentage(secondary.percentage)}), fet que reforça la diversificació d'entrades.`);
  } else if (fallback && primary) {
    parts.push(`Les aportacions pendents de classificar representen ${formatPercentage(fallback.percentage)} addicionals i demanen revisió documental.`);
  }

  return parts.join(' ');
}

function buildExpenseNarrative(expenses: AggregateResult): string {
  if (expenses.total === 0) {
    return 'No s\'han executat despeses operatives durant el període.';
  }

  const ordered = expenses.aggregated.filter((row) => row.id !== OTHERS_ID);
  const primary = ordered[0];
  const secondary = ordered[1];
  const others = expenses.aggregated.find((row) => row.id === OTHERS_ID);

  if (primary && primary.id === GENERAL_PROJECT_ID && primary.percentage >= 99.5) {
    return 'El 100% de la despesa consta a Funcionament general, la qual cosa evidencia que no s\'han assignat projectes específics en aquest període.';
  }

  const parts: string[] = [];
  if (primary) {
    const label = primary.id === GENERAL_PROJECT_ID ? `${primary.name} (operativa transversal)` : primary.name;
    parts.push(`L'aplicació principal dels recursos s'ha destinat a ${label} (${formatPercentage(primary.percentage)}).`);
  }
  if (secondary) {
    parts.push(`El segon focus ha estat ${secondary.name} (${formatPercentage(secondary.percentage)}).`);
  }
  if (others && others.amount > 0) {
    parts.push(`La resta de projectes concentren el ${formatPercentage(others.percentage)} restant, mostrant un repartiment equilibrat.`);
  }
  return parts.join(' ');
}

function buildTransfersNarrative(transfers: AggregateResult): string {
  if (transfers.total === 0) {
    return 'No s\'han cursat transferències a contraparts durant el període.';
  }

  const ordered = transfers.aggregated.filter((row) => row.id !== OTHERS_ID);
  const primary = ordered.find((row) => row.id !== NO_COUNTERPART_ID);
  const fallback = ordered.find((row) => row.id === NO_COUNTERPART_ID);
  const secondary = ordered.filter((row) => row !== primary && row.id !== NO_COUNTERPART_ID)[0];
  const others = transfers.aggregated.find((row) => row.id === OTHERS_ID);

  const parts: string[] = [];
  if (primary) {
    parts.push(`La principal transferència ha reforçat ${primary.name} (${formatPercentage(primary.percentage)} del total enviat).`);
  } else if (fallback) {
    parts.push(`Totes les transferències consten sense contrapart identificada (${formatPercentage(fallback.percentage)}), pendent de documentar.`);
  }

  if (secondary) {
    parts.push(`També es recullen aportacions a ${secondary.name} (${formatPercentage(secondary.percentage)}), consolidant la cooperació territorial.`);
  } else if (fallback && primary) {
    parts.push(`Les remeses sense contrapart associada representen ${formatPercentage(fallback.percentage)} i requereixen seguiment administratiu.`);
  }

  if (others && others.amount > 0) {
    parts.push(`La resta de contraparts agrupen un ${formatPercentage(others.percentage)} addicional.`);
  }

  return parts.join(' ');
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}
