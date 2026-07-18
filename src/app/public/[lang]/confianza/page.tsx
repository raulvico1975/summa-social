import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, Download, FileCheck2, LifeBuoy, ShieldCheck } from 'lucide-react';
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

type TrustLocale = 'ca' | 'es';

const TRUST_COPY: Record<
  TrustLocale,
  {
    metadata: { title: string; description: string };
    eyebrow: string;
    title: string;
    lead: string;
    principles: Array<{ title: string; description: string; detail: string }>;
    privacyTitle: string;
    privacyBody: string;
    privacyLink: string;
    scopeTitle: string;
    scopeBody: string;
    ctaTitle: string;
    ctaBody: string;
    cta: string;
  }
> = {
  ca: {
    metadata: {
      title: 'Confiança, control de dades i suport | Summa Social',
      description:
        'Coneix com Summa Social tracta els permisos, la documentació, la traçabilitat, l’exportació de dades i el suport a les entitats.',
    },
    eyebrow: 'Confiança i control',
    title: 'La gestió econòmica necessita criteris clars, no promeses vagues',
    lead:
      'Summa Social és un producte jove i treballem amb creixement controlat. Per això expliquem què ofereix avui el producte i com acompanyem cada entitat.',
    principles: [
      {
        title: 'Accés per organització, rols i permisos',
        description:
          'Els accessos es vinculen a la pertinença a cada organització i a permisos granulars per a les operacions sensibles.',
        detail:
          'Això permet separar funcions com la lectura, l’edició, les importacions o els informes segons el perfil de cada persona.',
      },
      {
        title: 'Documents i traçabilitat operativa',
        description:
          'Els moviments, documents i processos relacionats es treballen dins del mateix entorn, amb estats i vincles explícits.',
        detail:
          'L’objectiu és facilitar la revisió del circuit i reduir la dispersió entre extractes, carpetes i fulls separats.',
      },
      {
        title: 'Sortida i exportació de dades',
        description:
          'Una entitat pot sol·licitar una exportació completa de les dades disponibles a l’aplicació en format JSON.',
        detail:
          'També hi ha exportacions parcials per a usos operatius. La sortida completa es gestiona amb suport per verificar el lliurable.',
      },
      {
        title: 'Suport directe i implantació gradual',
        description:
          'La configuració inicial i el suport d’ús formen part del model actual de servei.',
        detail:
          'Treballem amb poques entitats alhora per entendre el circuit real, resoldre dubtes i no forçar una implantació genèrica.',
      },
    ],
    privacyTitle: 'Privacitat explicada de manera pública',
    privacyBody:
      'La política de privacitat identifica les dades tractades, les finalitats, els proveïdors que intervenen i els canals per exercir drets. Si una qüestió contractual o tècnica no hi queda resolta, la revisem abans de la implantació.',
    privacyLink: 'Consultar la política de privacitat',
    scopeTitle: 'Què no afirmem',
    scopeBody:
      'No presentem certificacions, auditories externes ni garanties de compliment que no estiguin documentades. La confiança es basa en funcionalitats comprovables, límits explícits i suport directe.',
    ctaTitle: 'Tens una pregunta concreta sobre dades, permisos o sortida?',
    ctaBody:
      'Explica’ns el vostre circuit i respondrem sobre el cas real de l’entitat abans que prengueu una decisió.',
    cta: 'Parlar amb Summa Social',
  },
  es: {
    metadata: {
      title: 'Confianza, control de datos y soporte | Summa Social',
      description:
        'Conoce cómo Summa Social trata los permisos, la documentación, la trazabilidad, la exportación de datos y el soporte a las entidades.',
    },
    eyebrow: 'Confianza y control',
    title: 'La gestión económica necesita criterios claros, no promesas vagas',
    lead:
      'Summa Social es un producto joven y trabajamos con crecimiento controlado. Por eso explicamos qué ofrece hoy el producto y cómo acompañamos a cada entidad.',
    principles: [
      {
        title: 'Acceso por organización, roles y permisos',
        description:
          'Los accesos se vinculan a la pertenencia a cada organización y a permisos granulares para las operaciones sensibles.',
        detail:
          'Esto permite separar funciones como la lectura, la edición, las importaciones o los informes según el perfil de cada persona.',
      },
      {
        title: 'Documentos y trazabilidad operativa',
        description:
          'Los movimientos, documentos y procesos relacionados se trabajan dentro del mismo entorno, con estados y vínculos explícitos.',
        detail:
          'El objetivo es facilitar la revisión del circuito y reducir la dispersión entre extractos, carpetas y hojas separadas.',
      },
      {
        title: 'Salida y exportación de datos',
        description:
          'Una entidad puede solicitar una exportación completa de los datos disponibles en la aplicación en formato JSON.',
        detail:
          'También existen exportaciones parciales para usos operativos. La salida completa se gestiona con soporte para verificar el entregable.',
      },
      {
        title: 'Soporte directo e implantación gradual',
        description:
          'La configuración inicial y el soporte de uso forman parte del modelo actual de servicio.',
        detail:
          'Trabajamos con pocas entidades a la vez para entender el circuito real, resolver dudas y no forzar una implantación genérica.',
      },
    ],
    privacyTitle: 'Privacidad explicada de forma pública',
    privacyBody:
      'La política de privacidad identifica los datos tratados, las finalidades, los proveedores que intervienen y los canales para ejercer derechos. Si una cuestión contractual o técnica no queda resuelta, la revisamos antes de la implantación.',
    privacyLink: 'Consultar la política de privacidad',
    scopeTitle: 'Qué no afirmamos',
    scopeBody:
      'No presentamos certificaciones, auditorías externas ni garantías de cumplimiento que no estén documentadas. La confianza se basa en funcionalidades comprobables, límites explícitos y soporte directo.',
    ctaTitle: '¿Tienes una pregunta concreta sobre datos, permisos o salida?',
    ctaBody:
      'Explícanos vuestro circuito y responderemos sobre el caso real de la entidad antes de que toméis una decisión.',
    cta: 'Hablar con Summa Social',
  },
};

