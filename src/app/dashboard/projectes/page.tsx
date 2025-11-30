
'use client';

import { ProjectManager } from '@/components/project-manager';
import { useTranslations } from '@/i18n';

export default function ProjectsPage() {
  const { t } = useTranslations();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight font-headline">{t.projects.title}</h1>
        <p className="text-muted-foreground">{t.projects.description}</p>
      </div>
      <ProjectManager />
    </div>
  );
}
