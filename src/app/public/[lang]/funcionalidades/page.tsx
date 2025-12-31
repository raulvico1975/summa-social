import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * Alias per PT/ES: /funcionalidades → /funcionalitats
 * Només redirigeix per idiomes que usen "funcionalidades" (pt, es)
 */
export default async function RedirectFuncionalidades({ params }: PageProps) {
  const { lang } = await params;

  // Només redirigir per pt i es (que usen "funcionalidades")
  if (lang === 'pt' || lang === 'es') {
    redirect(`/${lang}/funcionalitats`);
  }

  // Per ca/fr, aquesta ruta no té sentit
  notFound();
}
