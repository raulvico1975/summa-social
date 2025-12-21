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
import { trackUX } from '@/lib/ux/trackUX';
import { collection, getDocs } from 'firebase/firestore';
import type { Project, ExpenseLink, ExpenseAssignment } from '@/lib/project-module-types';

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

interface ProjectCardProps {
  project: Project;
  executedAmount: number;
}

function ProjectCard({ project, executedAmount }: ProjectCardProps) {
  const { buildUrl } = useOrgUrl();
  const router = useRouter();

  // Càlculs econòmics
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
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">{project.name}</CardTitle>
          </div>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status === 'active' ? 'Actiu' : 'Tancat'}
          </Badge>
        </div>
        {project.code && (
          <CardDescription className="font-mono text-xs">
            {project.code}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Inici: {formatDate(project.startDate)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Fi: {formatDate(project.endDate)}</span>
          </div>
        </div>

        {/* Info econòmica */}
        <div className="grid grid-cols-3 gap-2 text-sm border-t pt-3">
          <div>
            <span className="text-muted-foreground text-xs block">Pressupostat</span>
            <span className="font-medium">{formatAmount(budgeted)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Executat</span>
            <span className="font-medium">{formatAmount(executedAmount)}</span>
          </div>
          <div>
            <span className="text-muted-foreground text-xs block">Pendent</span>
            <span className={`font-medium ${pending < 0 ? 'text-red-600' : ''}`}>
              {formatAmount(pending)}
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
              Gestió Econòmica
            </Button>
          </Link>
          <Link
            href={buildUrl(`/dashboard/project-module/expenses?projectId=${project.id}`)}
            onClick={handleViewExpensesClick}
          >
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link
            href={buildUrl(`/dashboard/project-module/projects/${project.id}/edit`)}
            onClick={handleEditClick}
          >
            <Button variant="ghost" size="sm">
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
            map.set(assignment.projectId, current + Math.abs(assignment.amountEUR));
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
        <p className="text-destructive font-medium">Error carregant projectes</p>
        <p className="text-muted-foreground text-sm">{error.message}</p>
        <Button onClick={refresh} variant="outline">
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projectes</h1>
          <p className="text-muted-foreground">
            Gestiona els projectes per assignar despeses
          </p>
        </div>
        <Link href={buildUrl('/dashboard/project-module/projects/new')}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nou projecte
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderKanban className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center mb-4">
              No hi ha projectes creats.<br />
              Crea el primer projecte per poder assignar despeses.
            </p>
            <Link href={buildUrl('/dashboard/project-module/projects/new')}>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Crear projecte
              </Button>
            </Link>
          </CardContent>
        </Card>
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
