import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * Alias per FR: /fonctionnalites → /funcionalitats
 * Només redirigeix per francès
 */
export default async function RedirectFonctionnalites({ params }: PageProps) {
  const { lang } = await params;

  // Només redirigir per fr
  if (lang === 'fr') {
    redirect(`/${lang}/funcionalitats`);
  }

  // Per ca/es/pt, aquesta ruta no té sentit
  notFound();
}
