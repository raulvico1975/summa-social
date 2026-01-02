import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowRight } from 'lucide-react';
import {
  PUBLIC_LOCALES,
  isValidPublicLocale,
  generatePublicPageMetadata,
  type PublicLocale,
} from '@/lib/public-locale';
import { getPublicTranslations } from '@/i18n/public';

const BASE_URL = 'https://summasocial.app';

interface PageProps {
  params: Promise<{ lang: string }>;
}

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidPublicLocale(lang)) return {};

  const t = getPublicTranslations(lang);
  const seoMeta = generatePublicPageMetadata(lang, '');

  return {
    title: t.home.metaTitle,
    description: t.home.metaDescription,
    ...seoMeta,
  };
}

// Section anchors per locale
const SECTION_ANCHORS: Record<
  PublicLocale,
  {
    solves: string;
    conciliation: string;
    remittances: string;
    onlineDonations: string;
    fiscalCertificates: string;
    invoicesSepa: string;
    ticketsSettlements: string;
    projects: string;
  }
> = {
  ca: {
    solves: 'que-resol-summa-social',
    conciliation: 'conciliacio-bancaria',
    remittances: 'remeses-devolucions',
    onlineDonations: 'donacions-online',
    fiscalCertificates: 'fiscalitat-certificats',
    invoicesSepa: 'despeses-pagaments-sepa',
    ticketsSettlements: 'tiquets-liquidacions',
    projects: 'modul-projectes',
  },
  es: {
    solves: 'que-resuelve-summa-social',
    conciliation: 'conciliacion-bancaria',
    remittances: 'remesas-devoluciones',
    onlineDonations: 'donaciones-online',
    fiscalCertificates: 'fiscalidad-certificados',
    invoicesSepa: 'gastos-pagos-sepa',
    ticketsSettlements: 'tickets-liquidaciones',
    projects: 'modulo-proyectos',
  },
  fr: {
    solves: 'que-resout-summa-social',
    conciliation: 'rapprochement-bancaire',
    remittances: 'prelevements-rejets',
    onlineDonations: 'dons-en-ligne',
    fiscalCertificates: 'fiscalite-certificats',
    invoicesSepa: 'factures-sepa',
    ticketsSettlements: 'tickets-notes-frais',
    projects: 'module-projets',
  },
  pt: {
    solves: 'que-resolve-summa-social',
    conciliation: 'reconciliacao-bancaria',
    remittances: 'remessas-devolucoes',
    onlineDonations: 'doacoes-online',
    fiscalCertificates: 'fiscalidade-certificados',
    invoicesSepa: 'faturas-sepa',
    ticketsSettlements: 'tickets-liquidacoes',
    projects: 'modulo-projetos',
  },
};

// Features page path per locale
const FEATURES_PATH: Record<PublicLocale, string> = {
  ca: 'funcionalitats',
  es: 'funcionalitats',
  fr: 'fonctionnalites',
  pt: 'funcionalidades',
};

