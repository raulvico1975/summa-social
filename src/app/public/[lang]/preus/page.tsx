import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { PUBLIC_SHELL_X, PUBLIC_WIDE_SHELL } from '@/components/public/public-shell';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
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

      <section className={`${PUBLIC_WIDE_SHELL} py-14 sm:py-20`}>
        <div className="max-w-4xl space-y-5">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">{t.pricing.navLabel}</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {t.pricing.title}
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-muted-foreground">{t.pricing.subtitle}</p>
          <div className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center">
            <Button asChild size="lg">
              <Link href={`/${locale}/contact`}>
                {t.pricing.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            {t.pricing.claim ? <p className="text-sm font-medium text-foreground">{t.pricing.claim}</p> : null}
          </div>
        </div>
      </section>

      <section className={`${PUBLIC_WIDE_SHELL} pb-10`}>
        <div className="grid gap-4 border-y border-border/70 py-6 lg:grid-cols-[1.1fr_1.4fr] lg:items-center">
          <div>
            <h2 className="text-xl font-semibold">{t.pricing.orientationTitle}</h2>
            {t.pricing.orientationText ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t.pricing.orientationText}</p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {t.pricing.orientationPoints.map((point) => (
              <div key={point} className="flex gap-2 text-sm leading-6 text-muted-foreground">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${PUBLIC_WIDE_SHELL} pb-16`}>
        <div className="grid gap-5 lg:grid-cols-3 lg:items-stretch">
          {t.pricing.plans.map((plan) => (
            <article
              key={plan.name}
              className={`flex min-h-[27rem] flex-col rounded-lg border bg-white p-6 shadow-[0_18px_50px_-38px_rgba(15,23,42,0.35)] ${
                plan.recommended
                  ? 'border-primary/45 ring-1 ring-primary/25 lg:-mt-4 lg:mb-4'
                  : 'border-border/70'
              }`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p
                      className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.recommended
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {plan.badge}
                    </p>
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                  </div>
                  <CheckCircle2
                    className={`mt-1 h-5 w-5 shrink-0 ${
                      plan.recommended ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight">{plan.price}</p>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{plan.description}</p>
                <ul className="mt-6 space-y-3 border-t border-border/60 pt-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm leading-6 text-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {plan.recommended ? (
                  <div className="mt-auto pt-6">
                    <Button asChild className="w-full">
                      <Link href={`/${locale}/contact`}>{t.pricing.cta}</Link>
                    </Button>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={`${PUBLIC_SHELL_X} pb-10`}>
        <div className="mx-auto grid max-w-4xl gap-5 rounded-lg border border-border/70 bg-muted/35 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-xl font-semibold">{t.pricing.implantationTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.pricing.implantationText}</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.pricing.implantationSubtext}</p>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{t.pricing.implantationPrice}</p>
        </div>
      </section>

      <section className={`${PUBLIC_SHELL_X} pb-20`}>
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight">{t.pricing.decisionTitle}</h2>
          {t.pricing.decisionText ? (
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{t.pricing.decisionText}</p>
          ) : null}
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl justify-center">
          <Button asChild size="lg">
            <Link href={`/${locale}/contact`}>
              {t.pricing.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
