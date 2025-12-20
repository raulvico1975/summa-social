// src/app/[orgSlug]/dashboard/project-module/projects/new/page.tsx
// Crear nou projecte

'use client';

import { ProjectForm } from '@/components/project-module/project-form';

export default function NewProjectPage() {
  return <ProjectForm mode="create" />;
}
