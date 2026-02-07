// src/app/[orgSlug]/dashboard/project-module/projects/page.tsx
// Llistat de projectes del mòdul

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useProjects } from '@/hooks/use-project-module';
import { useOrgUrl, useCurrentOrganization } from '@/hooks/organization-provider';
import { useFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, FolderKanban, Calendar, Euro, Eye, Pencil } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { trackUX } from '@/lib/ux/trackUX';
import { useTranslations } from '@/i18n';
import { collection, getDocs } from 'firebase/firestore';
import type { Project, ExpenseAssignment } from '@/lib/project-module-types';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatAmount(amount: number | null): string {
  if (amount === null) return '-';
  return new Intl.NumberFormat('ca-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/** Format compacte sense símbol: "24.107,00" */
function formatAmountCompact(amount: number): string {
  return new Intl.NumberFormat('ca-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

interface ProjectCardProps {
  project: Project;
  executedAmount: number;
}

function ProjectCard({ project, executedAmount }: ProjectCardProps) {
  const { t, tr } = useTranslations();
  const { buildUrl } = useOrgUrl();
  const router = useRouter();

  // Càlculs econòmics (pressupost del projecte, sense carregar partides al llistat)
  const budgeted = project.budgetEUR ?? 0;
  const pending = budgeted - executedAmount;

  // Click en el card → navega a Gestió Econòmica
  const handleCardClick = () => {
    trackUX('projects.card.click', { projectId: project.id, projectName: project.name });
    router.push(buildUrl(`/dashboard/project-module/projects/${project.id}/budget`));
  };

  // Click en botó Gestió Econòmica
  const handleBudgetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackUX('projects.budget.click', { projectId: project.id, projectName: project.name });
  };

  // Click en botó Veure despeses
  const handleViewExpensesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackUX('projects.viewExpenses.click', { projectId: project.id, projectName: project.name });
  };

  // Click en botó Editar
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    trackUX('projects.edit.click', { projectId: project.id, projectName: project.name });
  };

  return (
    <Card
      className="hover:border-primary/50 transition-colors cursor-pointer"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {project.code && (
              <div className="text-xs font-mono text-muted-foreground">
                {project.code}
              </div>
            )}
            <CardTitle className="mt-0.5 text-sm font-medium truncate" title={project.name}>
              {project.name}
            </CardTitle>
          </div>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status === 'active' ? tr('projectModule.form.statusActive', 'Actiu') : tr('projectModule.form.statusClosed', 'Tancat')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Dates — línia compacta */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>{formatDate(project.startDate)} – {formatDate(project.endDate)}</span>
        </div>

        {/* Info econòmica — llista vertical etiqueta/valor */}
        <div className="border-t pt-3 space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">{tr('projectModule.budget', 'Pressupost')}</span>
            <span className="text-sm font-medium tabular-nums">{formatAmountCompact(budgeted)} €</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">{tr('projectModule.executed', 'Executat')}</span>
            <span className="text-sm font-medium tabular-nums">{formatAmountCompact(executedAmount)} €</span>
          </div>
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-muted-foreground">{tr('projectModule.pending', 'Pendent')}</span>
            <span className={`text-sm font-medium tabular-nums ${pending < 0 ? 'text-red-600' : ''}`}>
              {formatAmountCompact(pending)} €
            </span>
          </div>
        </div>

        <div className="pt-2 flex gap-2">
          <Link
            href={buildUrl(`/dashboard/project-module/projects/${project.id}/budget`)}
            className="flex-1"
            onClick={handleBudgetClick}
          >
            <Button variant="outline" size="sm" className="w-full">
              <Euro className="h-4 w-4 mr-1" />
              {tr('projectModule.budgetManagement', 'Gestió Econòmica')}
            </Button>
          </Link>
          <Link
            href={buildUrl(`/dashboard/project-module/expenses?projectId=${project.id}`)}
            onClick={handleViewExpensesClick}
          >
            <Button variant="ghost" size="sm" title={t.projectModule?.viewProjectExpenses ?? 'Veure despeses del projecte'}>
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link
            href={buildUrl(`/dashboard/project-module/projects/${project.id}/edit`)}
            onClick={handleEditClick}
          >
            <Button variant="ghost" size="sm" title={t.projectModule?.editProject ?? 'Editar projecte'}>
              <Pencil className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProjectsListPage() {
  const { projects, isLoading, error, refresh } = useProjects();
  const { buildUrl } = useOrgUrl();
  const { firestore } = useFirebase();
  const { organizationId } = useCurrentOrganization();
  const { t, tr } = useTranslations();

  // Carregar tots els expenseLinks per calcular execució per projecte
  const [executionByProject, setExecutionByProject] = React.useState<Map<string, number>>(new Map());
  const [linksLoading, setLinksLoading] = React.useState(true);

  React.useEffect(() => {
    if (!organizationId) return;

    const loadLinks = async () => {
      setLinksLoading(true);
      try {
        const linksRef = collection(
          firestore,
          'organizations',
          organizationId,
          'projectModule',
          '_',
          'expenseLinks'
        );
        const snapshot = await getDocs(linksRef);

        const map = new Map<string, number>();
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const assignments = data.assignments as ExpenseAssignment[] ?? [];
          for (const assignment of assignments) {
            const current = map.get(assignment.projectId) ?? 0;
            map.set(assignment.projectId, current + (assignment.amountEUR != null ? Math.abs(assignment.amountEUR) : 0));
          }
        }
        setExecutionByProject(map);
      } catch (err) {
        console.error('Error loading expense links:', err);
      } finally {
        setLinksLoading(false);
      }
    };

    loadLinks();
  }, [firestore, organizationId]);

  // Track page open
  React.useEffect(() => {
    trackUX('projects.open', { projectCount: projects.length });
  }, [projects.length]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">{tr('projectModule.errorLoadingProjects', 'Error carregant projectes')}</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button onClick={refresh} variant="outline">
          {tr('projectModule.retry', 'Reintentar')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tr('projectModule.projectsTitle', 'Projectes')}</h1>
          <p className="text-muted-foreground">
            {tr('projectModule.projectsDescription', 'Gestiona els projectes per assignar despeses')}
          </p>
        </div>
        <Link href={buildUrl('/dashboard/project-module/projects/new')}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {tr('projectModule.newProject', 'Nou projecte')}
          </Button>
        </Link>
      </div>

      {/* Llistat */}
      {isLoading || linksLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t.emptyStates?.projects?.noData ?? "Encara no hi ha projectes"}
          description={t.emptyStates?.projects?.noDataDesc ?? "Crea un projecte per poder assignar despeses i veure execució."}
        >
          <Link href={buildUrl('/dashboard/project-module/projects/new')}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.emptyStates?.projects?.addNew ?? "Crear projecte"}
            </Button>
          </Link>
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              executedAmount={executionByProject.get(project.id) ?? 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}
