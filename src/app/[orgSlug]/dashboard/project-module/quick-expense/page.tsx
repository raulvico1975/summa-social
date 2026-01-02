// src/app/[orgSlug]/dashboard/project-module/quick-expense/page.tsx
// Redirect 307 per bookmarks antics → nova ruta canònica

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function QuickExpenseRedirect({ params }: PageProps) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/quick-expense`);
}
