import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_SHELL_X, PUBLIC_WIDE_SHELL } from '@/components/public/public-shell';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import {
  PUBLIC_LOCALES,
  generatePublicPageMetadata,
  isValidPublicLocale,
  type PublicLocale,
} from '@/lib/public-locale';
import { getPublicTranslations } from '@/i18n/public';

interface PageProps {
  params: Promise<{ lang: string }>;
}

export function generateStaticParams() {
  return PUBLIC_LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidPublicLocale(lang)) return {};

  const locale = lang as PublicLocale;
  const t = getPublicTranslations(locale);
  const seoMeta = generatePublicPageMetadata(locale, '/preus');

  return {
    title: t.pricing.metaTitle,
    description: t.pricing.metaDescription,
    ...seoMeta,
  };
}

export default async function PricingPage({ params }: PageProps) {
  const { lang } = await params;

  if (!isValidPublicLocale(lang)) {
    notFound();
  }

  const locale = lang as PublicLocale;
  const t = getPublicTranslations(locale);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader locale={locale} currentSection="pricing" />

      <section className={`${PUBLIC_WIDE_SHELL} py-16 sm:py-20`}>
        <div className="max-w-3xl space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.pricing.navLabel}</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {t.pricing.title}
          </h1>
          <p className="text-lg leading-8 text-muted-foreground">{t.pricing.subtitle}</p>
        </div>
      </section>

      <section className={`${PUBLIC_WIDE_SHELL} pb-16`}>
        <div className="grid gap-5 lg:grid-cols-3">
          {t.pricing.plans.map((plan) => (
            <article
              key={plan.name}
              className="flex min-h-[18rem] flex-col justify-between rounded-lg border border-border/70 bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)]"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-semibold">{plan.name}</h2>
                  <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-primary" />
                </div>
                <p className="text-3xl font-semibold tracking-tight">{plan.price}</p>
                <p className="text-sm leading-6 text-muted-foreground">{plan.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${PUBLIC_SHELL_X} pb-20`}>
        <div className="mx-auto max-w-3xl">
          <div className="rounded-lg border border-border/70 bg-muted/35 p-6">
            <h2 className="text-lg font-semibold">{t.pricing.implantationTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.pricing.implantationText}</p>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl justify-center">
          <Button asChild size="lg">
            <Link href={`/${locale}/contact`}>{t.pricing.cta}</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
