import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Building2, ExternalLink, FileText, Landmark, ListChecks } from 'lucide-react';
import { PublicDirectContact } from '@/components/public/PublicDirectContact';
import { PUBLIC_SHELL_X } from '@/components/public/public-shell';
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter';
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader';
import { Button } from '@/components/ui/button';
import {
  generatePublicPageMetadata,
  isValidPublicLocale,
} from '@/lib/public-locale';

interface PageProps {
  params: Promise<{ lang: string }>;
}

type CaseLocale = 'ca' | 'es';

const CASE_COPY: Record<
  CaseLocale,
  {
    metadata: { title: string; description: string };
    eyebrow: string;
    title: string;
    lead: string;
    contextTitle: string;
    contextBody: string;
    officialSite: string;
    useTitle: string;
    useIntro: string;
    uses: Array<{ title: string; description: string }>;
    scopeTitle: string;
    scopeBody: string;
    ctaTitle: string;
    ctaBody: string;
    primaryCta: string;
    secondaryCta: string;
  }
> = {
  ca: {
    metadata: {
      title: 'Fundación Flores de Kiskeya: cas d’ús real | Summa Social',
      description:
        'Coneix com Fundación Flores de Kiskeya utilitza Summa Social per ordenar moviments bancaris, documentació i seguiment economicoadministratiu.',
    },
    eyebrow: 'Cas d’ús real',
    title: 'Fundación Flores de Kiskeya treballa amb Summa Social',
    lead:
      'Flores de Kiskeya és una entitat usuària real. Aquest cas explica, de manera concreta i prudent, en quins processos de gestió quotidiana l’acompanya Summa Social.',
    contextTitle: 'Una entitat social amb activitat entre Haití i la República Dominicana',
    contextBody:
      'Fundación Flores de Kiskeya impulsa programes adreçats a dones i infants en situació de vulnerabilitat a la zona fronterera d’Anse-à-Pitres i Pedernales.',
    officialSite: 'Conèixer Flores de Kiskeya',
    useTitle: 'Quin ús en fa',
    useIntro:
      'Summa Social dona suport a una part de la seva operativa economicoadministrativa en un espai de treball compartit.',
    uses: [
      {
        title: 'Moviments bancaris',
        description:
          'Centralitzar i revisar els moviments bancaris que formen part del seguiment econòmic ordinari.',
      },
      {
        title: 'Documentació',
        description:
          'Mantenir la documentació de suport vinculada al circuit de gestió, amb un criteri més ordenat.',
      },
      {
        title: 'Control economicoadministratiu',
        description:
          'Treballar sobre informació real de l’entitat i disposar d’una base comuna per revisar el dia a dia.',
      },
    ],
    scopeTitle: 'Un cas explicat amb confidencialitat',
    scopeBody:
      'Descrivim l’ús real de manera qualitativa. Per respecte a la confidencialitat de l’entitat, no publiquem dades operatives, documents interns, xifres ni resultats que no hagin estat validats específicament.',
    ctaTitle: 'Vols valorar si aquest enfocament encaixa amb la teva entitat?',
    ctaBody:
      'Podem revisar el vostre circuit actual de bancs, documents i seguiment econòmic i ensenyar-vos només els blocs rellevants.',
    primaryCta: 'Parlar del vostre cas',
    secondaryCta: 'Veure la gestió econòmica',
  },
  es: {
    metadata: {
      title: 'Fundación Flores de Kiskeya: caso de uso real | Summa Social',
      description:
        'Conoce cómo Fundación Flores de Kiskeya utiliza Summa Social para ordenar movimientos bancarios, documentación y seguimiento económico-administrativo.',
    },
    eyebrow: 'Caso de uso real',
    title: 'Fundación Flores de Kiskeya trabaja con Summa Social',
    lead:
      'Flores de Kiskeya es una entidad usuaria real. Este caso explica, de forma concreta y prudente, en qué procesos de gestión cotidiana la acompaña Summa Social.',
    contextTitle: 'Una entidad social con actividad entre Haití y República Dominicana',
    contextBody:
      'Fundación Flores de Kiskeya impulsa programas dirigidos a mujeres e infancia en situación de vulnerabilidad en la zona fronteriza de Anse-à-Pitres y Pedernales.',
    officialSite: 'Conocer Flores de Kiskeya',
    useTitle: 'Para qué lo utiliza',
    useIntro:
      'Summa Social da apoyo a una parte de su operativa económico-administrativa en un espacio de trabajo compartido.',
    uses: [
      {
        title: 'Movimientos bancarios',
        description:
          'Centralizar y revisar los movimientos bancarios que forman parte del seguimiento económico ordinario.',
      },
      {
        title: 'Documentación',
        description:
          'Mantener la documentación de soporte vinculada al circuito de gestión, con un criterio más ordenado.',
      },
      {
        title: 'Control económico-administrativo',
        description:
          'Trabajar sobre información real de la entidad y disponer de una base común para revisar el día a día.',
      },
    ],
    scopeTitle: 'Un caso explicado con confidencialidad',
    scopeBody:
      'Describimos el uso real de forma cualitativa. Por respeto a la confidencialidad de la entidad, no publicamos datos operativos, documentos internos, cifras ni resultados que no hayan sido validados específicamente.',
    ctaTitle: '¿Quieres valorar si este enfoque encaja con tu entidad?',
    ctaBody:
      'Podemos revisar vuestro circuito actual de bancos, documentos y seguimiento económico y enseñaros solo los bloques relevantes.',
    primaryCta: 'Hablar de vuestro caso',
    secondaryCta: 'Ver la gestión económica',
  },
};

