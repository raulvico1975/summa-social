'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
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
import { getHelpContent } from '@/help/help-content';

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

export function HelpSheet() {
  const pathname = usePathname();
  const helpContent = getHelpContent(pathname);
  const [query, setQuery] = React.useState('');

  // Reset query when pathname changes
  React.useEffect(() => {
    setQuery('');
  }, [pathname]);

  const filteredSteps = filterByQuery(helpContent.steps, query);
  const filteredTips = filterByQuery(helpContent.tips, query);

  const hasQuery = query.trim().length > 0;
  const hasResults = filteredSteps.length > 0 || filteredTips.length > 0;
  const showNoResults = hasQuery && !hasResults;

  return (
    <Sheet>
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
      </SheetContent>
    </Sheet>
  );
}
