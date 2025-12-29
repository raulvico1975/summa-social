'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle, BookOpen, Link2, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useTranslations } from '@/i18n';
import type { HelpContent, HelpRouteKey } from '@/help/help-types';
import { HELP_CONTENT_CA, HELP_FALLBACK_CA } from '@/help/ca/help-content';
import { HELP_CONTENT_ES } from '@/help/es/help-content';
import { HELP_CONTENT_FR } from '@/help/fr/help-content';
import { getManualAnchorForRoute } from '@/help/help-manual-links';
import { trackUX } from '@/lib/ux/trackUX';

const HELP_FEEDBACK_EMAIL = 'ajuda@summasocial.app';

// UI strings per idioma
const UI_STRINGS = {
  ca: {
    searchPlaceholder: "Cerca dins l'ajuda…",
    viewManual: 'Veure al manual',
    copyLink: 'Copiar enllaç',
    suggest: 'Suggerir una millora',
    noHelp: 'Aquesta pantalla encara no té ajuda.',
    noSteps: 'Encara no hi ha passos definits per aquesta pantalla.',
    noResults: (q: string) => `No s'han trobat resultats per "${q}".`,
    linkCopied: 'Enllaç copiat',
    linkCopiedDesc: 'Ara pots compartir aquest enllaç amb algú altre.',
    steps: 'Passos',
    tips: 'Consells',
    tooltipHelp: "Ajuda d'aquesta pantalla",
  },
  es: {
    searchPlaceholder: 'Buscar en la ayuda…',
    viewManual: 'Ver en el manual',
    copyLink: 'Copiar enlace',
    suggest: 'Sugerir una mejora',
    noHelp: 'Esta pantalla aún no tiene ayuda.',
    noSteps: 'Aún no hay pasos definidos para esta pantalla.',
    noResults: (q: string) => `No se han encontrado resultados para "${q}".`,
    linkCopied: 'Enlace copiado',
    linkCopiedDesc: 'Ahora puedes compartir este enlace con otra persona.',
    steps: 'Pasos',
    tips: 'Consejos',
    tooltipHelp: 'Ayuda de esta pantalla',
  },
  fr: {
    searchPlaceholder: "Rechercher dans l'aide…",
    viewManual: 'Voir dans le manuel',
    copyLink: 'Copier le lien',
    suggest: 'Suggérer une amélioration',
    noHelp: "Cet écran n'a pas encore d'aide.",
    noSteps: "Aucune étape n'est encore définie pour cet écran.",
    noResults: (q: string) => `Aucun résultat pour "${q}".`,
    linkCopied: 'Lien copié',
    linkCopiedDesc: 'Vous pouvez maintenant partager ce lien.',
    steps: 'Étapes',
    tips: 'Conseils',
    tooltipHelp: 'Aide de cet écran',
  },
} as const;

/**
 * Normalitza un pathname eliminant el segment orgSlug inicial.
 * Ex: /acme/dashboard/movimientos -> /dashboard/movimientos
 */
function normalizePathname(pathname: string): HelpRouteKey {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && parts[0] !== 'dashboard') {
    parts.shift();
  }
  return '/' + parts.join('/');
}

/**
 * Highlights matching text with a <mark> tag.
 */
function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);

  if (index === -1) return text;

  const before = text.slice(0, index);
  const match = text.slice(index, index + query.length);
  const after = text.slice(index + query.length);

  return (
    <>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800 px-0.5 rounded">{match}</mark>
      {after}
    </>
  );
}

/**
 * Filters an array of strings by substring match.
 */
function filterByQuery(items: string[] | undefined, query: string): string[] {
  if (!items || !query.trim()) return items ?? [];
  const lowerQuery = query.toLowerCase();
  return items.filter((item) => item.toLowerCase().includes(lowerQuery));
}

/**
 * Extracts the orgSlug from a pathname.
 * E.g., /acme/dashboard/movimientos -> acme
 */
function getOrgSlug(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length > 0 && parts[0] !== 'dashboard') {
    return parts[0];
  }
  return null;
}

/**
 * Get help content with locale fallback to CA.
 */
function getHelpContent(routeKey: HelpRouteKey, locale: 'ca' | 'es' | 'fr'): HelpContent {
  // Try localized content first
  if (locale === 'es') {
    const esContent = HELP_CONTENT_ES[routeKey];
    if (esContent) return esContent;
  } else if (locale === 'fr') {
    const frContent = HELP_CONTENT_FR[routeKey];
    if (frContent) return frContent;
  }

  // Fallback to CA
  return HELP_CONTENT_CA[routeKey] ?? HELP_FALLBACK_CA;
}

