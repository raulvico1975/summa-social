import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * Alias ES/PT: /contacto → /contact
 */
export default async function RedirectContacto({ params }: PageProps) {
  const { lang } = await params;

  if (lang === 'es' || lang === 'pt') {
    redirect(`/${lang}/contact`);
  }

  notFound();
}
