// src/app/[orgSlug]/dashboard/project-module/page.tsx
// Redirect a la pàgina principal del mòdul de projectes

import { redirect } from 'next/navigation';

export default function ProjectModulePage() {
  redirect('./project-module/expenses');
}
