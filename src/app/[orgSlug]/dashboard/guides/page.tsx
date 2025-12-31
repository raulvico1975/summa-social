'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BookOpen,
  Receipt,
  RotateCcw,
  CreditCard,
  Users,
  FileText,
  FolderKanban,
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
  Eye,
  Clock,
  AlertCircle,
  CheckCircle2,
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
];

// ─────────────────────────────────────────────────────────────────────────────
// Blocs A/B — Separació per intent d'usuari
// ─────────────────────────────────────────────────────────────────────────────

// Bloc A: "Tinc un problema" — Guies orientades a resoldre situacions
const PROBLEM_GUIDE_IDS = [
  // Fiscalitat
  'model182HasErrors',
  'model182',
  'model347',
  'certificatesBatch',
  // Importació i remeses
  'importMovements',
  'remittances',
  'remittanceLowMembers',
  'returns',
  // Stripe
  'stripeDonations',
  // Operativa
  'movementFilters',
  'bulkCategory',
  'resetPassword',
  'accessSecurity',
];

// Bloc B: "Vull fer una acció" — Guies orientades a tasques concretes
const ACTION_GUIDE_IDS = [
  // Onboarding
  'firstDay',
  'firstMonth',
  'initialLoad',
  // Moviments
  'movements',
  'importMovements',
  'editMovement',
  'attachDocument',
  'changePeriod',
  'selectBankAccount',
  'bulkAICategorize',
  'travelReceipts',
  // Remeses
  'splitRemittance',
  'remittanceViewDetail',
  'saveRemittanceMapping',
  'toggleRemittanceItems',
  // Stripe
  'stripeDonations',
  // Donants
  'donors',
  'importDonors',
  'updateExistingDonors',
  'donorSetInactive',
  'donorReactivate',
  'generateDonorCertificate',
  // Informes
  'model182',
  'model347',
  'certificatesBatch',
  'yearEndFiscal',
  // Projectes
  'projects',
  // Fluxos
  'monthlyFlow',
  'monthClose',
  'reports',
  // Configuració
  'changeLanguage',
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

// NOTE: getArray() moguda a la pàgina de detall (només s'hi usen steps/lookFirst/etc.)

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
  const viewManual = safeTr(tr, 'guides.viewManual', 'Veure manual');
  const viewHelp = safeTr(tr, 'guides.viewHelp', 'Ajuda');

  // Helper per renderitzar una card de guia
  const renderGuideCard = (guideId: string) => {
    const guide = GUIDES.find((g) => g.id === guideId);
    if (!guide) return null;

    const titleKey = `guides.${guide.id}.title`;
    const titleValue = tr(titleKey);
    const titleResolved = !isUnresolvedKey(titleValue, titleKey);

    if (!titleResolved) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[guides] Skipping unresolved guide: ${guide.id}`);
      }
      return null;
    }

    const title = titleValue;
    const cta = safeTr(tr, `guides.cta.${guide.id}`, 'Anar-hi');

    // Summary amb fallback a whatIs > intro
    const summaryKey = `guides.${guide.id}.summary`;
    const summary = tr(summaryKey);
    const hasSummary = !isUnresolvedKey(summary, summaryKey);

    let cardDescription = '';
    if (hasSummary) {
      cardDescription = summary;
    } else {
      const whatIsKey = `guides.${guide.id}.whatIs`;
      const whatIs = tr(whatIsKey);
      if (!isUnresolvedKey(whatIs, whatIsKey)) {
        cardDescription = whatIs;
      } else {
        cardDescription = safeTr(tr, `guides.${guide.id}.intro`, '');
      }
    }

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
          {cardDescription && (
            <CardDescription className="mt-2">
              {cardDescription}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="flex-1 flex flex-col">
          <div className="mt-auto flex flex-col gap-2">
            <Button asChild size="sm">
              <Link href={buildUrl(guide.href)}>
                {cta}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
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
  };

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">{pageTitle}</h1>
        </div>
        <p className="text-muted-foreground">
          Ajuda ràpida sense suport humà
        </p>
      </div>

      {/* Bloc A: Tinc un problema */}
      <section className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-5 mb-8">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-amber-900 dark:text-amber-100">
            <AlertCircle className="h-5 w-5" />
            Tinc un problema
          </h2>
          <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
            Tria el que t&apos;està passant i et portem al lloc correcte.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PROBLEM_GUIDE_IDS.map((id) => renderGuideCard(id))}
        </div>
      </section>

      {/* Bloc B: Vull fer una acció */}
      <section className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-5">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-blue-900 dark:text-blue-100">
            <CheckCircle2 className="h-5 w-5" />
            Vull fer una acció
          </h2>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
            Accés directe a tasques concretes.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ACTION_GUIDE_IDS.map((id) => renderGuideCard(id))}
        </div>
      </section>
    </div>
  );
}
