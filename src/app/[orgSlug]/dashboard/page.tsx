'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Wallet,
  TrendingUp, 
  TrendingDown, 
  FolderKanban,
  FileCheck,
  Users,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  UserX,
  FolderX,
  CalendarClock,
  Sparkles,
  CircleDollarSign,
  Receipt,
} from 'lucide-react';
import type { Transaction, Category, Project, AnyContact, Donor } from '@/lib/data';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useTranslations } from '@/i18n';
import { useCurrentOrganization } from '@/hooks/organization-provider';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ca-ES', { style: 'currency', currency: 'EUR' }).format(amount);
};

const getCurrentMonth = () => new Date().getMonth() + 1; // 1-12
const getCurrentYear = () => new Date().getFullYear();

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS
// ═══════════════════════════════════════════════════════════════════════════════

type HealthStatus = 'good' | 'warning' | 'critical';

interface HealthIndicator {
  title: string;
  value: string;
  status: HealthStatus;
  description: string;
  icon: React.ElementType;
  href?: string;
}

interface PendingTask {
  id: string;
  type: 'document' | 'donor' | 'project' | 'fiscal' | 'category';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  count?: number;
  href: string;
  actionLabel: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const { firestore } = useFirebase();
  const { organization, organizationId } = useCurrentOrganization();
  const { t } = useTranslations();
  const categoryTranslations = t.categories as Record<string, string>;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COL·LECCIONS
  // ═══════════════════════════════════════════════════════════════════════════
  const transactionsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'transactions') : null,
    [firestore, organizationId]
  );
  const contactsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'contacts') : null,
    [firestore, organizationId]
  );
  const projectsQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'projects') : null,
    [firestore, organizationId]
  );
  const categoriesQuery = useMemoFirebase(
    () => organizationId ? collection(firestore, 'organizations', organizationId, 'categories') : null,
    [firestore, organizationId]
  );

  const { data: transactions } = useCollection<Transaction>(transactionsQuery);
  const { data: contacts } = useCollection<AnyContact>(contactsQuery);
  const { data: projects } = useCollection<Project>(projectsQuery);
  const { data: categories } = useCollection<Category>(categoriesQuery);

  // ═══════════════════════════════════════════════════════════════════════════
  // CÀLCULS FINANCERS
  // ═══════════════════════════════════════════════════════════════════════════
  const financials = React.useMemo(() => {
    if (!transactions) return { income: 0, expenses: 0, balance: 0 };
    
    const income = transactions.filter(tx => tx.amount > 0).reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = transactions.filter(tx => tx.amount < 0).reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      income,
      expenses,
      balance: income + expenses,
    };
  }, [transactions]);

  // ═══════════════════════════════════════════════════════════════════════════
  // ESTADÍSTIQUES DE SALUT
  // ═══════════════════════════════════════════════════════════════════════════
  const healthStats = React.useMemo(() => {
    const stats = {
      // Documents
      totalExpenses: 0,
      expensesWithDoc: 0,
      expensesWithoutDoc: 0,
      docPercentage: 100,
      // Donants
      totalDonors: 0,
      donorsWithTaxId: 0,
      donorsWithoutTaxId: 0,
      donorPercentage: 100,
      // Projectes
      totalProjects: 0,
      projectsWithTransactions: 0,
      // Categories
      transactionsWithCategory: 0,
      transactionsWithoutCategory: 0,
      categoryPercentage: 100,
    };

    if (transactions) {
      const expenses = transactions.filter(tx => tx.amount < 0);
      stats.totalExpenses = expenses.length;
      stats.expensesWithDoc = expenses.filter(tx => tx.document).length;
      stats.expensesWithoutDoc = expenses.filter(tx => !tx.document).length;
      stats.docPercentage = stats.totalExpenses > 0 
        ? Math.round((stats.expensesWithDoc / stats.totalExpenses) * 100) 
        : 100;

      stats.transactionsWithCategory = transactions.filter(tx => tx.category).length;
      stats.transactionsWithoutCategory = transactions.filter(tx => !tx.category).length;
      stats.categoryPercentage = transactions.length > 0
        ? Math.round((stats.transactionsWithCategory / transactions.length) * 100)
        : 100;
    }

    if (contacts) {
      const donors = contacts.filter(c => c.type === 'donor') as Donor[];
      stats.totalDonors = donors.length;
      stats.donorsWithTaxId = donors.filter(d => d.taxId && d.taxId.trim() !== '').length;
      stats.donorsWithoutTaxId = donors.filter(d => !d.taxId || d.taxId.trim() === '').length;
      stats.donorPercentage = stats.totalDonors > 0
        ? Math.round((stats.donorsWithTaxId / stats.totalDonors) * 100)
        : 100;
    }

    if (projects && transactions) {
      stats.totalProjects = projects.length;
      const projectsWithTx = new Set(transactions.filter(tx => tx.projectId).map(tx => tx.projectId));
      stats.projectsWithTransactions = projectsWithTx.size;
    }

    return stats;
  }, [transactions, contacts, projects]);

  // ═══════════════════════════════════════════════════════════════════════════
  // INDICADORS DE SALUT
  // ═══════════════════════════════════════════════════════════════════════════
  const healthIndicators: HealthIndicator[] = React.useMemo(() => {
    const getBalanceStatus = (): HealthStatus => {
      if (financials.balance > 0) return 'good';
      if (financials.balance > -1000) return 'warning';
      return 'critical';
    };

    const getDocStatus = (): HealthStatus => {
      if (healthStats.docPercentage >= 90) return 'good';
      if (healthStats.docPercentage >= 70) return 'warning';
      return 'critical';
    };

    const getDonorStatus = (): HealthStatus => {
      if (healthStats.donorPercentage >= 95) return 'good';
      if (healthStats.donorPercentage >= 80) return 'warning';
      return 'critical';
    };

    const getCategoryStatus = (): HealthStatus => {
      if (healthStats.categoryPercentage >= 90) return 'good';
      if (healthStats.categoryPercentage >= 70) return 'warning';
      return 'critical';
    };

    const orgSlug = organization?.slug;

    return [
      {
        title: 'Tresoreria',
        value: formatCurrency(financials.balance),
        status: getBalanceStatus(),
        description: financials.balance >= 0 
          ? 'Balanç positiu' 
          : 'Balanç negatiu',
        icon: Wallet,
      },
      {
        title: 'Justificants',
        value: `${healthStats.docPercentage}%`,
        status: getDocStatus(),
        description: healthStats.expensesWithoutDoc > 0
          ? `${healthStats.expensesWithoutDoc} despeses pendents`
          : 'Tot documentat',
        icon: FileCheck,
        href: `/${orgSlug}/dashboard/movimientos`,
      },
      {
        title: 'Donants',
        value: `${healthStats.totalDonors}`,
        status: getDonorStatus(),
        description: healthStats.donorsWithoutTaxId > 0
          ? `${healthStats.donorsWithoutTaxId} sense DNI/CIF`
          : 'Tots amb dades fiscals',
        icon: Users,
        href: `/${orgSlug}/dashboard/donants`,
      },
      {
        title: 'Classificació',
        value: `${healthStats.categoryPercentage}%`,
        status: getCategoryStatus(),
        description: healthStats.transactionsWithoutCategory > 0
          ? `${healthStats.transactionsWithoutCategory} sense categoria`
          : 'Tot classificat',
        icon: FolderKanban,
        href: `/${orgSlug}/dashboard/movimientos`,
      },
    ];
  }, [financials, healthStats, organization]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TASQUES PENDENTS
  // ═══════════════════════════════════════════════════════════════════════════
  const pendingTasks: PendingTask[] = React.useMemo(() => {
    const tasks: PendingTask[] = [];
    const currentMonth = getCurrentMonth();
    const orgSlug = organization?.slug;
    if (!orgSlug) return [];

    // 1. Despeses sense justificant
    if (healthStats.expensesWithoutDoc > 0) {
      tasks.push({
        id: 'missing-docs',
        type: 'document',
        priority: healthStats.expensesWithoutDoc > 10 ? 'high' : 'medium',
        title: 'Despeses sense justificant',
        description: `${healthStats.expensesWithoutDoc} despeses necessiten documentació`,
        count: healthStats.expensesWithoutDoc,
        href: `/${orgSlug}/dashboard/movimientos`,
        actionLabel: 'Revisar',
      });
    }

    // 2. Donants sense DNI/CIF
    if (healthStats.donorsWithoutTaxId > 0) {
      tasks.push({
        id: 'donors-no-taxid',
        type: 'donor',
        priority: currentMonth === 1 || currentMonth === 12 ? 'high' : 'medium',
        title: 'Donants sense DNI/CIF',
        description: `${healthStats.donorsWithoutTaxId} donants no podran rebre certificat fiscal`,
        count: healthStats.donorsWithoutTaxId,
        href: `/${orgSlug}/dashboard/donants`,
        actionLabel: 'Completar',
      });
    }

    // 3. Moviments sense categoria
    if (healthStats.transactionsWithoutCategory > 0) {
      tasks.push({
        id: 'uncategorized',
        type: 'category',
        priority: healthStats.transactionsWithoutCategory > 20 ? 'high' : 'low',
        title: 'Moviments sense classificar',
        description: `${healthStats.transactionsWithoutCategory} moviments pendents de categoria`,
        count: healthStats.transactionsWithoutCategory,
        href: `/${orgSlug}/dashboard/movimientos`,
        actionLabel: 'Classificar',
      });
    }

    // 4. Alertes fiscals contextuals
    if (currentMonth === 1) {
      // Gener: Model 182
      tasks.push({
        id: 'model-182',
        type: 'fiscal',
        priority: 'high',
        title: 'Model 182 - Gener',
        description: 'És moment de preparar la declaració de donatius',
        href: `/${orgSlug}/dashboard/informes`,
        actionLabel: 'Preparar',
      });
    }

    if (currentMonth === 12) {
      // Desembre: Certificats de donació
      tasks.push({
        id: 'certificates',
        type: 'fiscal',
        priority: 'medium',
        title: 'Certificats de donació',
        description: 'Prepara els certificats fiscals pels donants',
        href: `/${orgSlug}/dashboard/informes/certificats`,
        actionLabel: 'Generar',
      });
    }

    // Ordenar per prioritat
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [healthStats, organization]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS DE RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  const getStatusColor = (status: HealthStatus) => {
    switch (status) {
      case 'good': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
    }
  };

  const getStatusIcon = (status: HealthStatus) => {
    switch (status) {
      case 'good': return CheckCircle2;
      case 'warning': return AlertCircle;
      case 'critical': return AlertCircle;
    }
  };

  const getPriorityBadge = (priority: PendingTask['priority']) => {
    switch (priority) {
      case 'high': return <Badge variant="destructive">Urgent</Badge>;
      case 'medium': return <Badge variant="secondary">Pendent</Badge>;
      case 'low': return <Badge variant="outline">Opcional</Badge>;
    }
  };

  const getTaskIcon = (type: PendingTask['type']) => {
    switch (type) {
      case 'document': return FileText;
      case 'donor': return UserX;
      case 'project': return FolderX;
      case 'fiscal': return CalendarClock;
      case 'category': return Sparkles;
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t.dashboard.title}</h1>
        <p className="text-muted-foreground">{t.dashboard.description}</p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          INDICADORS DE SALUT
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {healthIndicators.map((indicator) => {
          const StatusIcon = getStatusIcon(indicator.status);
          const content = (
            <Card className={`transition-all hover:shadow-md ${indicator.href ? 'cursor-pointer' : ''}`}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{indicator.title}</p>
                    <p className="text-2xl font-bold">{indicator.value}</p>
                    <div className="flex items-center gap-1.5">
                      <StatusIcon className={`h-4 w-4 ${
                        indicator.status === 'good' ? 'text-green-600' :
                        indicator.status === 'warning' ? 'text-orange-600' : 'text-red-600'
                      }`} />
                      <span className="text-xs text-muted-foreground">{indicator.description}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-full ${getStatusColor(indicator.status)}`}>
                    <indicator.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );

          return indicator.href ? (
            <Link key={indicator.title} href={indicator.href}>
              {content}
            </Link>
          ) : (
            <div key={indicator.title}>{content}</div>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECCIÓ PRINCIPAL: Tasques + Resum Financer
          ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tasques Pendents - 2 columnes */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  Tasques pendents
                </CardTitle>
                <CardDescription>
                  {pendingTasks.length === 0 
                    ? '🎉 Tot al dia!' 
                    : `${pendingTasks.length} tasques requereixen atenció`
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-green-50 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <p className="font-medium">Excel·lent!</p>
                <p className="text-sm text-muted-foreground">No tens tasques pendents</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTasks.map((task) => {
                  const TaskIcon = getTaskIcon(task.type);
                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          task.priority === 'high' ? 'bg-red-50 text-red-600' :
                          task.priority === 'medium' ? 'bg-orange-50 text-orange-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          <TaskIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{task.title}</p>
                            {getPriorityBadge(task.priority)}
                          </div>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        </div>
                      </div>
                      <Link href={task.href}>
                        <Button variant="ghost" size="sm">
                          {task.actionLabel}
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resum Financer - 1 columna */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
              Resum financer
            </CardTitle>
            <CardDescription>Any {getCurrentYear()}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Ingressos */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-green-50">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm">Ingressos</span>
              </div>
              <span className="font-mono font-medium text-green-600">
                {formatCurrency(financials.income)}
              </span>
            </div>

            {/* Despeses */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-full bg-red-50">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm">Despeses</span>
              </div>
              <span className="font-mono font-medium">
                {formatCurrency(financials.expenses)}
              </span>
            </div>

            {/* Separador */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Balanç</span>
                <span className={`font-mono font-bold text-lg ${
                  financials.balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatCurrency(financials.balance)}
                </span>
              </div>
            </div>

            {/* Progress bar visual */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Despeses vs Ingressos</span>
                <span>{financials.income > 0 ? Math.round((Math.abs(financials.expenses) / financials.income) * 100) : 0}%</span>
              </div>
              <Progress 
                value={financials.income > 0 ? Math.min((Math.abs(financials.expenses) / financials.income) * 100, 100) : 0} 
                className="h-2"
              />
            </div>

            {/* Enllaç a moviments */}
            <div className="pt-2">
              <Link href={`/${organization?.slug}/dashboard/movimientos`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Receipt className="mr-2 h-4 w-4" />
                  Veure moviments
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ACCIONS RÀPIDES
          ═══════════════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Accions ràpides</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Link href={`/${organization?.slug}/dashboard/movimientos`}>
              <Button variant="outline" size="sm">
                <Receipt className="mr-2 h-4 w-4" />
                Importar extracte
              </Button>
            </Link>
            <Link href={`/${organization?.slug}/dashboard/donants`}>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" />
                Afegir donant
              </Button>
            </Link>
            <Link href={`/${organization?.slug}/dashboard/projectes`}>
              <Button variant="outline" size="sm">
                <FolderKanban className="mr-2 h-4 w-4" />
                Nou projecte
              </Button>
            </Link>
            <Link href={`/${organization?.slug}/dashboard/informes`}>
              <Button variant="outline" size="sm">
                <FileText className="mr-2 h-4 w-4" />
                Generar informe
              </Button>
            </Link>
            <Link href={`/${organization?.slug}/dashboard/informes/certificats`}>
              <Button variant="outline" size="sm">
                <FileCheck className="mr-2 h-4 w-4" />
                Certificats donació
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
