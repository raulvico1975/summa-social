// src/components/notifications/notification-bell.tsx
// Novetats a Summa - Acompanya l'usuari amb les últimes novetats
// Llegeix de Firestore amb fallback a legacy hardcoded

'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, Check, CheckCheck, ChevronRight, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useOrgUrl, useCurrentOrganization } from '@/hooks/organization-provider';
import { useAuth } from '@/hooks/use-auth';
import { useTranslations } from '@/i18n';
import { useProductUpdates, type FirestoreProductUpdate } from '@/hooks/use-product-updates';
import { SUPER_ADMIN_UID } from '@/lib/data';
import { ProductUpdateDetailModal } from './product-update-detail-modal';
import {
  getReadNotificationIds,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications';

export function ProductUpdatesInbox() {
  const { organizationId } = useCurrentOrganization();
  const { user } = useAuth();
  const { buildUrl } = useOrgUrl();
  const { t } = useTranslations();

  // Carregar updates de Firestore amb fallback (hook centralitzat)
  const { updates, usingFallback, error } = useProductUpdates();

  // Detectar SuperAdmin per mostrar indicador de font
  const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;

  const [readIds, setReadIds] = React.useState<string[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

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

  // Només els updates compten per al badge (roadmap no)
  const unreadUpdates = React.useMemo(
    () => updates.filter((u) => !readIds.includes(u.id)),
    [updates, readIds]
  );

  const unreadCount = unreadUpdates.length;

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

  // Si no hi ha cap update, no mostrar res
  if (updates.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={t.productUpdates.tooltip({ count: unreadCount })}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs font-bold rounded-full bg-sky-500 text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-96 max-w-[90vw] p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Novetats a Summa
          </h3>
          {unreadCount > 0 && (
            <Button
              variant="secondary"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
              title="No afecta la visibilitat de les novetats"
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              {t.productUpdates.markAllRead}
            </Button>
          )}
        </div>

        {/* Updates List */}
        <div className="max-h-72 overflow-y-auto divide-y">
          {updates.length > 0 ? (
            updates.slice(0, 6).map((update) => {
              const read = isRead(update.id);
              const hasDetail = !!update.contentLong;
              return (
                <div
                  key={update.id}
                  className={`px-4 py-3 transition-colors ${
                    hasDetail ? 'cursor-pointer hover:bg-muted/50' : ''
                  } ${read ? 'opacity-60' : ''}`}
                  onClick={hasDetail ? () => handleOpenDetail(update) : undefined}
                  role={hasDetail ? 'button' : undefined}
                  tabIndex={hasDetail ? 0 : undefined}
                  onKeyDown={hasDetail ? (e) => e.key === 'Enter' && handleOpenDetail(update) : undefined}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${read ? 'font-normal' : 'font-medium'}`}>
                        {update.title}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {update.body}
                      </p>
                      {update.href && update.ctaLabel && (
                        <Link
                          href={buildUrl(update.href)}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(update.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center text-xs text-primary hover:underline mt-2"
                        >
                          {update.ctaLabel}
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0 mt-0.5">
                      {/* Indicador llegida o chevron per detall */}
                      {read ? (
                        <Check className="h-4 w-4 text-muted-foreground" />
                      ) : hasDetail ? (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(update.id);
                          }}
                          aria-label={t.productUpdates.markAsRead}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-6">
              <p className="text-sm text-muted-foreground text-center">
                {t.productUpdates.noUpdates}
              </p>
            </div>
          )}
        </div>

        {/* Legacy roadmap content removed from notifications dropdown.
            Product updates now come exclusively from Firestore. */}

        {/* SuperAdmin: Indicador de font de dades (debug) */}
        {isSuperAdmin && (
          <div className={`px-4 py-1.5 border-t text-xs ${
            usingFallback
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-muted-foreground'
          }`}>
            Source: {usingFallback ? '⚠️ Legacy' : 'Firestore'}
            {error && ` · ${error.message.slice(0, 40)}`}
          </div>
        )}
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

import type { AppNotification } from '@/lib/notifications';

interface NotificationBellProps {
  notifications: AppNotification[];
}

/**
 * @deprecated Utilitza ProductUpdatesInbox directament.
 * Ara ProductUpdatesInbox carrega de Firestore amb fallback intern.
 */
export function NotificationBell(_props: NotificationBellProps) {
  // Ignora notifications prop - ara usa hook intern amb Firestore
  return <ProductUpdatesInbox />;
}
