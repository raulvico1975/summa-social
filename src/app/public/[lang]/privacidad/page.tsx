import { redirect } from 'next/navigation';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ lang: string }>;
}

/**
 * Alias ES: /privacidad → /privacy
 */
export default async function RedirectPrivacidad({ params }: PageProps) {
  const { lang } = await params;

  if (lang === 'es') {
    redirect(`/${lang}/privacy`);
  }

  notFound();
}