function isCaseLocale(locale: string): locale is CaseLocale {
  return locale === 'ca' || locale === 'es';
}

export function generateStaticParams() {
  return [{ lang: 'ca' }, { lang: 'es' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidPublicLocale(lang) || !isCaseLocale(lang)) return {};

  const copy = CASE_COPY[lang];
  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    ...generatePublicPageMetadata(lang, '/casos/flores-de-kiskeya', {
      title: copy.metadata.title,
      description: copy.metadata.description,
      availableLocales: ['ca', 'es'],
      openGraphType: 'article',
    }),
  };
}

export default async function FloresDeKiskeyaCasePage({ params }: PageProps) {
  const { lang } = await params;
  if (!isValidPublicLocale(lang) || !isCaseLocale(lang)) notFound();

  const locale = lang as CaseLocale;
  const copy = CASE_COPY[locale];
  const useIcons = [Landmark, FileText, ListChecks];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_34%),linear-gradient(180deg,#f8fbff_0%,#ffffff_34%,#ffffff_100%)]">
      <PublicSiteHeader locale={locale} currentSection="about" />

      <section className={`pb-12 pt-14 lg:pb-16 lg:pt-20 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/85">
                {copy.eyebrow}
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {copy.title}
              </h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{copy.lead}</p>
            </div>

            <aside className="rounded-[2rem] border border-sky-200/70 bg-white/92 p-7 shadow-[0_30px_90px_-56px_rgba(14,165,233,0.38)]">
              <Building2 className="h-6 w-6 text-primary" />
              <h2 className="mt-5 text-2xl font-semibold tracking-tight">{copy.contextTitle}</h2>
              <p className="mt-4 text-base leading-7 text-muted-foreground">{copy.contextBody}</p>
              <a
                href="https://floresdekiskeya.org/"
                target="_blank"
                rel="noreferrer"
                className="mt-5 inline-flex items-center text-sm font-medium text-primary hover:underline"
              >
                {copy.officialSite}
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </aside>
          </div>
        </div>
      </section>

      <section className={`pb-14 lg:pb-20 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-border/60 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="text-3xl font-semibold tracking-tight">{copy.useTitle}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{copy.useIntro}</p>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {copy.uses.map((item, index) => {
              const Icon = useIcons[index];
              return (
                <article key={item.title} className="rounded-[1.5rem] border border-border/60 bg-slate-50/70 p-6">
                  <Icon className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </article>
              );
            })}
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-6">
            <h2 className="text-xl font-semibold">{copy.scopeTitle}</h2>
            <p className="mt-3 max-w-4xl text-sm leading-6 text-muted-foreground">{copy.scopeBody}</p>
          </div>
        </div>
      </section>

      <section className={`pb-20 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-sky-200/70 bg-[linear-gradient(135deg,rgba(14,165,233,0.12),rgba(255,255,255,0.98)_52%,rgba(240,249,255,0.9))] p-7 sm:p-9">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight">{copy.ctaTitle}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{copy.ctaBody}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={`/${locale}/contact`}>
                {copy.primaryCta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={`/${locale}/gestio-economica-ong`}>{copy.secondaryCta}</Link>
            </Button>
          </div>
          <div className="mt-8 border-t border-sky-200/80 pt-6">
            <PublicDirectContact locale={locale} />
          </div>
        </div>
      </section>

      <PublicSiteFooter locale={locale} />
    </main>
  );
}
