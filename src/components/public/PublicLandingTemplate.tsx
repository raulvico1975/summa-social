import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import type { PublicLocale } from '@/lib/public-locale';
import type { PublicLandingContent } from '@/lib/public-landings';

interface PublicLandingTemplateProps {
  locale: PublicLocale;
  content: PublicLandingContent;
  labels: {
    backToHome: string;
    contact: string;
    privacy: string;
    appName: string;
  };
}

const UI_COPY: Record<
  PublicLocale,
  {
    fullCycle: string;
    problemEyebrow: string;
    solutionEyebrow: string;
    includesEyebrow: string;
    benefitsEyebrow: string;
    relatedGuide: string;
  }
> = {
  ca: {
    fullCycle: 'El cicle complet',
    problemEyebrow: 'Problema',
    solutionEyebrow: 'Com ho resol',
    includesEyebrow: 'Què inclou',
    benefitsEyebrow: 'Resultat operatiu',
    relatedGuide: 'Guia relacionada',
  },
  es: {
    fullCycle: 'El ciclo completo',
    problemEyebrow: 'Problema',
    solutionEyebrow: 'Cómo lo resuelve',
    includesEyebrow: 'Qué incluye',
    benefitsEyebrow: 'Resultado operativo',
    relatedGuide: 'Guía relacionada',
  },
  fr: {
    fullCycle: 'Le cycle complet',
    problemEyebrow: 'Problème',
    solutionEyebrow: 'Comment le résoudre',
    includesEyebrow: 'Ce qui est inclus',
    benefitsEyebrow: 'Résultat opérationnel',
    relatedGuide: 'Guide lié',
  },
  pt: {
    fullCycle: 'O ciclo completo',
    problemEyebrow: 'Problema',
    solutionEyebrow: 'Como resolve',
    includesEyebrow: 'O que inclui',
    benefitsEyebrow: 'Resultado operacional',
    relatedGuide: 'Guia relacionado',
  },
};

