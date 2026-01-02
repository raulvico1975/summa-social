// src/app/public/[lang]/novetats/[slug]/page.tsx
// Pàgina de detall d'una novetat
// Llegeix de public/novetats-data.json (NO Firestore directe)
// Render text estructurat (NO HTML)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  PUBLIC_LOCALES,
  isValidPublicLocale,
  generatePublicPageMetadata,
  type PublicLocale,
} from '@/lib/public-locale';
import { getPublicTranslations } from '@/i18n/public';
import { renderStructuredText } from '@/lib/render-structured-text';

// Tipus del JSON estàtic
interface WebUpdate {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  publishedAt: string | null;
}

interface NovetatsData {
  updates: WebUpdate[];
  generatedAt: string;
}

// Carregar dades del JSON estàtic
async function getUpdatesData(): Promise<NovetatsData | null> {
  try {
    // Llegir fitxer local (build time i runtime)
    const fs = await import('fs/promises');
    const path = await import('path');
    const filePath = path.join(process.cwd(), 'public', 'novetats-data.json');
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as NovetatsData;
  } catch {
    return null;
  }
}

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

export function generateStaticParams() {
  // Genera combinacions lang + slug
  // Com que no podem accedir al JSON en build time fàcilment,
  // deixem que Next.js generi les pàgines on-demand
  return PUBLIC_LOCALES.map((lang) => ({ lang, slug: '' }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isValidPublicLocale(lang)) return {};

  const data = await getUpdatesData();
  const update = data?.updates.find((u) => u.slug === slug);
  if (!update) return {};

  const seoMeta = generatePublicPageMetadata(lang, `/novetats/${slug}`);

  return {
    title: `${update.title} | Summa Social`,
    description: update.excerpt || update.title,
    ...seoMeta,
  };
}

export default async function NovetatsDetailPage({ params }: PageProps) {
  const { lang, slug } = await params;

  if (!isValidPublicLocale(lang)) {
    notFound();
  }

  const locale = lang as PublicLocale;
  const t = getPublicTranslations(locale);
  const data = await getUpdatesData();
  const update = data?.updates.find((u) => u.slug === slug);

  if (!update) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Button asChild variant="ghost" size="sm">
            <Link href={`/${locale}/novetats`}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.updates.back}
            </Link>
          </Button>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-6 py-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-4">{update.title}</h1>
          {update.publishedAt && (
            <p className="text-sm text-muted-foreground">
              {t.updates.publishedAt} {update.publishedAt}
            </p>
          )}
        </header>

        {update.excerpt && (
          <p className="text-lg text-muted-foreground mb-6 border-l-4 border-primary/20 pl-4">
            {update.excerpt}
          </p>
        )}

        {update.content && (
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            {renderStructuredText(update.content)}
          </div>
        )}
      </article>

      {/* Footer */}
      <footer className="border-t py-6 px-4 mt-auto">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href={`/${locale}/privacy`} className="hover:underline">
            {t.common.privacy}
          </Link>
          <span>·</span>
          <Link href={`/${locale}/contact`} className="hover:underline">
            {t.common.contact}
          </Link>
        </div>
      </footer>
    </main>
  );
}
