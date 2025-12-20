// src/app/[orgSlug]/dashboard/project-module/projects/[projectId]/edit/page.tsx
// Editar projecte existent

'use client';

import { useParams } from 'next/navigation';
import { useProjectDetail } from '@/hooks/use-project-module';
import { ProjectForm } from '@/components/project-module/project-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useOrgUrl } from '@/hooks/organization-provider';

export default function EditProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const { buildUrl } = useOrgUrl();

  const { project, isLoading, error } = useProjectDetail(projectId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-64" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-destructive font-medium">Error carregant projecte</p>
        <p className="text-muted-foreground text-sm">
          {error?.message ?? 'Projecte no trobat'}
        </p>
        <Link href={buildUrl('/dashboard/project-module/projects')}>
          <Button variant="outline">Tornar a projectes</Button>
        </Link>
      </div>
    );
  }

  return <ProjectForm project={project} mode="edit" />;
}
