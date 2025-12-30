'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  BookOpen,
  Receipt,
  RotateCcw,
  CreditCard,
  Users,
  FileText,
  FolderKanban,
  Eye,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { useTranslations } from '@/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus i dades
// ─────────────────────────────────────────────────────────────────────────────

type GuideItem = {
  id: string;
  icon: React.ReactNode;
  href: string;
  manualAnchor: string;
};

const GUIDES: GuideItem[] = [
  {
    id: 'movements',
    icon: <Receipt className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'returns',
    icon: <RotateCcw className="h-5 w-5" />,
    href: '/dashboard/movimientos?filter=returns',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'remittances',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#6-remeses-i-quotes',
  },
  {
    id: 'donors',
    icon: <Users className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#3-gestio-de-donants',
  },
  {
    id: 'reports',
    icon: <FileText className="h-5 w-5" />,
    href: '/dashboard/informes',
    manualAnchor: '#9-informes-fiscals',
  },
  {
    id: 'projects',
    icon: <FolderKanban className="h-5 w-5" />,
    href: '/dashboard/project-module/expenses',
    manualAnchor: '#10-modul-projectes',
  },
];

// Contingut per idioma
const GUIDE_CONTENT = {
  ca: {
    pageTitle: 'Guies curtes',
    pageSubtitle: 'Aprèn a fer servir cada pantalla en 2 minuts. Per a més detall, consulta el manual.',
    viewManual: 'Veure al manual',
    goToScreen: 'Anar a la pantalla',
    recommendedOrder: 'Ordre recomanat',
    // Labels per nou format checklist
    lookFirst: 'Mira això primer',
    doNext: 'Fes això després',
    avoid: 'Evita això',
    guides: {
      movements: {
        title: 'Moviments · Control diari',
        intro: 'Centre de control del dia a dia: aquí veus què entra i surt i detectes pendents abans que es facin grans.',
        // Nou format checklist
        lookFirst: [
          'Moviments sense contacte',
          'Moviments sense categoria',
          'Devolucions pendents',
        ],
        doNext: [
          'Assigna contacte → categoria (en aquest ordre)',
          'Divideix remeses abans de seguir',
        ],
        avoid: [
          'Forçar assignacions "per deixar-ho net"',
          'Ignorar devolucions abans d\'informes',
        ],
        // Mantenim steps per compatibilitat amb altres guies
        steps: [],
      },
      returns: {
        title: 'Devolucions',
        intro: 'Gestiona devolucions perquè restin correctament als certificats i al Model 182.',
        steps: ['Assigna el donant correcte a cada devolució.', 'Resol pendents abans de tancar l\'any.'],
      },
      remittances: {
        title: 'Remeses (quotes i Stripe)',
        intro: 'Divideix remeses per treballar amb quotes individuals i facilitar el control.',
        steps: ['Divideix la remesa abans d\'assignar contactes.', 'Revisa pendents d\'assignació (matching per email).'],
      },
      donors: {
        title: 'Donants (Model 182)',
        intro: 'Mantén DNI/CIF i Codi Postal correctes per generar el Model 182 i certificats nets.',
        steps: ['Completa DNI/CIF i Codi Postal.', 'Revisa devolucions assignades.'],
      },
      reports: {
        title: 'Informes (182/347/certificats)',
        intro: 'Genera els outputs per a la gestoria: verifica dades i exporta.',
        steps: ['Resol alertes de donants (DNI, CP).', 'Genera i envia a la gestoria.'],
      },
      projects: {
        title: 'Projectes (assignació despeses)',
        intro: 'Assigna despeses a partides de projectes per justificar subvencions.',
        steps: ['Selecciona projecte i partida.', 'Assigna despeses des de Moviments.'],
      },
    },
  },
  es: {
    pageTitle: 'Guías cortas',
    pageSubtitle: 'Aprende a usar cada pantalla en 2 minutos. Para más detalle, consulta el manual.',
    viewManual: 'Ver en el manual',
    goToScreen: 'Ir a la pantalla',
    recommendedOrder: 'Orden recomendado',
    // Labels per nou format checklist
    lookFirst: 'Mira esto primero',
    doNext: 'Haz esto después',
    avoid: 'Evita esto',
    guides: {
      movements: {
        title: 'Movimientos (control diario)',
        intro: 'Revisa qué entra y qué sale del banco. Detecta pendientes y evita errores.',
        steps: ['Filtra pendientes (sin contacto/categoría).', 'Asigna contacto → categoría → documento.'],
      },
      returns: {
        title: 'Devoluciones',
        intro: 'Gestiona devoluciones para que resten correctamente en certificados y Modelo 182.',
        steps: ['Asigna el donante correcto a cada devolución.', 'Resuelve pendientes antes de cerrar el año.'],
      },
      remittances: {
        title: 'Remesas (cuotas y Stripe)',
        intro: 'Divide remesas para trabajar con cuotas individuales y facilitar el control.',
        steps: ['Divide la remesa antes de asignar contactos.', 'Revisa pendientes de asignación (matching por email).'],
      },
      donors: {
        title: 'Donantes (Modelo 182)',
        intro: 'Mantén DNI/CIF y Código Postal correctos para generar el Modelo 182 y certificados limpios.',
        steps: ['Completa DNI/CIF y Código Postal.', 'Revisa devoluciones asignadas.'],
      },
      reports: {
        title: 'Informes (182/347/certificados)',
        intro: 'Genera los outputs para la gestoría: verifica datos y exporta.',
        steps: ['Resuelve alertas de donantes (DNI, CP).', 'Genera y envía a la gestoría.'],
      },
      projects: {
        title: 'Proyectos (asignación gastos)',
        intro: 'Asigna gastos a partidas de proyectos para justificar subvenciones.',
        steps: ['Selecciona proyecto y partida.', 'Asigna gastos desde Movimientos.'],
      },
    },
  },
  fr: {
    pageTitle: 'Guides rapides',
    pageSubtitle: 'Apprenez à utiliser chaque écran en 2 minutes. Pour plus de détails, consultez le manuel.',
    viewManual: 'Voir dans le manuel',
    goToScreen: "Aller à l'écran",
    recommendedOrder: 'Ordre recommandé',
    // Labels per nou format checklist
    lookFirst: 'À regarder d\'abord',
    doNext: 'À faire ensuite',
    avoid: 'À éviter',
    guides: {
      movements: {
        title: 'Mouvements (contrôle quotidien)',
        intro: "Vérifiez les entrées et sorties bancaires. Détectez les éléments en attente et évitez les erreurs.",
        steps: ['Filtrez les éléments en attente (sans contact/catégorie).', 'Affectez contact → catégorie → document.'],
      },
      returns: {
        title: 'Retours',
        intro: 'Gérez les retours pour qu\'ils soient correctement déduits des certificats et du Modèle 182.',
        steps: ['Affectez le bon donateur à chaque retour.', 'Résolvez les éléments en attente avant la clôture.'],
      },
      remittances: {
        title: 'Remises (cotisations et Stripe)',
        intro: 'Divisez les remises pour travailler avec des cotisations individuelles.',
        steps: ['Divisez la remise avant d\'affecter les contacts.', 'Vérifiez les affectations en attente (matching par email).'],
      },
      donors: {
        title: 'Donateurs (Modèle 182)',
        intro: 'Maintenez DNI/CIF et Code postal corrects pour générer le Modèle 182 et les certificats.',
        steps: ['Complétez DNI/CIF et Code postal.', 'Vérifiez les retours affectés.'],
      },
      reports: {
        title: 'Rapports (182/347/certificats)',
        intro: 'Générez les exports pour le cabinet comptable : vérifiez les données et exportez.',
        steps: ['Résolvez les alertes donateurs (DNI, CP).', 'Générez et envoyez au cabinet.'],
      },
      projects: {
        title: 'Projets (affectation des dépenses)',
        intro: 'Affectez des dépenses aux lignes budgétaires pour justifier les subventions.',
        steps: ['Sélectionnez projet et ligne.', 'Affectez les dépenses depuis Mouvements.'],
      },
    },
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { language } = useTranslations();

  const content = GUIDE_CONTENT[language] ?? GUIDE_CONTENT.ca;

  const buildUrl = (path: string) => `/${orgSlug}${path}`;

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{content.pageTitle}</h1>
        </div>
        <p className="text-muted-foreground">{content.pageSubtitle}</p>
      </div>

      {/* Grid de guies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUIDES.map((guide) => {
          const guideContent = content.guides[guide.id as keyof typeof content.guides];

          return (
            <Card key={guide.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {guide.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{guideContent.title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                  {guideContent.intro}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Nou format checklist (si té lookFirst) */}
                {'lookFirst' in guideContent && guideContent.lookFirst && guideContent.lookFirst.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {/* Mira això primer */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600">{content.lookFirst}</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                        {guideContent.lookFirst.map((item: string, idx: number) => (
                          <li key={idx} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>
                    {/* Fes això després */}
                    {'doNext' in guideContent && guideContent.doNext && guideContent.doNext.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs font-medium text-green-600">{content.doNext}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                          {guideContent.doNext.map((item: string, idx: number) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {/* Evita això */}
                    {'avoid' in guideContent && guideContent.avoid && guideContent.avoid.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-medium text-red-500">{content.avoid}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                          {guideContent.avoid.map((item: string, idx: number) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Format antic amb steps */
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2 text-xs">
                      {content.recommendedOrder}
                    </Badge>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      {guideContent.steps.map((step: string, idx: number) => (
                        <li key={idx} className="line-clamp-1">{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* CTAs */}
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href={buildUrl(guide.href)}>
                      {content.goToScreen}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={buildUrl(`/dashboard/manual${guide.manualAnchor}`)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      {content.viewManual}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
