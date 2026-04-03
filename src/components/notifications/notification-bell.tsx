// src/components/notifications/notification-bell.tsx
// Novetats a Summa - Acompanya l'usuari amb les últimes novetats
// Llegeix de Firestore amb fallback a legacy hardcoded

'use client';

import * as React from 'react';
import { Inbox, Check, CheckCheck, ChevronRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from '@/i18n';
import { useProductUpdates, type FirestoreProductUpdate } from '@/hooks/use-product-updates';
import { ProductUpdateDetailModal } from './product-update-detail-modal';
import {
  getAutoOpenedNotificationIds,
  getReadNotificationIds,
  markNotificationAutoOpened,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications';

export function ProductUpdatesInbox() {
  const AUTO_OPEN_DURATION_MS = 3000;

  const { organizationId } = useCurrentOrganization();
  const { user } = useAuth();
  const { t, language } = useTranslations();

  // Carregar updates de Firestore amb fallback (hook centralitzat)
  const { updates } = useProductUpdates(language);

  const [readIds, setReadIds] = React.useState<string[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const autoCloseTimeoutRef = React.useRef<number | null>(null);
  const autoPreviewFrameRef = React.useRef<number | null>(null);
  const openModeRef = React.useRef<'auto' | 'manual' | null>(null);
  const [isAutoPreviewActive, setIsAutoPreviewActive] = React.useState(false);
  const [autoPreviewProgress, setAutoPreviewProgress] = React.useState(100);

  // Modal detall
  const [selectedUpdate, setSelectedUpdate] = React.useState<FirestoreProductUpdate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  const handleOpenDetail = (update: FirestoreProductUpdate) => {
    setSelectedUpdate(update);
    setIsDetailOpen(true);
    setIsOpen(false); // Tancar popover
  };

  // Carregar readIds al muntar
  React.useEffect(() => {
    if (organizationId && user?.uid) {
      setReadIds(getReadNotificationIds(organizationId, user.uid));
    }
  }, [organizationId, user?.uid]);

  React.useEffect(() => {
    return () => {
      if (autoCloseTimeoutRef.current !== null) {
        window.clearTimeout(autoCloseTimeoutRef.current);
      }
      if (autoPreviewFrameRef.current !== null) {
        window.cancelAnimationFrame(autoPreviewFrameRef.current);
      }
    };
  }, []);

  // Només els updates compten per al badge (roadmap no)
  const unreadUpdates = React.useMemo(
    () => updates.filter((u) => !readIds.includes(u.id)),
    [updates, readIds]
  );

  const unreadCount = unreadUpdates.length;
  const latestUnreadId = unreadUpdates[0]?.id;

  const handleMarkRead = React.useCallback(
    (updateId: string) => {
      if (!organizationId || !user?.uid) return;
      markNotificationRead(organizationId, user.uid, updateId);
      setReadIds((prev) => [...prev, updateId]);
    },
    [organizationId, user?.uid]
  );

  const handleMarkAllRead = React.useCallback(() => {
    if (!organizationId || !user?.uid) return;
    const allIds = updates.map((u) => u.id);
    markAllNotificationsRead(organizationId, user.uid, allIds);
    setReadIds((prev) => [...new Set([...prev, ...allIds])]);
  }, [organizationId, user?.uid, updates]);

  const isRead = (id: string) => readIds.includes(id);

  const clearAutoPreview = React.useCallback(() => {
    if (autoCloseTimeoutRef.current !== null) {
      window.clearTimeout(autoCloseTimeoutRef.current);
      autoCloseTimeoutRef.current = null;
    }
    if (autoPreviewFrameRef.current !== null) {
      window.cancelAnimationFrame(autoPreviewFrameRef.current);
      autoPreviewFrameRef.current = null;
    }
    setIsAutoPreviewActive(false);
    setAutoPreviewProgress(100);
  }, []);

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    clearAutoPreview();
    openModeRef.current = nextOpen ? 'manual' : null;
    setIsOpen(nextOpen);
  }, [clearAutoPreview]);

  React.useEffect(() => {
    if (!organizationId || !user?.uid) return;
    if (isOpen || isDetailOpen) return;

    if (!latestUnreadId) return;

    const autoOpenedIds = getAutoOpenedNotificationIds(organizationId, user.uid);
    if (autoOpenedIds.includes(latestUnreadId)) return;

    markNotificationAutoOpened(organizationId, user.uid, latestUnreadId);
    openModeRef.current = 'auto';
    setIsAutoPreviewActive(true);
    setAutoPreviewProgress(100);
    setIsOpen(true);

    autoPreviewFrameRef.current = window.requestAnimationFrame(() => {
      setAutoPreviewProgress(0);
      autoPreviewFrameRef.current = null;
    });

    autoCloseTimeoutRef.current = window.setTimeout(() => {
      if (openModeRef.current === 'auto') {
        setIsAutoPreviewActive(false);
        setIsOpen(false);
        openModeRef.current = null;
      }
      autoCloseTimeoutRef.current = null;
    }, AUTO_OPEN_DURATION_MS);
  }, [AUTO_OPEN_DURATION_MS, organizationId, user?.uid, latestUnreadId, unreadUpdates, isOpen, isDetailOpen]);

  // Si no hi ha cap update, no mostrar res
  if (updates.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t.productUpdates.tooltip({ count: unreadCount })}
        >
          <Inbox className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs font-bold rounded-full bg-sky-500 text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={10}
        className="w-[min(23rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-primary/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.92))] p-0 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.32),0_12px_34px_-26px_rgba(14,165,233,0.24)] ring-1 ring-black/5 backdrop-blur-xl duration-300 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2 data-[state=closed]:duration-300 data-[state=open]:duration-200"
      >
        <div className="h-1 bg-primary/10">
          <div
            className="h-full bg-gradient-to-r from-sky-300 via-primary to-sky-500 shadow-[0_0_18px_rgba(14,165,233,0.35)] transition-[width] ease-linear"
            style={{
              width: isAutoPreviewActive ? `${autoPreviewProgress}%` : '0%',
              transitionDuration: `${AUTO_OPEN_DURATION_MS}ms`,
            }}
          />
        </div>

        {/* Header */}
        <div className="flex flex-row items-center justify-between border-b border-primary/10 bg-white/72 px-3.5 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <h3 className="text-[15px] font-semibold tracking-[-0.01em]">{t.productUpdates.inboxTitle}</h3>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={handleMarkAllRead}
              title={t.productUpdates.markAllRead}
            >
              <CheckCheck className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Updates List */}
        <ScrollArea className="h-56">
          <div className="px-3 py-2.5">
            {updates.length > 0 ? (
              <div className="space-y-1.5">
                {updates.slice(0, 6).map((update) => {
                  const read = isRead(update.id);
                  const hasDetail = !!update.contentLong;
                  const canOpenDetail =
                    hasDetail ||
                    !!update.guideUrl ||
                    !!update.videoUrl ||
                    !!update.publicSlug ||
                    !!update.href;
                  const isFeaturedUnread = !read && update.id === latestUnreadId;
                  return (
                    <div
                      key={update.id}
                      className={`rounded-xl px-3 py-2.5 transition-all ${
                        canOpenDetail ? 'cursor-pointer hover:bg-muted/50' : ''
                      } ${read ? 'opacity-60' : ''} ${
                        isFeaturedUnread
                          ? 'border border-primary/20 bg-[linear-gradient(180deg,rgba(240,249,255,0.84),rgba(255,255,255,0.92))] shadow-[0_20px_44px_-36px_rgba(15,23,42,0.28),0_10px_24px_-20px_rgba(14,165,233,0.28)]'
                          : 'border border-transparent'
                      }`}
                      onClick={canOpenDetail ? () => handleOpenDetail(update) : undefined}
                      role={canOpenDetail ? 'button' : undefined}
                      tabIndex={canOpenDetail ? 0 : undefined}
                      onKeyDown={canOpenDetail ? (e) => e.key === 'Enter' && handleOpenDetail(update) : undefined}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] leading-snug ${read ? 'font-normal' : 'font-medium'}`}>
                            {update.title}
                          </p>
                          <p className="mt-1 text-[13px] leading-[1.35] text-muted-foreground line-clamp-2">
                            {update.body}
                          </p>
                          {canOpenDetail && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!read) {
                                  handleMarkRead(update.id);
                                }
                                handleOpenDetail(update);
                              }}
                              className="mt-2 inline-flex items-center gap-1 rounded-full border border-primary/18 bg-white/88 px-2.5 py-1 text-[11px] font-semibold tracking-[0.01em] text-primary shadow-[0_10px_24px_-20px_rgba(14,165,233,0.45)] transition-colors hover:border-primary/30 hover:bg-primary hover:text-primary-foreground hover:no-underline"
                            >
                              {update.ctaLabel ?? t.productUpdates.openUpdate}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0 mt-0.5">
                          {/* Indicador llegida o chevron per detall */}
                          {read ? (
                            <Check className="h-4 w-4 text-muted-foreground" />
                          ) : canOpenDetail ? (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkRead(update.id);
                              }}
                              aria-label={t.productUpdates.markAsRead}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                {t.productUpdates.noUpdates}
              </div>
            )}
          </div>
        </ScrollArea>

      </PopoverContent>

      {/* Modal detall */}
      <ProductUpdateDetailModal
        update={selectedUpdate}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
      />
    </Popover>
  );
}

// =============================================================================
// LEGACY EXPORT (compatibilitat amb codi existent)
// =============================================================================

/**
 * @deprecated Utilitza ProductUpdatesInbox directament.
 * Ara ProductUpdatesInbox carrega de Firestore amb fallback intern.
 */
export function NotificationBell() {
  return <ProductUpdatesInbox />;
}
