import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PUBLIC_LOCALES, isValidPublicLocale, type PublicLocale } from '@/lib/public-locale';

/**
 * Genera els params estàtics per a totes les pàgines públiques [lang].
 * Això permet SSG per ca/es/fr/pt.
 */
export function generateStaticParams() {
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

interface PublicLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

/**
 * Layout per a les pàgines públiques amb suport multi-idioma.
 * Valida que el paràmetre `lang` sigui un idioma suportat.
 */
export default async function PublicLayout({ children, params }: PublicLayoutProps) {
  const { lang } = await params;

  // Validar que l'idioma sigui suportat
  if (!isValidPublicLocale(lang)) {
    notFound();
  }

  return (
    <html lang={lang}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
