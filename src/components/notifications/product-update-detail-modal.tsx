// src/components/notifications/product-update-detail-modal.tsx
// Modal per veure detall d'una novetat del producte

'use client';

import * as React from 'react';
import { ArrowRight, ExternalLink, BookOpen, CalendarDays, Play } from 'lucide-react';
import Link from 'next/link';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useOrgUrl } from '@/hooks/organization-provider';
import { useTranslations } from '@/i18n';
import { renderStructuredText } from '@/lib/render-structured-text';
import type { FirestoreProductUpdate } from '@/hooks/use-product-updates';

interface ProductUpdateDetailModalProps {
  update: FirestoreProductUpdate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function isExternalUrl(value?: string | null): value is string {
  return typeof value === 'string' && /^https?:\/\//.test(value);
}

function formatUpdateDate(value: string, language: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(language === 'ca' ? 'ca-ES' : 'es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function ProductUpdateDetailModal({
  update,
  open,
  onOpenChange,
}: ProductUpdateDetailModalProps) {
  const { buildUrl } = useOrgUrl();
  const { t, language } = useTranslations();

  if (!update) return null;

  const hasContentLong = update.contentLong && update.contentLong.trim().length > 0;
  const hasGuideUrl = update.guideUrl && update.guideUrl.trim().length > 0;
  const hasVideoUrl = update.videoUrl && update.videoUrl.trim().length > 0;
  const hasPublicSlug = update.publicSlug && update.publicSlug.trim().length > 0;
  const summary = update.publicExcerpt && update.publicExcerpt.trim().length > 0
    ? update.publicExcerpt
    : update.body;
  const publicHref = hasPublicSlug ? `/${language}/novetats/${update.publicSlug}` : null;
  const publishedAt = formatUpdateDate(update.createdAt, language);
  const guideHref = hasGuideUrl
    ? (isExternalUrl(update.guideUrl) ? update.guideUrl : buildUrl(update.guideUrl!))
    : null;
  const legacyActionHref = update.appActions?.length
    ? null
    : update.href && !publicHref
    ? (isExternalUrl(update.href) ? update.href : buildUrl(update.href))
    : null;
  const appActions = (update.appActions ?? []).map((action) => ({
    ...action,
    href: buildUrl(action.href),
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{update.title}</DialogTitle>
          <DialogDescription>{summary}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {publishedAt && (
            <p className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 text-primary" />
              {publishedAt}
            </p>
          )}
          {/* Contingut llarg (text pla estructurat) */}
          {hasContentLong && (
            <div className="text-sm text-muted-foreground">
              {renderStructuredText(update.contentLong)}
            </div>
          )}

          {/* Links a guia i vídeo */}
          {(hasGuideUrl || hasVideoUrl) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {guideHref && (
                isExternalUrl(guideHref) ? (
                  <Button variant="outline" size="sm" asChild>
                    <a href={guideHref} target="_blank" rel="noopener noreferrer">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {t.productUpdates.viewGuide}
                    </a>
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" asChild>
                    <Link href={guideHref} onClick={() => onOpenChange(false)}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      {t.productUpdates.viewGuide}
                    </Link>
                  </Button>
                )
              )}
              {hasVideoUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a
                    href={update.videoUrl!}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {t.productUpdates.viewVideo}
                  </a>
                </Button>
              )}
            </div>
          )}

          {/* Accions dins de Summa i lectura pública */}
          {(appActions.length > 0 || legacyActionHref || publicHref) && (
            <div className="space-y-2 border-t pt-4">
              {appActions.map((action) => (
                <Button key={action.href} asChild className="w-full">
                  <Link href={action.href} onClick={() => onOpenChange(false)}>
                    {action.label}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ))}
              {legacyActionHref && (
                <Button asChild className="w-full">
                  {isExternalUrl(legacyActionHref) ? (
                    <a href={legacyActionHref} target="_blank" rel="noopener noreferrer">
                      {update.ctaLabel ?? t.productUpdates.openUpdate}
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </a>
                  ) : (
                    <Link href={legacyActionHref} onClick={() => onOpenChange(false)}>
                      {update.ctaLabel ?? t.productUpdates.openUpdate}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  )}
                </Button>
              )}
              {publicHref && (
                <Button asChild variant="outline" className="w-full">
                  <Link href={publicHref} onClick={() => onOpenChange(false)}>
                    {t.productUpdates.readOnWeb}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
