'use client';
import * as React from 'react';
import { StatCard } from '@/components/stat-card';
import { ExpensesChart } from '@/components/expenses-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { DollarSign, TrendingUp, TrendingDown, Rocket, Heart, AlertTriangle, FolderKanban, CalendarClock, Share2, Copy, Mail, PartyPopper, Info, FileSpreadsheet, FileText, RefreshCcw, Pencil } from 'lucide-react';
import type { Transaction, Contact, Project, Donor, Category } from '@/lib/data';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization, useOrgUrl } from '@/hooks/organization-provider';
import { formatCurrencyEU } from '@/lib/normalize';
import { DateFilter, type DateFilterValue } from '@/components/date-filter';
import { useTransactionFilters } from '@/hooks/use-transaction-filters';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  aggregateIncomeByCategory,
  aggregateMissionTransfersByContact,
  aggregateOperationalExpensesByProject,
  buildNarrativesFromAggregates,
  type AggregateRow,
  type NarrativeDraft,
} from '@/lib/exports/economic-report';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';

interface TaxObligation {
  id: string;
  nameKey: string;
  month: number;
  day: number;
  reportPath: string;
}

const TAX_OBLIGATIONS: TaxObligation[] = [
  { id: 'model182', nameKey: 'model182', month: 1, day: 31, reportPath: '/dashboard/informes' },
  { id: 'model347', nameKey: 'model347', month: 2, day: 28, reportPath: '/dashboard/informes' },
];

const NARRATIVE_LABELS: Record<keyof NarrativeDraft, string> = {
  summary: 'Resum executiu',
  income: 'Origen dels fons',
  expenses: 'Aplicació dels fons',
  transfers: 'Transferències a contraparts',
};
const NARRATIVE_CARD_TITLES: Record<keyof NarrativeDraft, string> = {
  summary: 'Resum',
  income: 'Origen',
  expenses: 'Aplicació',
  transfers: 'Transferències',
};
const NARRATIVE_ORDER: (keyof NarrativeDraft)[] = ['summary', 'income', 'expenses', 'transfers'];

interface Celebration {
  id: string;
  emoji: string;
  messageKey: string;
  messageParams?: Record<string, any>;
  priority: number;
}

