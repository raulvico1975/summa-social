// src/app/[orgSlug]/dashboard/project-module/quick-expense/page.tsx
// Redirect a la ruta curta /q (landing sense dashboard header)

import { redirect } from 'next/navigation';

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function QuickExpenseRedirect({ params }: PageProps) {
  const { orgSlug } = await params;
  redirect(`/${orgSlug}/q`);
}