function isTrustLocale(locale: string): locale is TrustLocale {
  return locale === 'ca' || locale === 'es';
}

export function generateStaticParams() {
  return [{ lang: 'ca' }, { lang: 'es' }];
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang } = await params;
  if (!isValidPublicLocale(lang) || !isTrustLocale(lang)) return {};

  const copy = TRUST_COPY[lang];
  return {
    title: copy.metadata.title,
    description: copy.metadata.description,
    ...generatePublicPageMetadata(lang, '/confianza', {
      title: copy.metadata.title,
      description: copy.metadata.description,
      availableLocales: ['ca', 'es'],
    }),
  };
}

export default async function TrustPage({ params }: PageProps) {
  const { lang } = await params;
  if (!isValidPublicLocale(lang) || !isTrustLocale(lang)) notFound();

  const locale = lang as TrustLocale;
  const copy = TRUST_COPY[locale];
  const principleIcons = [ShieldCheck, FileCheck2, Download, LifeBuoy];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.11),transparent_33%),linear-gradient(180deg,#f8fbff_0%,#ffffff_35%,#ffffff_100%)]">
      <PublicSiteHeader locale={locale} currentSection="about" />

      <section className={`pb-12 pt-14 lg:pb-16 lg:pt-20 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-6xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary/85">{copy.eyebrow}</p>
          <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{copy.lead}</p>
        </div>
      </section>

      <section className={`pb-14 lg:pb-20 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto grid max-w-6xl gap-5 md:grid-cols-2">
          {copy.principles.map((principle, index) => {
            const Icon = principleIcons[index];
            return (
              <article key={principle.title} className="rounded-[1.75rem] border border-border/60 bg-white p-7 shadow-sm">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="mt-5 text-2xl font-semibold tracking-tight">{principle.title}</h2>
                <p className="mt-4 text-base leading-7 text-foreground/85">{principle.description}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{principle.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className={`pb-14 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="rounded-[1.75rem] border border-sky-200/70 bg-sky-50/70 p-7 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">{copy.privacyTitle}</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{copy.privacyBody}</p>
            <Link
              href={`/${locale}/privacy`}
              className="mt-5 inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              {copy.privacyLink}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[1.75rem] border border-border/60 bg-slate-50 p-7 sm:p-8">
            <h2 className="text-2xl font-semibold tracking-tight">{copy.scopeTitle}</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">{copy.scopeBody}</p>
          </article>
        </div>
      </section>

      <section className={`pb-20 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-6xl rounded-[2rem] border border-sky-200/70 bg-white p-7 shadow-sm sm:p-9">
          <h2 className="max-w-3xl text-3xl font-semibold tracking-tight">{copy.ctaTitle}</h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted-foreground">{copy.ctaBody}</p>
          <div className="mt-6">
            <Button asChild size="lg">
              <Link href={`/${locale}/contact`}>
                {copy.cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
          <div className="mt-8 border-t border-border/60 pt-6">
            <PublicDirectContact locale={locale} />
          </div>
        </div>
      </section>

      <PublicSiteFooter locale={locale} />
    </main>
  );
}