// Component per mostrar comparativa amb any anterior
function ComparisonBadge({
  current,
  previous,
  previousYear,
  isCurrency = false,
  formatFn
}: {
  current: number;
  previous: number;
  previousYear: number;
  isCurrency?: boolean;
  formatFn?: (value: number) => string;
}) {
  const diff = current - previous;

  if (diff === 0) {
    return <span className="text-xs text-muted-foreground">(= vs {previousYear})</span>;
  }

  const isPositive = diff > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const prefix = isPositive ? '+' : '-';
  const displayDiff = formatFn ? formatFn(Math.abs(diff)) : Math.abs(diff);

  return (
    <span className={`text-xs flex items-center gap-0.5 ${color}`}>
      <Icon className="h-3 w-3" />
      ({prefix}{displayDiff} vs {previousYear})
    </span>
  );
}

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { organizationId, organization } = useCurrentOrganization();
  const { t } = useTranslations();
  const { buildUrl } = useOrgUrl();

  const transactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const { data: transactions } = useCollection<Transaction>(transactionsQuery);

  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const { data: contacts } = useCollection<Contact>(contactsQuery);

  const projectsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'projects') : null,
    [firestore, organizationId]
  );
  const { data: projects } = useCollection<Project>(projectsQuery);

  const categoriesQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );
  const { data: categories } = useCollection<Category>(categoriesQuery);

  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>({ type: 'all' });
  const filteredTransactions = useTransactionFilters(transactions || undefined, dateFilter);

  const MISSION_TRANSFER_CATEGORY_KEY = 'missionTransfers';
  const incomeAggregates = React.useMemo(
    () =>
      aggregateIncomeByCategory({
        transactions: filteredTransactions,
        categories,
        topN: 3,
      }),
    [filteredTransactions, categories]
  );
  const expenseAggregates = React.useMemo(
    () =>
      aggregateOperationalExpensesByProject({
        transactions: filteredTransactions,
        projects,
        topN: 3,
        missionKey: MISSION_TRANSFER_CATEGORY_KEY,
      }),
    [filteredTransactions, projects]
  );
  const transferAggregates = React.useMemo(
    () =>
      aggregateMissionTransfersByContact({
        transactions: filteredTransactions,
        contacts,
        topN: 3,
        missionKey: MISSION_TRANSFER_CATEGORY_KEY,
      }),
    [filteredTransactions, contacts]
  );
  const { totalIncome, totalExpenses, totalMissionTransfers } = React.useMemo(() => {
    if (!filteredTransactions) return { totalIncome: 0, totalExpenses: 0, totalMissionTransfers: 0 };
    return filteredTransactions.reduce((acc, tx) => {
      if (tx.amount > 0) {
        acc.totalIncome += tx.amount;
      } else if (tx.category === MISSION_TRANSFER_CATEGORY_KEY) {
        acc.totalMissionTransfers += tx.amount;
      } else {
        acc.totalExpenses += tx.amount;
      }
      return acc;
    }, { totalIncome: 0, totalExpenses: 0, totalMissionTransfers: 0 });
  }, [filteredTransactions]);

  const expenseTransactions = React.useMemo(
    () => filteredTransactions?.filter((tx) => tx.amount < 0 && tx.category !== MISSION_TRANSFER_CATEGORY_KEY) || [],
    [filteredTransactions]
  );
  const netBalance = totalIncome + totalExpenses;
  // Estat per compartir resum
  const [shareDialogOpen, setShareDialogOpen] = React.useState(false);
  const [summaryText, setSummaryText] = React.useState('');
  const [copySuccess, setCopySuccess] = React.useState(false);
  const [narratives, setNarratives] = React.useState<NarrativeDraft | null>(null);
  const [defaultNarratives, setDefaultNarratives] = React.useState<NarrativeDraft | null>(null);
  const [editingField, setEditingField] = React.useState<keyof NarrativeDraft | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [isNarrativeEditorOpen, setNarrativeEditorOpen] = React.useState(false);
  const isMobile = useIsMobile();

  // Ref per gestionar timeout i evitar memory leaks
  const copyTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout quan component es desmunta
  React.useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);
  React.useEffect(() => {
    if (!shareDialogOpen) {
      setNarrativeEditorOpen(false);
      setEditingField(null);
    }
  }, [shareDialogOpen]);

  // Funció per formatejar el període del filtre
  const formatPeriodLabel = (filter: DateFilterValue): string => {
    if (filter.type === 'all') return t.dashboard.allPeriods;
    if (filter.type === 'year' && filter.year) return `${t.dashboard.filterYear} ${filter.year}`;
    if (filter.type === 'month' && filter.year && filter.month) {
      const monthNames = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
      return `${monthNames[filter.month - 1]} ${filter.year}`;
    }
    if (filter.type === 'quarter' && filter.year && filter.quarter) {
      return `T${filter.quarter} ${filter.year}`;
    }
    if (filter.type === 'custom' && filter.customRange?.from && filter.customRange?.to) {
      const start = filter.customRange.from.toLocaleDateString();
      const end = filter.customRange.to.toLocaleDateString();
      return `${start} - ${end}`;
    }
    return t.dashboard.allPeriods;
  };

  // Funció per generar el text de resum
  const generateSummaryText = (): string => {
    const orgName = organization?.name || 'Organització';
    const period = formatPeriodLabel(dateFilter);

    // Comparativa amb any anterior
    const donorsComparison = canShowComparison
      ? ` (${prevUniqueDonors} ${t.dashboard.vsPreviousYear})`
      : '';
    const donationsComparison = canShowComparison
      ? ` (${formatCurrencyEU(prevTotalDonations)} ${t.dashboard.vsPreviousYear})`
      : '';
    const membersComparison = canShowComparison
      ? ` (${prevActiveMembers} ${t.dashboard.vsPreviousYear})`
      : '';
    const feesComparison = canShowComparison
      ? ` (${formatCurrencyEU(prevMemberFees)} ${t.dashboard.vsPreviousYear})`
      : '';

    return `📊 Resum ${orgName} - ${period}

💰 ${t.dashboard.totalIncome}: ${formatCurrencyEU(totalIncome)}
💸 ${t.dashboard.operatingExpenses}: ${formatCurrencyEU(Math.abs(totalExpenses))}
📈 ${t.dashboard.operatingBalance}: ${formatCurrencyEU(netBalance)}

❤️ ${t.dashboard.activeDonors}: ${uniqueDonors}${donorsComparison}
🎁 ${t.dashboard.donations}: ${formatCurrencyEU(totalDonations)}${donationsComparison}
👥 ${t.dashboard.activeMembers}: ${activeMembers}${membersComparison}
💳 ${t.dashboard.memberFees}: ${formatCurrencyEU(memberFees)}${feesComparison}

${t.dashboard.generatedWith}`;
  };

  // Funció per copiar al portapapers
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(summaryText);
      setCopySuccess(true);
      // Netejar timeout anterior si existeix
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  // Funció per enviar per email
  const handleEmailShare = () => {
    const subject = encodeURIComponent(`Resum ${organization?.name || 'Organització'}`);
    const body = encodeURIComponent(summaryText);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Funció per obrir el diàleg
  const handleShareClick = () => {
    const text = generateSummaryText();
    const periodLabel = formatPeriodLabel(dateFilter);
    const baseNarratives = buildNarrativesFromAggregates({
      periodLabel,
      income: incomeAggregates,
      expenses: expenseAggregates,
      transfers: transferAggregates,
      netBalance,
    });
    setSummaryText(text);
    setNarratives(baseNarratives);
    setDefaultNarratives(baseNarratives);
    setEditingField(null);
    setEditingValue('');
    setNarrativeEditorOpen(false);
    setShareDialogOpen(true);
  };

  const openNarrativeEditor = (field: keyof NarrativeDraft) => {
    if (!narratives) return;
    setEditingField(field);
    setEditingValue(narratives[field]);
    setNarrativeEditorOpen(true);
  };

  const handleNarrativeSave = () => {
    if (!narratives || !editingField) {
      setNarrativeEditorOpen(false);
      setEditingField(null);
      return;
    }
    setNarratives({ ...narratives, [editingField]: editingValue });
    setNarrativeEditorOpen(false);
    setEditingField(null);
  };

  const handleNarrativeCancel = () => {
    setNarrativeEditorOpen(false);
    setEditingField(null);
  };

  const handleResetNarratives = () => {
    if (defaultNarratives) {
      setNarratives(defaultNarratives);
      setEditingField(null);
      setEditingValue('');
      setNarrativeEditorOpen(false);
    }
  };

  const handleCopyNarrative = async (field: keyof NarrativeDraft) => {
    if (!narratives) return;
    try {
      await navigator.clipboard.writeText(narratives[field]);
    } catch (err) {
      console.error('Error copying narrative:', err);
    }
  };

  const formatAggregateSheetRows = (rows: AggregateRow[]) =>
    rows.map((row) => ({
      ID: row.id,
      Nom: row.name,
      Import: Number(row.amount.toFixed(2)),
      Percentatge: Number(row.percentage.toFixed(2)),
      Operacions: row.count,
    }));

  const handleExportEconomicExcel = () => {
    const workbook = XLSX.utils.book_new();
    const periodLabel = formatPeriodLabel(dateFilter);
    const summarySheet = XLSX.utils.json_to_sheet([
      { Indicador: 'Període', Valor: periodLabel },
      { Indicador: 'Ingressos totals', Valor: Number(incomeAggregates.total.toFixed(2)) },
      { Indicador: 'Despeses operatives', Valor: Number(expenseAggregates.total.toFixed(2)) },
      { Indicador: 'Transferències a contraparts', Valor: Number(transferAggregates.total.toFixed(2)) },
      { Indicador: 'Balanç operatiu', Valor: Number(netBalance.toFixed(2)) },
    ]);

    const appendSheet = (title: string, rows: AggregateRow[]) => {
      const sheet = XLSX.utils.json_to_sheet(formatAggregateSheetRows(rows));
      XLSX.utils.book_append_sheet(workbook, sheet, title);
    };

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resum');
    appendSheet('Origen (Top)', incomeAggregates.aggregated);
    appendSheet('Aplicació (Top)', expenseAggregates.aggregated);
    appendSheet('Contraparts (Top)', transferAggregates.aggregated);
    appendSheet('Origen (Complet)', incomeAggregates.complete);
    appendSheet('Aplicació (Complet)', expenseAggregates.complete);
    appendSheet('Contraparts (Complet)', transferAggregates.complete);

    const dateStamp = new Date().toISOString().split('T')[0];
    const prefix = `informe-economic-${organization?.slug || 'org'}-${dateStamp}`;
    XLSX.writeFile(workbook, `${prefix}.xlsx`);
  };

  const downloadCsv = (rows: AggregateRow[], filename: string) => {
    const data = rows.map((row) => ({
      id: row.id,
      nom: row.name,
      import: Number(row.amount.toFixed(2)),
      percentatge: Number(row.percentage.toFixed(2)),
      operacions: row.count,
    }));
    const csv = Papa.unparse({
      fields: ['id', 'nom', 'import', 'percentatge', 'operacions'],
      data: data.map((row) => [row.id, row.nom, row.import, row.percentatge, row.operacions]),
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportEconomicCsv = () => {
    const dateStamp = new Date().toISOString().split('T')[0];
    const prefix = `${organization?.slug || 'org'}-${dateStamp}`;
    downloadCsv(incomeAggregates.complete, `origen-fons-${prefix}.csv`);
    downloadCsv(expenseAggregates.complete, `aplicacio-fons-${prefix}.csv`);
    downloadCsv(transferAggregates.complete, `transferencies-${prefix}.csv`);
  };

  // Map de contactes per ID amb el seu membershipType
  const contactMembershipMap = React.useMemo(() => {
    if (!contacts) return new Map<string, 'one-time' | 'recurring'>();
    return new Map(
      contacts
        .filter((c): c is Donor => c.type === 'donor')
        .map(c => [c.id, c.membershipType || 'one-time'])
    );
  }, [contacts]);

  // Determinar si es pot mostrar comparativa amb any anterior
  const canShowComparison = dateFilter.type === 'year' || dateFilter.type === 'quarter' || dateFilter.type === 'month';
  const previousYear = (dateFilter.year || new Date().getFullYear()) - 1;

  // Funció per obtenir transaccions del període anterior
  const getPreviousPeriodTransactions = React.useCallback(() => {
    if (!transactions || !canShowComparison) return [];
    return transactions.filter(tx => {
      const txDate = new Date(tx.date);
      const txYear = txDate.getFullYear();

      if (dateFilter.type === 'year') {
        return txYear === previousYear;
      }
      if (dateFilter.type === 'quarter' && dateFilter.quarter) {
        const txMonth = txDate.getMonth() + 1;
        const qStart = (dateFilter.quarter - 1) * 3 + 1;
        const qEnd = dateFilter.quarter * 3;
        return txYear === previousYear && txMonth >= qStart && txMonth <= qEnd;
      }
      if (dateFilter.type === 'month' && dateFilter.month) {
        return txYear === previousYear && txDate.getMonth() + 1 === dateFilter.month;
      }
      return false;
    });
  }, [transactions, canShowComparison, dateFilter, previousYear]);

  // Funció per calcular mètriques de donants i socis
  const calculateDonorMetrics = React.useCallback((txs: Transaction[]) => {
    const donorIds = new Set<string>();
    const memberIds = new Set<string>();
    let donations = 0;
    let memberFees = 0;

    txs.forEach(tx => {
      if (tx.amount > 0 && tx.contactType === 'donor' && tx.contactId) {
        const membershipType = contactMembershipMap.get(tx.contactId) || 'one-time';

        if (membershipType === 'recurring') {
          memberIds.add(tx.contactId);
          memberFees += tx.amount;
        } else {
          donorIds.add(tx.contactId);
          donations += tx.amount;
        }
      }
    });

    return {
      totalDonations: donations,
      uniqueDonors: donorIds.size,
      memberFees,
      activeMembers: memberIds.size
    };
  }, [contactMembershipMap]);

  // Mètriques del període actual
  const currentMetrics = React.useMemo(() => {
    if (!filteredTransactions) return { totalDonations: 0, uniqueDonors: 0, memberFees: 0, activeMembers: 0 };
    return calculateDonorMetrics(filteredTransactions);
  }, [filteredTransactions, calculateDonorMetrics]);

  // Mètriques del període anterior (per comparativa)
  const previousMetrics = React.useMemo(() => {
    if (!canShowComparison) return { totalDonations: 0, uniqueDonors: 0, memberFees: 0, activeMembers: 0 };
    return calculateDonorMetrics(getPreviousPeriodTransactions());
  }, [canShowComparison, getPreviousPeriodTransactions, calculateDonorMetrics]);

  const { totalDonations, uniqueDonors, memberFees, activeMembers } = currentMetrics;
  const {
    totalDonations: prevTotalDonations,
    uniqueDonors: prevUniqueDonors,
    memberFees: prevMemberFees,
    activeMembers: prevActiveMembers
  } = previousMetrics;

  // Càlcul de despeses per projecte
  const expensesByProject = React.useMemo(() => {
    if (!filteredTransactions) return [];

    // Crear mapa de projectes per ID
    const projectMap = new Map<string | null, { name: string; total: number }>();

    // Procesar totes les despeses (excloses transferències de missió)
    filteredTransactions.forEach(tx => {
      if (tx.amount < 0 && tx.category !== MISSION_TRANSFER_CATEGORY_KEY) {
        const projectId = tx.projectId || null;
        const current = projectMap.get(projectId) || { name: '', total: 0 };
        current.total += Math.abs(tx.amount);
        projectMap.set(projectId, current);
      }
    });

    // Assignar noms de projectes
    projectMap.forEach((value, key) => {
      if (key === null) {
        value.name = t.dashboard.unassigned;
      } else {
        const project = projects?.find(p => p.id === key);
        value.name = project?.name || t.dashboard.unassigned;
      }
    });

    // Calcular total i percentatges
    const total = Array.from(projectMap.values()).reduce((sum, p) => sum + p.total, 0);

    const result = Array.from(projectMap.entries()).map(([projectId, data]) => ({
      projectId,
      projectName: data.name,
      totalExpense: data.total,
      percentage: total > 0 ? (data.total / total) * 100 : 0,
    }));

    // Ordenar: primer per import descendent, però "Sense assignar" sempre al final
    return result.sort((a, b) => {
      // "Sense assignar" (projectId === null) sempre al final
      if (a.projectId === null && b.projectId !== null) return 1;
      if (a.projectId !== null && b.projectId === null) return -1;
      // La resta ordenats per import descendent
      return b.totalExpense - a.totalExpense;
    });
  }, [filteredTransactions, projects, t.dashboard.unassigned]);

  const totalProjectExpenses = React.useMemo(() => {
    return expensesByProject.reduce((sum, p) => sum + p.totalExpense, 0);
  }, [expensesByProject]);

  // Detectar si totes les despeses estan sense assignar
  const allExpensesUnassigned = React.useMemo(() => {
    return expensesByProject.length === 1 && expensesByProject[0]?.projectId === null;
  }, [expensesByProject]);

  // Càlcul d'alertes
  const alerts = React.useMemo(() => {
    const result = [];

    // 🔴 Moviments sense categoritzar
    const uncategorizedCount = filteredTransactions?.filter(tx =>
      tx.category === null || tx.category === 'Revisar'
    ).length || 0;

    if (uncategorizedCount > 0) {
      result.push({
        type: 'uncategorized' as const,
        count: uncategorizedCount,
        label: t.dashboard.uncategorizedMovements,
        variant: 'destructive' as const,
        href: buildUrl('/dashboard/movimientos') + '?filter=uncategorized',
      });
    }

    // 🟠 Donants amb dades incompletes
    const incompleteDonorsCount = contacts?.filter(contact =>
      contact.type === 'donor' && (!contact.taxId || !contact.zipCode)
    ).length || 0;

    if (incompleteDonorsCount > 0) {
      result.push({
        type: 'incomplete_donors' as const,
        count: incompleteDonorsCount,
        label: t.dashboard.incompleteDonors,
        variant: 'default' as const,
        href: buildUrl('/dashboard/donants') + '?filter=incomplete',
      });
    }

    // 🟡 Moviments sense contacte assignat
    const threshold = organization?.contactAlertThreshold ?? 50;
    const noContactCount = filteredTransactions?.filter(tx =>
      !tx.contactId && Math.abs(tx.amount) > threshold
    ).length || 0;

    if (noContactCount > 0) {
      result.push({
        type: 'no_contact' as const,
        count: noContactCount,
        label: t.dashboard.movementsWithoutContact,
        variant: 'secondary' as const,
        href: buildUrl('/dashboard/movimientos') + '?filter=noContact',
        info: threshold > 0 ? t.dashboard.onlyMovementsAbove({ amount: threshold }) : undefined,
      });
    }

    return result;
  }, [filteredTransactions, contacts, t, buildUrl, organization]);

  // Càlcul d'obligacions fiscals
  const taxObligations = React.useMemo(() => {
    const today = new Date();
    const currentYear = today.getFullYear();

    return TAX_OBLIGATIONS.map(obligation => {
      // Crear data límit per aquest any
      let deadline = new Date(currentYear, obligation.month - 1, obligation.day);

      // Si ja ha passat, usar l'any següent
      if (deadline < today) {
        deadline = new Date(currentYear + 1, obligation.month - 1, obligation.day);
      }

      // Calcular dies restants
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determinar estat visual
      let status: 'success' | 'warning' | 'destructive';
      if (daysRemaining > 60) status = 'success';
      else if (daysRemaining >= 30) status = 'warning';
      else status = 'destructive';

      return {
        ...obligation,
        deadline,
        daysRemaining,
        status
      };
    }).sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, []);

  // Càlcul de celebracions
  const celebrations = React.useMemo(() => {
    const result: Celebration[] = [];

    // 1. Totes les transaccions categoritzades
    const uncategorizedCount = filteredTransactions?.filter(tx =>
      tx.category === null || tx.category === 'Revisar'
    ).length || 0;

    if (uncategorizedCount === 0 && filteredTransactions && filteredTransactions.length > 0) {
      result.push({
        id: 'all-categorized',
        emoji: '✅',
        messageKey: 'allCategorized',
        priority: 3
      });
    }

    // 2. Balanç positiu
    if (netBalance > 0) {
      result.push({
        id: 'positive-balance',
        emoji: '📈',
        messageKey: 'positiveBalance',
        priority: 2
      });
    }

    // 3. Més de 5 donants
    if (uniqueDonors > 5) {
      result.push({
        id: 'many-donors',
        emoji: '❤️',
        messageKey: 'manyDonors',
        messageParams: { count: uniqueDonors },
        priority: 1
      });
    }

    // 4. No hi ha alertes
    if (alerts.length === 0 && filteredTransactions && filteredTransactions.length > 0) {
      result.push({
        id: 'no-alerts',
        emoji: '🎯',
        messageKey: 'noAlerts',
        priority: 4
      });
    }

    // 5. Primera donació del mes (si el filtre inclou el mes actual)
    if (dateFilter.type === 'month' || dateFilter.type === 'all') {
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      const donationsThisMonth = filteredTransactions?.filter(tx => {
        const txDate = new Date(tx.date);
        return tx.amount > 0 &&
          tx.contactType === 'donor' &&
          txDate.getMonth() + 1 === currentMonth &&
          txDate.getFullYear() === currentYear;
      }).length || 0;

      if (donationsThisMonth > 0 && dateFilter.type === 'all') {
        result.push({
          id: 'first-donation-month',
          emoji: '🎁',
          messageKey: 'firstDonationMonth',
          priority: 2
        });
      }
    }

    // Ordenar per prioritat
    return result.sort((a, b) => a.priority - b.priority);
  }, [filteredTransactions, netBalance, uniqueDonors, alerts, dateFilter]);

  return (
    <div className="flex flex-col gap-6">
       <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.description}</p>
      </div>

      <div className="flex items-center justify-between gap-4">
        <DateFilter value={dateFilter} onChange={setDateFilter} />
        <Button variant="outline" onClick={handleShareClick}>
          <Share2 className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">{t.dashboard.shareSummary}</span>
        </Button>
      </div>

      {celebrations.length > 0 && (
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PartyPopper className="h-5 w-5 text-green-600" />
              {t.dashboard.celebrations}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {celebrations.map((celebration) => {
                const message = t.dashboard[celebration.messageKey as keyof typeof t.dashboard];
                const displayMessage = celebration.messageParams && typeof message === 'function'
                  ? message(celebration.messageParams as any)
                  : message as string;

                return (
                  <Badge
                    key={celebration.id}
                    variant="success"
                    className="text-sm py-1.5 px-3"
                  >
                    <span className="mr-1">{celebration.emoji}</span>
                    {displayMessage}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t.dashboard.totalIncome}
          value={formatCurrencyEU(totalIncome)}
          icon={TrendingUp}
          description={t.dashboard.totalIncomeDescription}
        />
        <StatCard
          title={t.dashboard.operatingExpenses}
          value={formatCurrencyEU(totalExpenses)}
          icon={TrendingDown}
          description={t.dashboard.operatingExpensesDescription}
        />
         <StatCard
          title={t.dashboard.operatingBalance}
          value={formatCurrencyEU(netBalance)}
          icon={DollarSign}
          description={t.dashboard.operatingBalanceDescription}
        />
        <StatCard
          title={t.dashboard.missionTransfers}
          value={formatCurrencyEU(totalMissionTransfers)}
          icon={Rocket}
          description={t.dashboard.missionTransfersDescription}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-pink-500" />
            {t.dashboard.donationsAndMembers}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-sm text-muted-foreground">{t.dashboard.donations}</p>
              <p className="text-2xl font-bold">{formatCurrencyEU(totalDonations)}</p>
              {canShowComparison && (
                <ComparisonBadge
                  current={totalDonations}
                  previous={prevTotalDonations}
                  previousYear={previousYear}
                  isCurrency
                  formatFn={formatCurrencyEU}
                />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.dashboard.activeDonors}</p>
              <p className="text-2xl font-bold">{uniqueDonors}</p>
              {canShowComparison && (
                <ComparisonBadge
                  current={uniqueDonors}
                  previous={prevUniqueDonors}
                  previousYear={previousYear}
                />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.dashboard.activeMembers}</p>
              <p className="text-2xl font-bold">{activeMembers}</p>
              {canShowComparison && (
                <ComparisonBadge
                  current={activeMembers}
                  previous={prevActiveMembers}
                  previousYear={previousYear}
                />
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t.dashboard.memberFees}</p>
              <p className="text-2xl font-bold">{formatCurrencyEU(memberFees)}</p>
              {canShowComparison && (
                <ComparisonBadge
                  current={memberFees}
                  previous={prevMemberFees}
                  previousYear={previousYear}
                  isCurrency
                  formatFn={formatCurrencyEU}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-blue-500" />
            {t.dashboard.expensesByProject}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {expensesByProject.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t.dashboard.noExpenses}</p>
          ) : allExpensesUnassigned ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                <Info className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-blue-900 dark:text-blue-100">
                    {t.dashboard.noProjectsAssigned}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">{t.dashboard.totalExpensesProject}</span>
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100">{formatCurrencyEU(totalProjectExpenses)}</span>
                  </div>
                  <Link href={buildUrl('/dashboard/movimientos')}>
                    <Button variant="outline" size="sm" className="w-full">
                      {t.dashboard.assignProjectsToTransactions}
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {expensesByProject.map((project) => {
                const isUnassigned = project.projectId === null;
                return (
                  <div key={project.projectId || 'unassigned'} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${isUnassigned ? 'text-muted-foreground italic' : ''}`}>
                        {project.projectName}
                      </span>
                      <span className="text-sm font-semibold tabular-nums">
                        {formatCurrencyEU(project.totalExpense)}
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          ({Math.round(project.percentage)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${isUnassigned ? 'bg-gray-400' : 'bg-blue-500'}`}
                        style={{ width: `${project.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="pt-4 mt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">{t.dashboard.totalExpensesProject}</span>
                  <span className="text-sm font-bold tabular-nums">{formatCurrencyEU(totalProjectExpenses)}</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-amber-500" />
            {t.dashboard.taxObligations}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {taxObligations.map((obligation) => (
              <div
                key={obligation.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={obligation.status === 'warning' ? 'default' : obligation.status}>
                    {obligation.status === 'success' && '🟢'}
                    {obligation.status === 'warning' && '🟡'}
                    {obligation.status === 'destructive' && '🔴'}
                  </Badge>
                  <div>
                    <p className="font-medium text-sm">{t.dashboard[obligation.nameKey as keyof typeof t.dashboard] as string}</p>
                    <p className="text-xs text-muted-foreground">
                      {obligation.daysRemaining} {t.dashboard.daysRemaining}
                    </p>
                  </div>
                </div>
                <Link href={buildUrl(obligation.reportPath)}>
                  <Button variant="outline" size="sm">
                    {t.dashboard.prepare}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t.dashboard.alerts}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="flex items-center gap-2 text-green-600">
              <span className="text-2xl">✅</span>
              <span className="font-semibold">{t.dashboard.allClear}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {alerts.map((alert) => (
                <div key={alert.type}>
                  <Link
                    href={alert.href}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors"
                  >
                    <span className="text-sm">{alert.label}</span>
                    <Badge variant={alert.variant}>{alert.count}</Badge>
                  </Link>
                  {(alert as any).info && (
                    <p className="text-xs text-muted-foreground mt-1 ml-3">{(alert as any).info}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.dashboard.expensesByCategory}</CardTitle>
        </CardHeader>
        <CardContent>
          <ExpensesChart transactions={expenseTransactions} />
        </CardContent>
      </Card>

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-5xl w-full max-h-[85vh] overflow-hidden">
          <div className="flex h-full flex-col">
            <DialogHeader>
              <DialogTitle>{t.dashboard.shareSummary}</DialogTitle>
              <DialogDescription>{t.dashboard.shareSummaryDescription}</DialogDescription>
            </DialogHeader>

            <div className="flex flex-1 flex-col gap-6 overflow-y-auto md:flex-row">
              <div className="space-y-4 md:w-3/5">
                <div className="space-y-3 rounded-lg border bg-background/80 p-4 shadow-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Resum executiu</p>
                    <p className="text-sm font-semibold">{organization?.name || 'Organització'} · {formatPeriodLabel(dateFilter)}</p>
                  </div>
                  <Textarea
                    value={summaryText}
                    onChange={(e) => setSummaryText(e.target.value)}
                    className="font-mono text-sm min-h-[280px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={handleCopy}>
                    <Copy className="h-4 w-4 mr-2" />
                    {copySuccess ? t.dashboard.copied : t.dashboard.copy}
                  </Button>
                  <Button variant="outline" onClick={handleResetNarratives} disabled={!defaultNarratives}>
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Reinicia a proposta
                  </Button>
                  <Button variant="secondary" onClick={handleExportEconomicExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Exporta Excel
                  </Button>
                  <Button variant="secondary" onClick={handleExportEconomicCsv}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exporta CSV
                  </Button>
                </div>
              </div>

              {narratives && (
                <div className="md:w-2/5 space-y-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Textos del període</p>
                    <p className="text-sm text-muted-foreground">
                      Relat executiu resumit. Utilitza les accions de cada targeta per copiar o editar el contingut complet.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {NARRATIVE_ORDER.map((field) => (
                      <div key={field} className="flex h-full flex-col rounded-lg border border-dashed bg-muted/30 p-3 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{NARRATIVE_CARD_TITLES[field]}</p>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <button onClick={() => handleCopyNarrative(field)} className="text-xs hover:text-foreground">📋</button>
                            <button onClick={() => openNarrativeEditor(field)} className="text-xs hover:text-foreground">✏️</button>
                          </div>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {narratives[field]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="default" onClick={handleEmailShare}>
                <Mail className="h-4 w-4 mr-2" />
                {t.dashboard.sendByEmail}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {editingField && (
        isMobile ? (
          <Sheet open={isNarrativeEditorOpen} onOpenChange={(open) => (open ? setNarrativeEditorOpen(true) : handleNarrativeCancel())}>
            <SheetContent side="bottom" className="h-[85vh] w-full overflow-y-auto">
              <SheetHeader className="space-y-1">
                <SheetTitle>{`Edita ${NARRATIVE_CARD_TITLES[editingField]}`}</SheetTitle>
                <SheetDescription>{NARRATIVE_LABELS[editingField]}</SheetDescription>
              </SheetHeader>
              <div className="space-y-4 py-4">
                <Textarea
                  value={editingValue}
                  onChange={(e) => setEditingValue(e.target.value)}
                  rows={8}
                  className="text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={handleNarrativeSave}>Desa</Button>
                  <Button variant="outline" onClick={handleNarrativeCancel}>
                    Cancel·la
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <Dialog open={isNarrativeEditorOpen} onOpenChange={(open) => (open ? setNarrativeEditorOpen(true) : handleNarrativeCancel())}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{`Edita ${NARRATIVE_CARD_TITLES[editingField]}`}</DialogTitle>
                <DialogDescription>{NARRATIVE_LABELS[editingField]}</DialogDescription>
              </DialogHeader>
              <Textarea
                value={editingValue}
                onChange={(e) => setEditingValue(e.target.value)}
                rows={8}
                className="text-sm"
              />
              <DialogFooter className="mt-4">
                <Button onClick={handleNarrativeSave}>Desa</Button>
                <Button variant="outline" onClick={handleNarrativeCancel}>
                  Cancel·la
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )
      )}
    </div>
  );
}
