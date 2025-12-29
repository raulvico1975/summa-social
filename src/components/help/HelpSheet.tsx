'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

export function HelpSheet() {
  const pathname = usePathname();
  const helpContent = getHelpContent(pathname);

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

        <div className="mt-6 space-y-4">
          {helpContent.intro && (
            <p className="text-muted-foreground">{helpContent.intro}</p>
          )}

          {helpContent.steps && helpContent.steps.length > 0 ? (
            <div className="space-y-2">
              <h3 className="font-medium">Passos</h3>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                {helpContent.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Encara no hi ha passos definits per aquesta pantalla.
            </p>
          )}

          {helpContent.tips && helpContent.tips.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-medium">Consells</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {helpContent.tips.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