export function HelpSheet() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { language } = useTranslations();
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  // Ref to track how the sheet was opened
  const openSourceRef = React.useRef<'button' | 'deeplink'>('button');
  // Ref for search debounce timer
  const searchDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  const orgSlug = getOrgSlug(pathname);
  const routeKey = normalizePathname(pathname);
  const helpContent = getHelpContent(routeKey, language);
  const manualAnchor = getManualAnchorForRoute(routeKey);
  const manualBase = orgSlug ? `/${orgSlug}/dashboard/manual` : '/dashboard/manual';
  const manualUrl = manualAnchor ? `${manualBase}#${manualAnchor}` : manualBase;

  // UI strings for current locale
  const ui = UI_STRINGS[language] ?? UI_STRINGS.ca;

  // Build feedback mailto URL
  const feedbackMailto = React.useMemo(() => {
    const subject = encodeURIComponent('Summa Social · Suggeriment d\'ajuda');
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const body = encodeURIComponent(
      `Pantalla: ${routeKey}\n` +
      `URL: ${currentUrl}\n` +
      `Cerca a l'ajuda: ${query || '(cap)'}\n\n` +
      `Què faltava o què no s'entén?\n\n\n` +
      `Proposta de text (si la tens):\n`
    );
    return `mailto:${HELP_FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
  }, [routeKey, query]);

  // Track help.open when sheet opens
  React.useEffect(() => {
    if (open) {
      trackUX('help.open', {
        routeKey,
        locale: language,
        source: openSourceRef.current,
      });
    }
  }, [open, routeKey, language]);

  // Auto-open if ?help=1
  React.useEffect(() => {
    if (searchParams.get('help') === '1') {
      openSourceRef.current = 'deeplink';
      setOpen(true);
    }
  }, [searchParams]);

  // Reset query when pathname changes
  React.useEffect(() => {
    setQuery('');
  }, [pathname]);

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;

    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('help', '1');
    const helpUrl = currentUrl.toString();

    trackUX('help.copyLink', { routeKey, locale: language });

    try {
      await navigator.clipboard.writeText(helpUrl);
      toast({
        title: ui.linkCopied,
        description: ui.linkCopiedDesc,
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut copiar l\'enllaç.',
      });
    }
  };

  // Handle sheet open/close with tracking
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      openSourceRef.current = 'button';
    }
    setOpen(newOpen);
  };

  // Handle manual link click
  const handleManualClick = () => {
    trackUX('help.manual.click', {
      routeKey,
      locale: language,
      anchor: manualAnchor || null,
    });
  };

  // Handle feedback link click
  const handleFeedbackClick = () => {
    trackUX('help.feedback.click', { routeKey, locale: language });
  };

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);

    // Clear previous timer
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Only track if query is meaningful (>= 2 chars)
    if (newQuery.trim().length >= 2) {
      searchDebounceRef.current = setTimeout(() => {
        const steps = filterByQuery(helpContent.steps, newQuery);
        const tips = filterByQuery(helpContent.tips, newQuery);
        trackUX('help.search', {
          routeKey,
          locale: language,
          queryLen: newQuery.trim().length,
          hasResults: steps.length > 0 || tips.length > 0,
          matchesSteps: steps.length,
          matchesTips: tips.length,
        });
      }, 500);
    }
  };

  const filteredSteps = filterByQuery(helpContent.steps, query);
  const filteredTips = filterByQuery(helpContent.tips, query);

  const hasQuery = query.trim().length > 0;
  const hasResults = filteredSteps.length > 0 || filteredTips.length > 0;
  const showNoResults = hasQuery && !hasResults;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={ui.tooltipHelp}
              className="h-9 w-9"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{ui.tooltipHelp}</p>
        </TooltipContent>
      </Tooltip>

      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{helpContent.title}</SheetTitle>
        </SheetHeader>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={manualUrl} onClick={handleManualClick}>
              <BookOpen className="h-4 w-4 mr-2" />
              {ui.viewManual}
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Link2 className="h-4 w-4 mr-2" />
            {ui.copyLink}
          </Button>
        </div>

        <div className="mt-4">
          <Input
            type="text"
            placeholder={ui.searchPlaceholder}
            value={query}
            onChange={handleSearchChange}
            className="w-full"
          />
        </div>

        <div className="mt-6 space-y-4">
          {helpContent.intro && !hasQuery && (
            <p className="text-muted-foreground">{helpContent.intro}</p>
          )}

          {showNoResults ? (
            <p className="text-sm text-muted-foreground italic">
              {ui.noResults(query)}
            </p>
          ) : (
            <>
              {filteredSteps.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">{ui.steps}</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    {filteredSteps.map((step, index) => (
                      <li key={index}>{highlightText(step, query)}</li>
                    ))}
                  </ol>
                </div>
              )}

              {filteredTips.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">{ui.tips}</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {filteredTips.map((tip, index) => (
                      <li key={index}>{highlightText(tip, query)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasQuery && filteredSteps.length === 0 && filteredTips.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  {ui.noSteps}
                </p>
              )}
            </>
          )}
        </div>

        {/* Feedback link */}
        <div className="mt-6 pt-4 border-t">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <a href={feedbackMailto} rel="noreferrer" onClick={handleFeedbackClick}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {ui.suggest}
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
