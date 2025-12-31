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
  AlertTriangle,
  ClipboardCheck,
  Clock,
  HelpCircle,
  CalendarCheck,
  Shield,
  RefreshCw,
  Upload,
  PlayCircle,
  Calendar,
  CheckSquare,
  Smartphone,
  Wallet,
  Layers,
  Scissors,
  FileUp,
  Paperclip,
  Landmark,
  Languages,
  FileSpreadsheet,
  Award,
  UserMinus,
  UserCheck,
  Pencil,
  Filter,
  Sparkles,
  KeyRound,
  RefreshCcwDot,
  UserX,
  Save,
  ToggleLeft,
  Trash2,
} from 'lucide-react';
import { useTranslations } from '@/i18n';

// ─────────────────────────────────────────────────────────────────────────────
// Tipus i dades estàtiques (no traducibles - rutes i icones)
// ─────────────────────────────────────────────────────────────────────────────

type GuideItem = {
  id: string;
  icon: React.ReactNode;
  href: string;
  helpHref?: string;
  manualAnchor: string;
};

const GUIDES: GuideItem[] = [
  {
    id: 'firstDay',
    icon: <PlayCircle className="h-5 w-5" />,
    href: '/dashboard/configuracion',
    manualAnchor: '#1-primers-passos',
  },
  {
    id: 'firstMonth',
    icon: <Calendar className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'monthClose',
    icon: <CheckSquare className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'movements',
    icon: <Receipt className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'importMovements',
    icon: <FileUp className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#movements',
  },
  {
    id: 'bulkCategory',
    icon: <Layers className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'changePeriod',
    icon: <Clock className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#movements',
  },
  {
    id: 'selectBankAccount',
    icon: <Landmark className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#movements',
  },
  {
    id: 'attachDocument',
    icon: <Paperclip className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#movements',
  },
  {
    id: 'returns',
    icon: <RotateCcw className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    helpHref: '/dashboard/movimientos?help=1',
    manualAnchor: '#remittances',
  },
  {
    id: 'remittances',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    helpHref: '/dashboard/movimientos?help=1',
    manualAnchor: '#6-divisor-de-remeses',
  },
  {
    id: 'splitRemittance',
    icon: <Scissors className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#remittances',
  },
  {
    id: 'stripeDonations',
    icon: <Wallet className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#stripe',
  },
  {
    id: 'travelReceipts',
    icon: <Smartphone className="h-5 w-5" />,
    href: '/dashboard/project-module/expenses/capture',
    manualAnchor: '#capture',
  },
  {
    id: 'donors',
    icon: <Users className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#donors',
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
    manualAnchor: '#10-projectes-i-justificació-de-subvencions',
  },
  {
    id: 'monthlyFlow',
    icon: <RefreshCw className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#5-gestio-de-moviments',
  },
  {
    id: 'yearEndFiscal',
    icon: <CalendarCheck className="h-5 w-5" />,
    href: '/dashboard/informes',
    manualAnchor: '#9-informes-fiscals',
  },
  {
    id: 'accessSecurity',
    icon: <Shield className="h-5 w-5" />,
    href: '/dashboard',
    manualAnchor: '#1-primers-passos',
  },
  {
    id: 'initialLoad',
    icon: <Upload className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#1-primers-passos',
  },
  {
    id: 'changeLanguage',
    icon: <Languages className="h-5 w-5" />,
    href: '/dashboard/configuracion',
    manualAnchor: '#first-steps',
  },
  {
    id: 'importDonors',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#donors',
  },
  {
    id: 'generateDonorCertificate',
    icon: <Award className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#reports',
  },
  {
    id: 'model182',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    href: '/dashboard/informes',
    manualAnchor: '#reports',
  },
  {
    id: 'model347',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    href: '/dashboard/informes',
    manualAnchor: '#reports',
  },
  {
    id: 'certificatesBatch',
    icon: <Award className="h-5 w-5" />,
    href: '/dashboard/informes',
    manualAnchor: '#reports',
  },
  {
    id: 'donorSetInactive',
    icon: <UserMinus className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#donors',
  },
  {
    id: 'donorReactivate',
    icon: <UserCheck className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#donors',
  },
  {
    id: 'editMovement',
    icon: <Pencil className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#movements',
  },
  {
    id: 'movementFilters',
    icon: <Filter className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#movements',
  },
  {
    id: 'bulkAICategorize',
    icon: <Sparkles className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#movements',
  },
  {
    id: 'remittanceViewDetail',
    icon: <Eye className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#remittances',
  },
  {
    id: 'resetPassword',
    icon: <KeyRound className="h-5 w-5" />,
    href: '/login',
    manualAnchor: '#troubleshooting',
  },
  {
    id: 'updateExistingDonors',
    icon: <RefreshCcwDot className="h-5 w-5" />,
    href: '/dashboard/donants',
    manualAnchor: '#donors',
  },
  {
    id: 'remittanceLowMembers',
    icon: <UserX className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#remittances',
  },
  {
    id: 'saveRemittanceMapping',
    icon: <Save className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#remittances',
  },
  {
    id: 'toggleRemittanceItems',
    icon: <ToggleLeft className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    manualAnchor: '#remittances',
  },
  {
    id: 'dangerDeleteLastRemittance',
    icon: <Trash2 className="h-5 w-5" />,
    href: '/dashboard/configuracion',
    manualAnchor: '#danger',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers per llegir traduccions amb fallback HUMÀ (MAI claus tècniques)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detecta si un valor és una clau no resolta (MAI mostrar a UI)
 * NOMÉS retorna true si el valor retornat és EXACTAMENT la clau demanada
 * (comportament de trFactory quan no troba la traducció)
 */
function isUnresolvedKey(value: string | null | undefined, key: string): boolean {
  if (value == null) return true;
  // trFactory retorna la clau si no la troba: value === key
  return value === key;
}

/**
 * Wrapper segur per tr() que mai retorna claus tècniques
 * Si la traducció no es resol, retorna el fallback humà
 */
function safeTr(
  tr: (key: string, fallback?: string) => string,
  key: string,
  fallback: string
): string {
  const value = tr(key);
  if (isUnresolvedKey(value, key)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[i18n] Key not resolved: ${key}`);
    }
    return fallback;
  }
  return value;
}

/**
 * Llegeix arrays del JSON amb fallback segur
 */
function getArray(tr: (key: string, fallback?: string) => string, prefix: string, maxItems = 10): string[] {
  const result: string[] = [];
  for (let i = 0; i < maxItems; i++) {
    const key = `${prefix}.${i}`;
    const value = tr(key);
    if (isUnresolvedKey(value, key)) break;
    result.push(value);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { tr } = useTranslations();

  const buildUrl = (path: string) => `/${orgSlug}${path}`;

  // Page-level translations (amb fallback humà)
  const pageTitle = safeTr(tr, 'guides.pageTitle', 'Guies');
  const pageSubtitle = safeTr(tr, 'guides.pageSubtitle', 'Consulta ràpida per a tasques habituals');
  const viewManual = safeTr(tr, 'guides.viewManual', 'Veure manual');
  const viewHelp = safeTr(tr, 'guides.viewHelp', 'Ajuda');
  const recommendedOrder = safeTr(tr, 'guides.recommendedOrder', 'Ordre recomanat');

  // Labels (amb fallback humà)
  const labelLookFirst = safeTr(tr, 'guides.labels.lookFirst', 'Mira primer');
  const labelDoNext = safeTr(tr, 'guides.labels.doNext', 'Fes després');
  const labelThen = safeTr(tr, 'guides.labels.then', 'Després');
  const labelAvoid = safeTr(tr, 'guides.labels.avoid', 'Evita');
  const labelNotResolved = safeTr(tr, 'guides.labels.notResolved', 'No està resolt');
  const labelCostlyError = safeTr(tr, 'guides.labels.costlyError', 'Error freqüent');
  const labelCheckBeforeExport = safeTr(tr, 'guides.labels.checkBeforeExport', 'Revisa abans');
  const labelDontFixYet = safeTr(tr, 'guides.labels.dontFixYet', 'No arreglis encara');

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
        </div>
        <p className="text-muted-foreground">{pageSubtitle}</p>
      </div>

      {/* Grid de guies */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUIDES.map((guide) => {
          // Llegir traduccions per aquesta guia
          const titleKey = `guides.${guide.id}.title`;
          const titleValue = tr(titleKey);
          const titleResolved = !isUnresolvedKey(titleValue, titleKey);

          // Si el títol no es resol, ocultar la card (millor no mostrar res)
          if (!titleResolved) {
            if (process.env.NODE_ENV === 'development') {
              console.warn(`[guides] Skipping unresolved guide: ${guide.id}`);
            }
            return null;
          }

          const title = titleValue;
          const intro = safeTr(tr, `guides.${guide.id}.intro`, '');
          const whatIsKey = `guides.${guide.id}.whatIs`;
          const whatIs = tr(whatIsKey);
          const hasWhatIs = !isUnresolvedKey(whatIs, whatIsKey);
          const cta = safeTr(tr, `guides.cta.${guide.id}`, 'Anar-hi');

          // Arrays opcionals
          const lookFirst = getArray(tr, `guides.${guide.id}.lookFirst`);
          const doNext = getArray(tr, `guides.${guide.id}.doNext`);
          const then = getArray(tr, `guides.${guide.id}.then`);
          const avoid = getArray(tr, `guides.${guide.id}.avoid`);
          const notResolved = getArray(tr, `guides.${guide.id}.notResolved`);
          const checkBeforeExport = getArray(tr, `guides.${guide.id}.checkBeforeExport`);
          const dontFixYet = getArray(tr, `guides.${guide.id}.dontFixYet`);
          const steps = getArray(tr, `guides.${guide.id}.steps`);

          // costlyError és un string únic (no array)
          const costlyErrorKey = `guides.${guide.id}.costlyError`;
          const costlyError = tr(costlyErrorKey);
          const hasCostlyError = !isUnresolvedKey(costlyError, costlyErrorKey);

          // Determinar quin format usar
          const isExpertFormat = notResolved.length > 0;
          const isChecklistFormat = lookFirst.length > 0 && !isExpertFormat;
          const isStepsFormat = steps.length > 0 && !isExpertFormat && !isChecklistFormat;

          return (
            <Card key={guide.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    {guide.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base leading-tight">{title}</CardTitle>
                  </div>
                </div>
                <CardDescription className="mt-2 line-clamp-2">
                  {hasWhatIs ? whatIs : intro}
                </CardDescription>
              </CardHeader>

              <CardContent className="flex-1 flex flex-col">
                {/* Format expert (devolucions/donants) */}
                {isExpertFormat && (
                  <div className="space-y-2.5 mb-4 text-xs">
                    {/* Quan NO està ben resolta */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <XCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="font-medium text-red-600">{labelNotResolved}</span>
                      </div>
                      <ul className="text-muted-foreground space-y-0.5 ml-5">
                        {notResolved.map((item, idx) => (
                          <li key={idx} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* L'error més car */}
                    {hasCostlyError && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-md p-2">
                        <div className="flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium text-amber-700 dark:text-amber-400">{labelCostlyError}</span>
                            <p className="text-muted-foreground mt-0.5">{costlyError}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Què mires sempre abans d'exportar */}
                    {checkBeforeExport.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <ClipboardCheck className="h-3.5 w-3.5 text-green-500" />
                          <span className="font-medium text-green-600">{labelCheckBeforeExport}</span>
                        </div>
                        <ul className="text-muted-foreground space-y-0.5 ml-5">
                          {checkBeforeExport.map((item, idx) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Quan NO arreglar-ho encara */}
                    {dontFixYet.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span className="font-medium text-slate-500">{labelDontFixYet}</span>
                        </div>
                        <ul className="text-muted-foreground space-y-0.5 ml-5">
                          {dontFixYet.map((item, idx) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Format checklist (moviments/remeses) */}
                {isChecklistFormat && (
                  <div className="space-y-3 mb-4">
                    {/* Mira això primer */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Eye className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium text-blue-600">{labelLookFirst}</span>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                        {lookFirst.map((item, idx) => (
                          <li key={idx} className="list-disc">{item}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Fes això després (doNext o then) */}
                    {(doNext.length > 0 || then.length > 0) && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          <span className="text-xs font-medium text-green-600">
                            {doNext.length > 0 ? labelDoNext : labelThen}
                          </span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                          {(doNext.length > 0 ? doNext : then).map((item, idx) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Evita això */}
                    {avoid.length > 0 && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-medium text-red-500">{labelAvoid}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                          {avoid.map((item, idx) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Format steps (monthlyFlow, yearEndFiscal, etc.) */}
                {isStepsFormat && (
                  <div className="mb-4">
                    <Badge variant="outline" className="mb-2 text-xs">
                      {recommendedOrder}
                    </Badge>
                    <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                      {steps.map((step, idx) => (
                        <li key={idx} className="line-clamp-1">{step}</li>
                      ))}
                    </ol>
                    {/* Mostrar avoid si existeix per steps (p.ex. initialLoad) */}
                    {avoid.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                          <span className="text-xs font-medium text-red-500">{labelAvoid}</span>
                        </div>
                        <ul className="text-xs text-muted-foreground space-y-0.5 ml-5">
                          {avoid.map((item, idx) => (
                            <li key={idx} className="list-disc">{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* CTAs */}
                <div className="mt-auto flex flex-col gap-2">
                  <Button asChild size="sm">
                    <Link href={buildUrl(guide.href)}>
                      {cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  {/* CTA secundari: ajuda detallada (si helpHref existeix) */}
                  {guide.helpHref && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={buildUrl(guide.helpHref)}>
                        <HelpCircle className="mr-2 h-4 w-4" />
                        {viewHelp}
                      </Link>
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={buildUrl(`/dashboard/manual${guide.manualAnchor}`)}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      {viewManual}
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
