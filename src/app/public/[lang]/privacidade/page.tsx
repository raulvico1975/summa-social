import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * Alias PT: /privacidade → /privacy
 */
export default async function RedirectPrivacidade({ params }: PageProps) {
  const { lang } = await params;

  if (lang === 'pt') {
    redirect(`/${lang}/privacy`);
  }

  notFound();
}