export default async function HomePage({ params }: PageProps) {
  const { lang } = await params;

  if (!isValidPublicLocale(lang)) {
    notFound();
  }

  const locale = lang as PublicLocale;
  const t = getPublicTranslations(locale);
  const anchors = SECTION_ANCHORS[locale];
  const featuresPath = FEATURES_PATH[locale];

  return (
    <main className="flex min-h-screen flex-col">
      <a
        href={`#${anchors.solves}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
      >
        {t.home.skipToContent}
      </a>

      {/* Hero */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-16">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <Logo className="h-16 w-16 mx-auto text-primary" />

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t.common.appName}</h1>

          <p className="text-lg text-muted-foreground">{t.home.heroTagline}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg">
              <Link href="/login">
                {t.common.enter}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/${featuresPath}`}>{t.common.features}</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/${locale}/contact`}>{t.common.contact}</Link>
            </Button>
          </div>

          <nav aria-label={t.home.skipToContent} className="pt-8">
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={`#${anchors.conciliation}`}>{t.home.nav.conciliation}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`#${anchors.remittances}`}>{t.home.nav.remittances}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`#${anchors.onlineDonations}`}>{t.home.nav.onlineDonations}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`#${anchors.fiscalCertificates}`}>{t.home.nav.fiscalCertificates}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`#${anchors.invoicesSepa}`}>{t.home.nav.invoicesSepa}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`#${anchors.ticketsSettlements}`}>{t.home.nav.ticketsSettlements}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`#${anchors.projects}`}>{t.home.nav.projects}</Link>
              </Button>
            </div>
          </nav>
        </div>
      </div>

      {/* Què resol Summa Social? */}
      <section id={anchors.solves} className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.solves.title}</h2>

          <div className="mt-6 space-y-4 text-muted-foreground">
            <p>
              <strong>{t.home.solves.intro}</strong>
            </p>
            <p>
              <strong>{t.home.solves.conciliation.split(':')[0]}:</strong>
              {t.home.solves.conciliation.split(':').slice(1).join(':')}
            </p>
            <p>
              <strong>{t.home.solves.fiscal.split(':')[0]}:</strong>
              {t.home.solves.fiscal.split(':').slice(1).join(':')}
            </p>
            <p>
              <strong>{t.home.solves.remittances.split(':')[0]}:</strong>
              {t.home.solves.remittances.split(':').slice(1).join(':')}
            </p>
            <p>
              <strong>{t.home.solves.vision.split(':')[0]}:</strong>
              {t.home.solves.vision.split(':').slice(1).join(':')}
            </p>
            <p>
              <strong>{t.home.solves.control.split(':')[0]}:</strong>
              {t.home.solves.control.split(':').slice(1).join(':')}
            </p>
            <p>
              <strong>{t.home.solves.result.split(':')[0]}:</strong>
              {t.home.solves.result.split(':').slice(1).join(':')}
            </p>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 1. Conciliació bancària */}
      <section id={anchors.conciliation} className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.sections.conciliation.title}</h2>
          <div className="mt-6 text-muted-foreground">
            <p>{t.home.sections.conciliation.description}</p>
            <div className="pt-4">
              <Button
                variant="link"
                asChild
                className="px-0 text-sm font-medium text-primary hover:underline"
              >
                <Link href={`/${locale}/${featuresPath}#${anchors.conciliation}`}>
                  {t.home.readMore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 2. Remeses i devolucions */}
      <section id={anchors.remittances} className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.sections.remittances.title}</h2>
          <div className="mt-6 text-muted-foreground">
            <p>{t.home.sections.remittances.description}</p>
            <div className="pt-4">
              <Button
                variant="link"
                asChild
                className="px-0 text-sm font-medium text-primary hover:underline"
              >
                <Link href={`/${locale}/${featuresPath}#${anchors.remittances}`}>
                  {t.home.readMore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 3. Donacions online */}
      <section id={anchors.onlineDonations} className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.sections.onlineDonations.title}</h2>
          <div className="mt-6 text-muted-foreground">
            <p>{t.home.sections.onlineDonations.description}</p>
            <div className="pt-4">
              <Button
                variant="link"
                asChild
                className="px-0 text-sm font-medium text-primary hover:underline"
              >
                <Link href={`/${locale}/${featuresPath}#${anchors.onlineDonations}`}>
                  {t.home.readMore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 4. Fiscalitat i certificats */}
      <section id={anchors.fiscalCertificates} className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.sections.fiscalCertificates.title}</h2>
          <div className="mt-6 text-muted-foreground">
            <p>{t.home.sections.fiscalCertificates.description}</p>
            <div className="pt-4">
              <Button
                variant="link"
                asChild
                className="px-0 text-sm font-medium text-primary hover:underline"
              >
                <Link href={`/${locale}/${featuresPath}#${anchors.fiscalCertificates}`}>
                  {t.home.readMore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 5. Factures i SEPA */}
      <section id={anchors.invoicesSepa} className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.sections.invoicesSepa.title}</h2>
          <div className="mt-6 text-muted-foreground">
            <p>{t.home.sections.invoicesSepa.description}</p>
            <div className="pt-4">
              <Button
                variant="link"
                asChild
                className="px-0 text-sm font-medium text-primary hover:underline"
              >
                <Link href={`/${locale}/${featuresPath}#${anchors.invoicesSepa}`}>
                  {t.home.readMore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 6. Tiquets i liquidacions */}
      <section id={anchors.ticketsSettlements} className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.sections.ticketsSettlements.title}</h2>
          <div className="mt-6 text-muted-foreground">
            <p>{t.home.sections.ticketsSettlements.description}</p>
            <div className="pt-4">
              <Button
                variant="link"
                asChild
                className="px-0 text-sm font-medium text-primary hover:underline"
              >
                <Link href={`/${locale}/${featuresPath}#${anchors.ticketsSettlements}`}>
                  {t.home.readMore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Separator className="max-w-3xl mx-auto" />

      {/* 7. Mòdul de Projectes */}
      <section id={anchors.projects} className="bg-muted/30 px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-semibold">{t.home.sections.projects.title}</h2>
          <div className="mt-6 text-muted-foreground">
            <p>{t.home.sections.projects.description}</p>
            <div className="pt-4">
              <Button
                variant="link"
                asChild
                className="px-0 text-sm font-medium text-primary hover:underline"
              >
                <Link href={`/${locale}/${featuresPath}#${anchors.projects}`}>
                  {t.home.readMore}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 px-4 mt-12">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <Link href={`/${locale}/${featuresPath}`} className="hover:underline">
            {t.common.features}
          </Link>
          <span>·</span>
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
