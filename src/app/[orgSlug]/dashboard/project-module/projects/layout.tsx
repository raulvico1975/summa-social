'use client';

import * as React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
import { useTranslations } from '@/i18n';

interface ProjectsLayoutProps {
  children: React.ReactNode;
}

export default function ProjectsLayout({ children }: ProjectsLayoutProps) {
  const { can } = usePermissions();
  const { tr } = useTranslations();

  if (!can('projectes.manage')) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>{tr('projectModule.projects.restrictedTitle')}</CardTitle>
            <CardDescription>
              {tr('projectModule.projects.restrictedDescription')}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
