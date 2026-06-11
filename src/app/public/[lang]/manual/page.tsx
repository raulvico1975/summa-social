import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BookOpen, ExternalLink } from 'lucide-react';
import { ManualMarkdownDocument } from '@/components/help/ManualMarkdownDocument';
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_WIDE_SHELL } from '@/components/public/public-shell';
import { Button } from '@/components/ui/button';
import { type PublicLocale } from '@/lib/public-locale';

const PUBLIC_MANUAL_LOCALES = ['ca', 'es'] as const;
type PublicManualLocale = (typeof PUBLIC_MANUAL_LOCALES)[number];

const MANUAL_COPY: Record<
  PublicManualLocale,
  {
    title: string;
    description: string;
    eyebrow: string;
    subtitle: string;
    openMarkdown: string;
    toc: string;
    backToTop: string;
  }
> = {
  ca: {
    title: "Manual d'usuari de Summa Social",
    description:
      "Consulta el manual d'usuari de Summa Social en català: processos, pantalles i resolució de dubtes habituals.",
    eyebrow: 'Manual',
    subtitle:
      "Guia completa per consultar processos de Summa Social sense sortir de la documentació oficial.",
    openMarkdown: 'Obrir Markdown',
    toc: 'Continguts',
    backToTop: 'Tornar a dalt',
  },
  es: {
    title: 'Manual de usuario de Summa Social',
    description:
      'Consulta el manual de usuario de Summa Social en castellano: procesos, pantallas y resolución de dudas habituales.',
    eyebrow: 'Manual',
    subtitle:
      'Guía completa para consultar procesos de Summa Social sin salir de la documentación oficial.',
    openMarkdown: 'Abrir Markdown',
    toc: 'Contenidos',
    backToTop: 'Volver arriba',
  },
};

function isPublicManualLocale(lang: string): lang is PublicManualLocale {
  return PUBLIC_MANUAL_LOCALES.includes(lang as PublicManualLocale);
}

async function readManual(locale: PublicManualLocale) {
  const manualPath = join(
    process.cwd(),
    'public',
    'docs',
    `manual-usuari-summa-social.${locale}.md`
  );
  return readFile(manualPath, 'utf8');
}

export function generateStaticParams() {
  return PUBLIC_MANUAL_LOCALES.map((lang) => ({ lang }));
}

interface PageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isPublicManualLocale(lang)) return {};

  const copy = MANUAL_COPY[lang];

  return {
    title: `${copy.title} | Summa Social`,
    description: copy.description,
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `https://summasocial.app/${lang}/manual`,
      languages: {
        ca: 'https://summasocial.app/ca/manual',
        es: 'https://summasocial.app/es/manual',
      },
    },
  };
}

export default async function PublicManualPage({ params }: PageProps) {
  const { lang } = await params;

  if (!isPublicManualLocale(lang)) {
    notFound();
  }

  const locale = lang;
  const copy = MANUAL_COPY[locale];
  const markdown = await readManual(locale);
  const rawManualHref = `/docs/manual-usuari-summa-social.${locale}.md`;

  return (
    <main id="top" className="min-h-screen bg-background">
      <PublicSiteHeader locale={locale as PublicLocale} />

      <section className="border-b bg-muted/20 py-10">
        <div className={`${PUBLIC_WIDE_SHELL} space-y-5`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-[0.18em] text-primary/85">
                <BookOpen className="h-4 w-4" />
                {copy.eyebrow}
              </p>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">{copy.title}</h1>
              <p className="text-base leading-7 text-muted-foreground">{copy.subtitle}</p>
            </div>

            <Button asChild variant="outline" size="sm">
              <Link href={rawManualHref} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {copy.openMarkdown}
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-4xl px-6">
          <ManualMarkdownDocument
            markdown={markdown}
            tocLabel={copy.toc}
            backToTopLabel={copy.backToTop}
          />
        </div>
      </section>

      <PublicSiteFooter locale={locale as PublicLocale} />
    </main>
  );
}
