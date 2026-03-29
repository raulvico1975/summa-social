'use client';

import * as React from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
import { useTranslations } from '@/i18n';

interface ProjectesLayoutProps {
  children: React.ReactNode;
}

export default function ProjectesLayout({ children }: ProjectesLayoutProps) {
  const { canAccessProjectsArea } = usePermissions();
  const { tr } = useTranslations();

  if (!canAccessProjectsArea) {
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