export function PublicLandingTemplate({ locale, content, labels }: PublicLandingTemplateProps) {
  const ui = UI_COPY[locale];
  const heroMedia = content.hero.media;
  const cards = content.visualProof?.items.slice(0, 3) ?? [];
  const relatedCases = content.relatedLandings?.items.slice(0, 4) ?? [];
  const videoThumbnailUrl =
    heroMedia?.type === 'video' ? heroMedia.poster ?? heroMedia.src : heroMedia?.src;

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      <PublicSiteHeader locale={locale} currentSection="features" />

      <main className="mx-auto max-w-[1400px] px-6 pb-32 pt-24 lg:px-12">
        <section className="mt-10 mb-20 grid gap-10 lg:mb-28 lg:grid-cols-[minmax(0,0.98fr)_minmax(360px,0.62fr)] lg:items-end">
          <div className="max-w-[800px]">
            <h1 className="mb-6 text-[56px] font-medium leading-[1.05] tracking-tighter text-gray-900 lg:text-[72px]">
              {content.hero.title}
            </h1>
            <p className="max-w-2xl text-xl font-light leading-snug text-gray-600 lg:text-2xl">
              {content.hero.subtitle}
            </p>
            {content.hero.introParagraphs.length > 0 ? (
              <div className="mt-8 max-w-2xl space-y-4 text-[17px] leading-relaxed text-gray-600">
                {content.hero.introParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            ) : null}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href={content.finalCta.href}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
              >
                {content.finalCta.linkLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              {content.relatedLandings?.guide ? (
                <Link
                  href={content.relatedLandings.guide.href}
                  className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  {content.relatedLandings.guide.label}
                </Link>
              ) : null}
            </div>
          </div>
          <div className="border-l border-gray-200 pl-6 text-sm leading-relaxed text-gray-500 lg:pl-10">
            <p className="text-base font-medium text-gray-900">{content.finalCta.title}</p>
            <p className="mt-3">{content.finalCta.text}</p>
          </div>
        </section>

        {cards.length > 0 ? (
          <section className="mb-28 grid grid-cols-1 gap-8 md:grid-cols-3 lg:mb-36">
            {cards.map((card, idx) => (
              <div key={card.title} className="group flex cursor-pointer flex-col">
                <div
                  className={`relative mb-6 flex aspect-[4/5] items-center justify-center rounded-[32px] bg-[#f4f7f9] p-10 transition-transform duration-500 group-hover:-translate-y-2 lg:p-12 ${
                    idx === 0 ? 'overflow-visible' : 'overflow-hidden'
                  }`}
                >
                  <div className="absolute left-1/2 top-1/2 z-0 h-4/5 w-4/5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/20 blur-[60px] transition-all duration-700 group-hover:scale-110 group-hover:bg-amber-300/30" />
                  <div
                    className={`relative z-10 overflow-hidden rounded-xl border border-black/5 bg-white shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-transform duration-500 group-hover:scale-[1.02] ${
                      idx === 0 ? 'ml-0 mr-[-1.5rem] translate-x-1 w-[calc(100%+1.5rem)]' : 'w-full'
                    }`}
                  >
                    <Image
                      src={card.imageSrc}
                      alt={card.imageAlt}
                      width={800}
                      height={800}
                      className="h-auto w-full object-cover object-top"
                    />
                  </div>
                </div>
                <div className="px-2">
                  <h2 className="mb-2 text-[22px] font-medium tracking-tight text-gray-900">{card.title}</h2>
                  <p className="text-[17px] leading-relaxed text-gray-500">{card.description}</p>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {videoThumbnailUrl ? (
          <section className="group relative mb-28 aspect-[16/9] w-full cursor-pointer overflow-hidden rounded-[32px] bg-black shadow-2xl lg:mb-36 lg:aspect-[2.4/1]">
            <Image
              src={videoThumbnailUrl}
              alt={heroMedia?.alt ?? `${labels.appName} demo`}
              fill
              className="object-cover opacity-80 transition-opacity duration-500 group-hover:opacity-100"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-16 w-20 items-center justify-center rounded-2xl bg-white/95 shadow-2xl backdrop-blur-md transition-transform group-hover:scale-105">
                <svg className="ml-1 h-8 w-8 text-black" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          </section>
        ) : null}

        <section className="mb-28 grid gap-8 lg:mb-36 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">{ui.problemEyebrow}</p>
            <h2 className="max-w-xl text-[36px] font-medium leading-tight tracking-tighter text-gray-900 lg:text-[48px]">
              {content.problem.title}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-gray-600">{content.problem.intro}</p>
            {content.problem.outroParagraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-4 max-w-xl text-[17px] leading-relaxed text-gray-500">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {content.problem.points.map((point) => (
              <div key={point} className="rounded-2xl border border-gray-200 bg-gray-50/70 p-5">
                <p className="text-[17px] leading-relaxed text-gray-700">{point}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-28 lg:mb-36">
          <div className="mb-10 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">{ui.solutionEyebrow}</p>
            <h2 className="text-[36px] font-medium leading-tight tracking-tighter text-gray-900 lg:text-[48px]">
              {content.solution.title}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-600">{content.solution.intro}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {content.solution.steps.map((step, idx) => (
              <article key={step.title} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.25)]">
                <p className="mb-5 flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                  {idx + 1}
                </p>
                <h3 className="text-lg font-semibold leading-snug text-gray-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mb-28 grid gap-8 lg:mb-36 lg:grid-cols-2">
          <div className="rounded-[28px] bg-gray-900 p-8 text-white lg:p-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-200">{ui.includesEyebrow}</p>
            <h2 className="text-[30px] font-medium leading-tight tracking-tight lg:text-[40px]">{content.includes.title}</h2>
            <p className="mt-5 text-lg leading-relaxed text-gray-200">{content.includes.intro}</p>
            {content.includes.outroParagraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-4 text-[16px] leading-relaxed text-gray-300">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="grid content-start gap-3">
            {content.includes.items.map((item) => (
              <div key={item} className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-5">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-blue-700" aria-hidden="true" />
                <p className="text-[17px] leading-relaxed text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-28 rounded-[32px] bg-[#f4f7f9] p-8 lg:mb-36 lg:p-12">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">{ui.benefitsEyebrow}</p>
          <h2 className="max-w-3xl text-[34px] font-medium leading-tight tracking-tighter text-gray-900 lg:text-[46px]">
            {content.operationalBenefits.title}
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {content.operationalBenefits.items.map((item) => (
              <p key={item} className="rounded-2xl bg-white p-5 text-[17px] leading-relaxed text-gray-700 shadow-[0_18px_50px_-42px_rgba(15,23,42,0.25)]">
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className="mb-28 grid gap-8 border-y border-gray-200 py-12 lg:mb-36 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <h2 className="text-[34px] font-medium leading-tight tracking-tighter text-gray-900 lg:text-[46px]">
            {content.forSmallAndMidEntities.title}
          </h2>
          <div className="space-y-4 text-[17px] leading-relaxed text-gray-600">
            {content.forSmallAndMidEntities.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </section>

        <section className="mb-28 rounded-[32px] bg-gray-950 p-8 text-white lg:mb-36 lg:p-12">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <h2 className="max-w-3xl text-[36px] font-medium leading-tight tracking-tighter lg:text-[52px]">
                {content.finalCta.title}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-300">{content.finalCta.text}</p>
            </div>
            <Link
              href={content.finalCta.href}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100"
            >
              {content.finalCta.linkLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

        {content.relatedLandings && relatedCases.length > 0 ? (
          <section>
            <div className="mb-8 max-w-3xl">
              <h2 className="text-[32px] font-medium tracking-tighter text-gray-900 lg:text-[40px]">{ui.fullCycle}</h2>
              <p className="mt-3 text-[17px] leading-relaxed text-gray-600">{content.relatedLandings.intro}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              <Link
                href={content.relatedLandings.guide.href}
                className="rounded-2xl border border-gray-200 bg-blue-50/70 p-5 transition-colors hover:border-blue-200 hover:bg-blue-50"
              >
                <p className="mb-2 text-sm font-semibold text-blue-700">{ui.relatedGuide}</p>
                <p className="font-semibold leading-snug text-gray-900">{content.relatedLandings.guide.label}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-600">{content.relatedLandings.guide.description}</p>
              </Link>
              {relatedCases.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  className="rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-300 hover:bg-gray-50"
                >
                  <p className="font-semibold leading-snug text-gray-900">{item.title}</p>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">{item.description}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>

      <PublicSiteFooter locale={locale} />
    </div>
  );
}
