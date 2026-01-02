'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ArrowRight,
  BookOpen,
  Search,
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
  ListChecks,
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
};

const GUIDES: GuideItem[] = [
  {
    id: 'firstDay',
    icon: <PlayCircle className="h-5 w-5" />,
    href: '/dashboard/configuracion',
  },
  {
    id: 'firstMonth',
    icon: <Calendar className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'monthClose',
    icon: <CheckSquare className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'movements',
    icon: <Receipt className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'importMovements',
    icon: <FileUp className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'bulkCategory',
    icon: <Layers className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'changePeriod',
    icon: <Clock className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'selectBankAccount',
    icon: <Landmark className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'attachDocument',
    icon: <Paperclip className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'returns',
    icon: <RotateCcw className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    helpHref: '/dashboard/movimientos?help=1',
  },
  {
    id: 'remittances',
    icon: <CreditCard className="h-5 w-5" />,
    href: '/dashboard/movimientos',
    helpHref: '/dashboard/movimientos?help=1',
  },
  {
    id: 'splitRemittance',
    icon: <Scissors className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'stripeDonations',
    icon: <Wallet className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'travelReceipts',
    icon: <Smartphone className="h-5 w-5" />,
    href: '/dashboard/project-module/expenses/capture',
  },
  {
    id: 'donors',
    icon: <Users className="h-5 w-5" />,
    href: '/dashboard/donants',
  },
  {
    id: 'reports',
    icon: <FileText className="h-5 w-5" />,
    href: '/dashboard/informes',
  },
  {
    id: 'projects',
    icon: <FolderKanban className="h-5 w-5" />,
    href: '/dashboard/project-module/expenses',
  },
  {
    id: 'monthlyFlow',
    icon: <RefreshCw className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'yearEndFiscal',
    icon: <CalendarCheck className="h-5 w-5" />,
    href: '/dashboard/informes',
  },
  {
    id: 'accessSecurity',
    icon: <Shield className="h-5 w-5" />,
    href: '/dashboard',
  },
  {
    id: 'initialLoad',
    icon: <Upload className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'changeLanguage',
    icon: <Languages className="h-5 w-5" />,
    href: '/dashboard/configuracion',
  },
  {
    id: 'importDonors',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    href: '/dashboard/donants',
  },
  {
    id: 'generateDonorCertificate',
    icon: <Award className="h-5 w-5" />,
    href: '/dashboard/donants',
  },
  {
    id: 'model182HasErrors',
    icon: <AlertCircle className="h-5 w-5" />,
    href: '/dashboard/donants',
  },
  {
    id: 'model182',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    href: '/dashboard/informes',
  },
  {
    id: 'model347',
    icon: <FileSpreadsheet className="h-5 w-5" />,
    href: '/dashboard/informes',
  },
  {
    id: 'certificatesBatch',
    icon: <Award className="h-5 w-5" />,
    href: '/dashboard/informes',
  },
  {
    id: 'donorSetInactive',
    icon: <UserMinus className="h-5 w-5" />,
    href: '/dashboard/donants',
  },
  {
    id: 'donorReactivate',
    icon: <UserCheck className="h-5 w-5" />,
    href: '/dashboard/donants',
  },
  {
    id: 'editMovement',
    icon: <Pencil className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'movementFilters',
    icon: <Filter className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'bulkAICategorize',
    icon: <Sparkles className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'remittanceViewDetail',
    icon: <Eye className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'resetPassword',
    icon: <KeyRound className="h-5 w-5" />,
    href: '/login',
  },
  {
    id: 'updateExistingDonors',
    icon: <RefreshCcwDot className="h-5 w-5" />,
    href: '/dashboard/donants',
  },
  {
    id: 'remittanceLowMembers',
    icon: <UserX className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'saveRemittanceMapping',
    icon: <Save className="h-5 w-5" />,
    href: '/dashboard/movimientos',
  },
  {
    id: 'toggleRemittanceItems',
    icon: <ToggleLeft className="h-5 w-5" />,
    href: '/dashboard/movimientos',
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
  // Moviments
  'movements',
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
  // Donants
  'donors',
  'importDonors',
  'updateExistingDonors',
  'donorSetInactive',
  'donorReactivate',
  'generateDonorCertificate',
  // Projectes
  'projects',
  // Informes
  'reports',
  // Configuració
  'changeLanguage',
  // Zona Perill
  'dangerDeleteLastRemittance',
];

// Bloc C: "Fluxos" — Checklists seqüencials (onboarding, mensual, anual)
const FLOW_GUIDE_IDS = [
  // Onboarding
  'firstDay',
  'firstMonth',
  'initialLoad',
  // Flux recurrent
  'monthlyFlow',
  'monthClose',
  // Tancament anual
  'yearEndFiscal',
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
// Search helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalitza text: minúscules + elimina accents
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tokenitza text en paraules (split per espais i puntuació)
 */
function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[\s,.;:!?¿¡()\[\]{}'"«»""'']+/)
    .filter((t) => t.length > 1);
}

/**
 * Carrega stopwords des de i18n (guides.search.stopwords.0..n)
 */
function loadStopwords(tr: (key: string) => string): Set<string> {
  const stopwords = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const key = `guides.search.stopwords.${i}`;
    const value = tr(key);
    if (value === key) break; // No més stopwords
    stopwords.add(normalize(value));
  }
  return stopwords;
}

/**
 * Carrega sinònims des de i18n (guides.search.syn.<canonical>.0..n)
 * Retorna Map<variant, canonical> per lookup ràpid
 */
function loadSynonyms(tr: (key: string) => string): Map<string, string> {
  const synonyms = new Map<string, string>();
  const canonicals = [
    'no_veig', 'moviments', 'remesa', 'devolucions', 'stripe',
    'certificat', 'model182', 'model347', 'categoria', 'importar',
    'donants', 'filtrar', 'periode', 'document', 'error',
    'quadrar', 'massiu',
  ];

  for (const canonical of canonicals) {
    for (let i = 0; i < 20; i++) {
      const key = `guides.search.syn.${canonical}.${i}`;
      const value = tr(key);
      if (value === key) break; // No més variants
      synonyms.set(normalize(value), canonical);
    }
    // El canònic també mapeja a si mateix
    synonyms.set(normalize(canonical.replace(/_/g, ' ')), canonical);
  }

  return synonyms;
}

type IndexedGuide = {
  id: string;
  searchText: string; // title + summary + cardText normalitzat
  titleNorm: string;
  summaryNorm: string;
  cardTextNorm: string;
};

type SearchResult = {
  guideId: string;
  score: number;
};

/**
 * Cerca guies amb scoring
 * +50 match a title, +20 match a summary, +10 match a cardText, +5 match via synonym
 */
function searchGuides(
  query: string,
  indexedGuides: IndexedGuide[],
  stopwords: Set<string>,
  synonyms: Map<string, string>
): SearchResult[] {
  const tokens = tokenize(query).filter((t) => !stopwords.has(t));
  if (tokens.length === 0) return [];

  const results: SearchResult[] = [];

  for (const guide of indexedGuides) {
    let score = 0;

    for (const token of tokens) {
      // Match directe
      if (guide.titleNorm.includes(token)) score += 50;
      if (guide.summaryNorm.includes(token)) score += 20;
      if (guide.cardTextNorm.includes(token)) score += 10;

      // Match via synonym
      const canonical = synonyms.get(token);
      if (canonical) {
        const canonicalNorm = normalize(canonical.replace(/_/g, ' '));
        if (guide.titleNorm.includes(canonicalNorm)) score += 45;
        else if (guide.summaryNorm.includes(canonicalNorm)) score += 15;
        else if (guide.cardTextNorm.includes(canonicalNorm)) score += 5;
        // Bonus si el canonical apareix en qualsevol lloc
        else if (guide.searchText.includes(canonicalNorm)) score += 5;
      }
    }

    if (score > 0) {
      results.push({ guideId: guide.id, score });
    }
  }

  // Ordenar per score descendent
  return results.sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export default function GuidesPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;
  const { tr } = useTranslations();

  // Search state
  const [searchQuery, setSearchQuery] = React.useState('');

  const buildUrl = (path: string) => `/${orgSlug}${path}`;

  // Page-level translations (amb fallback humà)
  const pageTitle = safeTr(tr, 'guides.pageTitle', 'Guies');
  const viewHelp = safeTr(tr, 'guides.viewHelp', 'Ajuda');

  // Search UI translations
  const searchPlaceholder = safeTr(tr, 'guides.search.placeholder', 'Què et passa?');
  const searchHelper = safeTr(tr, 'guides.search.helper', 'Escriu com ho diries...');
  const noResultsTitle = safeTr(tr, 'guides.search.noResultsTitle', 'No he trobat cap guia');
  const noResultsHint = safeTr(tr, 'guides.search.noResultsHint', 'Prova amb paraules clau...');
  const suggestionsTitle = safeTr(tr, 'guides.search.suggestionsTitle', 'Suggeriments');

  // Carrega stopwords i sinònims (memo per evitar recàlculs)
  const stopwords = React.useMemo(() => loadStopwords(tr), [tr]);
  const synonyms = React.useMemo(() => loadSynonyms(tr), [tr]);

  // Indexa guies (title + summary + cardText)
  const indexedGuides = React.useMemo<IndexedGuide[]>(() => {
    return GUIDES.map((guide) => {
      const titleKey = `guides.${guide.id}.title`;
      const summaryKey = `guides.${guide.id}.summary`;
      const cardTextKey = `guides.${guide.id}.cardText`;

      const title = tr(titleKey);
      const summary = tr(summaryKey);
      const cardText = tr(cardTextKey);

      const titleNorm = title !== titleKey ? normalize(title) : '';
      const summaryNorm = summary !== summaryKey ? normalize(summary) : '';
      const cardTextNorm = cardText !== cardTextKey ? normalize(cardText) : '';

      return {
        id: guide.id,
        searchText: `${titleNorm} ${summaryNorm} ${cardTextNorm}`,
        titleNorm,
        summaryNorm,
        cardTextNorm,
      };
    });
  }, [tr]);

  // Cerca resultats
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchGuides(searchQuery, indexedGuides, stopwords, synonyms);
  }, [searchQuery, indexedGuides, stopwords, synonyms]);

  // Suggeriments (chips)
  const suggestions = React.useMemo(() => {
    const items: string[] = [];
    for (let i = 0; i < 5; i++) {
      const key = `guides.search.suggestion.${i}`;
      const value = tr(key);
      if (value !== key) items.push(value);
    }
    return items;
  }, [tr]);

  const hasQuery = searchQuery.trim().length > 0;

  // Helper per renderitzar cardText amb colors i jerarquia
  // Format: "Què vol dir:...\n\nPas a pas:...\n\nSegurament t'ajudarà:..."
  const renderCardText = (text: string) => {
    // Patrons per detectar seccions (multiidioma)
    const sections: { pattern: RegExp; className: string }[] = [
      {
        pattern: /^(Què vol dir:|Qué significa:|Que signifie:|O que significa:)/i,
        className: 'text-muted-foreground' // gris
      },
      {
        pattern: /^(Pas a pas:|Paso a paso:|Pas à pas:|Passo a passo:)/i,
        className: 'text-foreground font-medium' // neutral, destacat
      },
      {
        pattern: /^(Segurament t'ajudarà:|Seguramente te ayudará:|Cela vous aidera sûrement:|Isso vai te ajudar:)/i,
        className: 'text-blue-600 dark:text-blue-400' // blau
      },
    ];

    // Dividir per paràgrafs
    const paragraphs = text.split('\n\n');

    return (
      <div className="space-y-3">
        {paragraphs.map((paragraph, i) => {
          // Trobar quin tipus de secció és
          let sectionClass = 'text-muted-foreground';
          for (const { pattern, className } of sections) {
            if (pattern.test(paragraph.trim())) {
              sectionClass = className;
              break;
            }
          }

          // Separar el header (primera línia) del contingut
          const lines = paragraph.split('\n');
          const firstLine = lines[0];
          const restLines = lines.slice(1).join('\n');

          return (
            <div key={i} className={sectionClass}>
              <div className="font-medium">{firstLine}</div>
              {restLines && (
                <div className="whitespace-pre-wrap mt-1">{restLines}</div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Helper per renderitzar una card del Bloc A (problema) amb cardText complet
  const renderProblemCard = (guideId: string) => {
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

    // cardText amb fallback a summary
    const cardTextKey = `guides.${guide.id}.cardText`;
    const cardText = tr(cardTextKey);
    const hasCardText = !isUnresolvedKey(cardText, cardTextKey);

    let description = '';
    if (hasCardText) {
      description = cardText;
    } else {
      // Fallback a summary si no hi ha cardText
      const summaryKey = `guides.${guide.id}.summary`;
      const summary = tr(summaryKey);
      if (!isUnresolvedKey(summary, summaryKey)) {
        description = summary;
      }
    }

    return (
      <Card key={guide.id} className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
              {guide.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight">{title}</CardTitle>
            </div>
          </div>
          {description && (
            <div className="mt-3 text-sm leading-6">
              {hasCardText ? renderCardText(description) : (
                <span className="text-muted-foreground">{description}</span>
              )}
            </div>
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
          </div>
        </CardContent>
      </Card>
    );
  };

  // Helper per renderitzar una card del Bloc B (acció) amb cardText complet
  const renderActionCard = (guideId: string) => {
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

    // cardText amb fallback a summary
    const cardTextKey = `guides.${guide.id}.cardText`;
    const cardText = tr(cardTextKey);
    const hasCardText = !isUnresolvedKey(cardText, cardTextKey);

    let description = '';
    if (hasCardText) {
      description = cardText;
    } else {
      const summaryKey = `guides.${guide.id}.summary`;
      const summary = tr(summaryKey);
      if (!isUnresolvedKey(summary, summaryKey)) {
        description = summary;
      }
    }

    return (
      <Card key={guide.id} className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              {guide.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight">{title}</CardTitle>
            </div>
          </div>
          {description && (
            <div className="mt-3 text-sm leading-6">
              {hasCardText ? renderCardText(description) : (
                <span className="text-muted-foreground">{description}</span>
              )}
            </div>
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
          </div>
        </CardContent>
      </Card>
    );
  };

  // Helper per renderitzar una card del Bloc C (flux) amb cardText complet
  const renderFlowCard = (guideId: string) => {
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

    // cardText amb fallback a summary
    const cardTextKey = `guides.${guide.id}.cardText`;
    const cardText = tr(cardTextKey);
    const hasCardText = !isUnresolvedKey(cardText, cardTextKey);

    let description = '';
    if (hasCardText) {
      description = cardText;
    } else {
      const summaryKey = `guides.${guide.id}.summary`;
      const summary = tr(summaryKey);
      if (!isUnresolvedKey(summary, summaryKey)) {
        description = summary;
      }
    }

    return (
      <Card key={guide.id} className="flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
              {guide.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight">{title}</CardTitle>
            </div>
          </div>
          {description && (
            <div className="mt-3 text-sm leading-6">
              {hasCardText ? renderCardText(description) : (
                <span className="text-muted-foreground">{description}</span>
              )}
            </div>
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
          </div>
        </CardContent>
      </Card>
    );
  };

  // Helper per renderitzar una card de resultat de cerca
  const renderSearchResultCard = (guideId: string) => {
    const guide = GUIDES.find((g) => g.id === guideId);
    if (!guide) return null;

    const titleKey = `guides.${guide.id}.title`;
    const titleValue = tr(titleKey);
    const titleResolved = !isUnresolvedKey(titleValue, titleKey);

    if (!titleResolved) return null;

    const title = titleValue;
    const summaryKey = `guides.${guide.id}.summary`;
    const summary = tr(summaryKey);
    const hasSummary = !isUnresolvedKey(summary, summaryKey);

    // Determinar color segons bloc
    let bgColor = 'bg-muted/50';
    let iconColor = 'text-muted-foreground';
    if (PROBLEM_GUIDE_IDS.includes(guideId)) {
      bgColor = 'bg-amber-100 dark:bg-amber-900/30';
      iconColor = 'text-amber-700 dark:text-amber-300';
    } else if (ACTION_GUIDE_IDS.includes(guideId)) {
      bgColor = 'bg-blue-100 dark:bg-blue-900/30';
      iconColor = 'text-blue-700 dark:text-blue-300';
    } else if (FLOW_GUIDE_IDS.includes(guideId)) {
      bgColor = 'bg-green-100 dark:bg-green-900/30';
      iconColor = 'text-green-700 dark:text-green-300';
    }

    return (
      <Card
        key={guide.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => {
          // Scroll to guide section (si volem)
          setSearchQuery(''); // Clear search to show all blocks
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${bgColor} ${iconColor}`}>
              {guide.icon}
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base leading-tight">{title}</CardTitle>
              {hasSummary && (
                <CardDescription className="mt-1 line-clamp-2">{summary}</CardDescription>
              )}
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href={buildUrl(guide.href)}>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
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

      {/* Search bar */}
      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{searchHelper}</p>
      </div>

      {/* Search results (when query exists) */}
      {hasQuery && (
        <div className="mb-8">
          {searchResults.length > 0 ? (
            <div className="space-y-3">
              {searchResults.slice(0, 10).map((result) => renderSearchResultCard(result.guideId))}
            </div>
          ) : (
            <div className="rounded-lg bg-muted/50 p-6 text-center">
              <p className="text-lg font-medium text-foreground mb-2">{noResultsTitle}</p>
              <p className="text-sm text-muted-foreground mb-4">{noResultsHint}</p>
              <div className="flex flex-wrap justify-center gap-2">
                <span className="text-sm text-muted-foreground">{suggestionsTitle}:</span>
                {suggestions.map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setSearchQuery(suggestion)}
                    className="px-3 py-1 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Blocks (only when no query or empty results) */}
      {!hasQuery && (
        <>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PROBLEM_GUIDE_IDS.map((id) => renderProblemCard(id))}
        </div>
      </section>

      {/* Bloc C: Fluxos */}
      <section className="rounded-lg bg-green-50 dark:bg-green-950/20 p-5 mb-8">
        <div className="mb-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-green-900 dark:text-green-100">
            <ListChecks className="h-5 w-5" />
            Fluxos
          </h2>
          <p className="text-sm text-green-800 dark:text-green-200 mt-1">
            Checklists seqüencials: onboarding, mensual i anual.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FLOW_GUIDE_IDS.map((id) => renderFlowCard(id))}
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
          {ACTION_GUIDE_IDS.map((id) => renderActionCard(id))}
        </div>
      </section>
        </>
      )}
    </div>
  );
}
