'use client';

import * as React from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

import { FEATURE_ANNOUNCEMENT } from '@/content/product-updates';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function getDismissKey(id: string) {
  return `ss:featureAnnouncement:dismissed:${id}`;
}

export function FeatureAnnouncementBanner() {
  const announcement = FEATURE_ANNOUNCEMENT;

  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (!announcement) return;

    try {
      const dismissed = localStorage.getItem(getDismissKey(announcement.id)) === '1';
      if (!dismissed) setIsVisible(true);
    } catch {
      // Si localStorage falla, preferim mostrar-ho igualment
      setIsVisible(true);
    }
  }, [announcement?.id]);

  if (!announcement || !isVisible) return null;

  const onDismiss = () => {
    try {
      localStorage.setItem(getDismissKey(announcement.id), '1');
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  return (
    <div
      className={cn(
        'rounded-lg border bg-muted/30 px-4 py-3',
        'animate-in fade-in duration-200'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">✨</div>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{announcement.text}</div>

          {announcement.cta ? (
            <div className="mt-1">
              <Link href={announcement.cta.href} className="text-sm underline underline-offset-4">
                {announcement.cta.label}
              </Link>
            </div>
          ) : null}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onDismiss}
          className="shrink-0"
          aria-label="Tancar avís"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
