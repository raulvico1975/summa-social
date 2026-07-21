// src/app/public/[lang]/novetats/[slug]/page.tsx
// Pàgina de detall d'una novetat
// Llegeix server-side de Firestore via Admin SDK
// Render text estructurat (NO HTML)

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CalendarDays } from 'lucide-react';
import { PUBLIC_SHELL_X } from '@/components/public/public-shell';
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { Button } from '@/components/ui/button';
import {
  isValidPublicLocale,
  generatePublicPageMetadata,
  type PublicLocale,
} from '@/lib/public-locale';
import { getPublicProductUpdateBySlug } from '@/lib/product-updates/public';
import { getPublicTranslations } from '@/i18n/public';
import { renderStructuredText } from '@/lib/render-structured-text';
import { getPublicFeaturesHref } from '@/lib/public-site-paths';
import { PublicJsonLd, buildPublicProductUpdateJsonLd } from '@/lib/public-seo';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ lang: string; slug: string }>;
}

const pageShellClass =
  'min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#ffffff_26%,#ffffff_100%)]';

const UPDATE_CTA_COPY: Record<PublicLocale, {
  eyebrow: string;
  title: string;
  description: string;
  primary: string;
  secondary: string;
}> = {
  ca: {
    eyebrow: 'Summa continua avançant',
    title: 'Vols veure com funcionaria a la teva entitat?',
    description: 'T’ensenyem una demo centrada en la vostra operativa real i en les tasques que més temps us ocupen.',
    primary: 'Demanar una demo',
    secondary: 'Veure funcionalitats',
  },
  es: {
    eyebrow: 'Summa sigue avanzando',
    title: '¿Quieres ver cómo funcionaría en tu entidad?',
    description: 'Te enseñamos una demo centrada en vuestra operativa real y en las tareas que más tiempo os ocupan.',
    primary: 'Pedir una demo',
    secondary: 'Ver funcionalidades',
  },
  fr: {
    eyebrow: 'Summa continue d’avancer',
    title: 'Vous souhaitez voir comment cela fonctionnerait dans votre organisation ?',
    description: 'Nous vous proposons une démo centrée sur votre fonctionnement réel et vos tâches les plus chronophages.',
    primary: 'Demander une démo',
    secondary: 'Voir les fonctionnalités',
  },
  pt: {
    eyebrow: 'A Summa continua a evoluir',
    title: 'Quer ver como funcionaria na sua organização?',
    description: 'Mostramos uma demo centrada na vossa operação real e nas tarefas que vos ocupam mais tempo.',
    primary: 'Pedir uma demo',
    secondary: 'Ver funcionalidades',
  },
};

export function generateStaticParams() {
  return [];
}

function formatPublicDate(value: string | null, locale: PublicLocale): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const localeMap: Record<PublicLocale, string> = {
    ca: 'ca-ES',
    es: 'es-ES',
    fr: 'fr-FR',
    pt: 'pt-PT',
  };

  return new Intl.DateTimeFormat(localeMap[locale], {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params;
  if (!isValidPublicLocale(lang)) return {};

  const update = await getPublicProductUpdateBySlug(slug, { locale: lang as PublicLocale });
  if (!update) return {};

  const title = `${update.title} | Summa Social`;
  const description = update.excerpt || update.title;
  const availableLocales: PublicLocale[] = ['ca', 'es'];
  const seoMeta = generatePublicPageMetadata(lang, `/novetats/${slug}`, {
    title,
    description,
    availableLocales,
    canonicalLocale: availableLocales.includes(lang) ? lang : 'es',
    index: availableLocales.includes(lang),
    openGraphType: 'article',
  });

  return {
    title,
    description,
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
  const update = await getPublicProductUpdateBySlug(slug, { locale });

  if (!update) {
    notFound();
  }

  const publishedAt = formatPublicDate(update.publishedAt, locale);
  const ctaCopy = UPDATE_CTA_COPY[locale];

  return (
    <>
      <PublicJsonLd
        data={buildPublicProductUpdateJsonLd({
          locale,
          slug: update.slug,
          updatesLabel: t.updates.navLabel,
          title: update.title,
          description: update.excerpt || update.title,
          publishedAt: update.publishedAt,
        })}
      />
      <main className={pageShellClass}>
        <PublicSiteHeader locale={locale} currentSection="updates" />

      <section className={`pb-10 pt-8 lg:pt-12 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-5xl">
          <Button asChild variant="ghost" size="sm" className="rounded-full px-4 text-muted-foreground hover:text-foreground">
            <Link href={`/${locale}/novetats`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t.updates.back}
            </Link>
          </Button>

          <div className="mt-6 space-y-5">
            {publishedAt && (
              <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-primary" />
                {publishedAt}
              </p>
            )}
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {update.title}
            </h1>
            {update.excerpt && (
              <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
                {update.excerpt}
              </p>
            )}
          </div>
        </div>
      </section>

      <section className={`pb-20 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-4xl space-y-8">
          <article className="rounded-[2rem] border border-border/60 bg-white/95 p-6 shadow-[0_28px_80px_-56px_rgba(15,23,42,0.22)] sm:p-10">
            {update.content ? (
              <div className="prose prose-neutral max-w-none text-base leading-8 prose-headings:tracking-tight prose-p:text-muted-foreground prose-li:text-muted-foreground">
                {renderStructuredText(update.content)}
              </div>
            ) : (
              <p className="text-base leading-7 text-muted-foreground">{update.excerpt}</p>
            )}
          </article>

          <aside className="rounded-[2rem] border border-sky-200/80 bg-[linear-gradient(135deg,rgba(14,165,233,0.14),rgba(255,255,255,0.98)_55%,rgba(240,249,255,0.95))] p-6 shadow-[0_28px_80px_-56px_rgba(14,165,233,0.38)] sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/85">
              {ctaCopy.eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {ctaCopy.title}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              {ctaCopy.description}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="rounded-full px-7">
                <Link href={`/${locale}/contact`}>
                  {ctaCopy.primary}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-7">
                <Link href={getPublicFeaturesHref(locale)}>{ctaCopy.secondary}</Link>
              </Button>
            </div>
          </aside>
        </div>
      </section>

        <PublicSiteFooter locale={locale} />
      </main>
    </>
  );
}
