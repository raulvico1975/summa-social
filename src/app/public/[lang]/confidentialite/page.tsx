import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * Alias FR: /confidentialite → /privacy
 */
export default async function RedirectConfidentialite({ params }: PageProps) {
  const { lang } = await params;

  if (lang === 'fr') {
    redirect(`/${lang}/privacy`);
  }

  notFound();
}
