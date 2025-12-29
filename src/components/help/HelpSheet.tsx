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
import { getHelpContent, normalizePathname } from '@/help/help-content';
import { getManualAnchorForRoute } from '@/help/help-manual-links';

const HELP_FEEDBACK_EMAIL = 'ajuda@summasocial.app';

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

export function HelpSheet() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const helpContent = getHelpContent(pathname);
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const orgSlug = getOrgSlug(pathname);
  const routeKey = normalizePathname(pathname);
  const manualAnchor = getManualAnchorForRoute(routeKey);
  const manualBase = orgSlug ? `/${orgSlug}/dashboard/manual` : '/dashboard/manual';
  const manualUrl = manualAnchor ? `${manualBase}#${manualAnchor}` : manualBase;

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

  // Auto-open if ?help=1
  React.useEffect(() => {
    if (searchParams.get('help') === '1') {
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

    try {
      await navigator.clipboard.writeText(helpUrl);
      toast({
        title: 'Enllaç copiat',
        description: 'Ara pots compartir aquest enllaç amb algú altre.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No s\'ha pogut copiar l\'enllaç.',
      });
    }
  };

  const filteredSteps = filterByQuery(helpContent.steps, query);
  const filteredTips = filterByQuery(helpContent.tips, query);

  const hasQuery = query.trim().length > 0;
  const hasResults = filteredSteps.length > 0 || filteredTips.length > 0;
  const showNoResults = hasQuery && !hasResults;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ajuda"
              className="h-9 w-9"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Ajuda d&apos;aquesta pantalla</p>
        </TooltipContent>
      </Tooltip>

      <SheetContent side="right" className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{helpContent.title}</SheetTitle>
        </SheetHeader>

        {/* Action buttons */}
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={manualUrl}>
              <BookOpen className="h-4 w-4 mr-2" />
              Veure al manual
            </Link>
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyLink}>
            <Link2 className="h-4 w-4 mr-2" />
            Copiar enllaç
          </Button>
        </div>

        <div className="mt-4">
          <Input
            type="text"
            placeholder="Cerca dins l'ajuda…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full"
          />
        </div>

        <div className="mt-6 space-y-4">
          {helpContent.intro && !hasQuery && (
            <p className="text-muted-foreground">{helpContent.intro}</p>
          )}

          {showNoResults ? (
            <p className="text-sm text-muted-foreground italic">
              No s&apos;han trobat resultats per &quot;{query}&quot;.
            </p>
          ) : (
            <>
              {filteredSteps.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Passos</h3>
                  <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                    {filteredSteps.map((step, index) => (
                      <li key={index}>{highlightText(step, query)}</li>
                    ))}
                  </ol>
                </div>
              )}

              {filteredTips.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Consells</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {filteredTips.map((tip, index) => (
                      <li key={index}>{highlightText(tip, query)}</li>
                    ))}
                  </ul>
                </div>
              )}

              {!hasQuery && filteredSteps.length === 0 && filteredTips.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  Encara no hi ha passos definits per aquesta pantalla.
                </p>
              )}
            </>
          )}
        </div>

        {/* Feedback link */}
        <div className="mt-6 pt-4 border-t">
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <a href={feedbackMailto} rel="noreferrer">
              <MessageSquare className="h-4 w-4 mr-2" />
              Suggerir una millora
            </a>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
