// src/app/[orgSlug]/dashboard/project-module/projects/page.tsx
// Llistat de projectes del mòdul

'use client';

import * as React from 'react';
import Link from 'next/link';
import { useProjects } from '@/hooks/use-project-module';
import { useOrgUrl } from '@/hooks/organization-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Plus, FolderKanban, Calendar, Euro } from 'lucide-react';
import type { Project } from '@/lib/project-module-types';

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

function ProjectCard({ project }: { project: Project }) {
  const { buildUrl } = useOrgUrl();

  return (
    <Card className="hover:border-primary/50 transition-colors">
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

        {project.budgetEUR !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Euro className="h-4 w-4 text-muted-foreground" />
            <span>Pressupost: {formatAmount(project.budgetEUR)}</span>
          </div>
        )}

        <div className="pt-2">
          <Link href={buildUrl(`/dashboard/project-module/projects/${project.id}/edit`)}>
            <Button variant="outline" size="sm" className="w-full">
              Editar projecte
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
      {isLoading ? (
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
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
