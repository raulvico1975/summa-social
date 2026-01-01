// src/components/notifications/notification-bell.tsx
// Product Updates Inbox - Novetats del producte
// Llegeix de Firestore amb fallback a legacy hardcoded

'use client';

import * as React from 'react';
import { Bell, ExternalLink, Check, CheckCheck, ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
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

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">{t.productUpdates.title}</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              {t.productUpdates.markAllRead}
            </Button>
          )}
        </div>

        {/* Updates List */}
        <div className="max-h-60 overflow-y-auto">
          {updates.length > 0 ? (
            updates.slice(0, 6).map((update, idx) => {
              const read = isRead(update.id);
              return (
                <React.Fragment key={update.id}>
                  {idx > 0 && <Separator />}
                  <div
                    className={`px-4 py-3 ${read ? 'opacity-60' : 'bg-muted/30'}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${read ? 'font-normal' : 'font-medium'}`}>
                          {update.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {update.body}
                        </p>
                        {update.href && update.ctaLabel && (
                          <Link
                            href={buildUrl(update.href)}
                            onClick={() => {
                              handleMarkRead(update.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
                          >
                            {update.ctaLabel}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Botó veure detall (només si té contentLong) */}
                        {update.contentLong && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleOpenDetail(update)}
                            aria-label="Veure detall"
                          >
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {/* Botó marcar com llegit */}
                        {!read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMarkRead(update.id)}
                            aria-label={t.productUpdates.markAsRead}
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground text-center">
                {t.productUpdates.noUpdates}
              </p>
            </div>
          )}
        </div>

        {/* Legacy roadmap content removed from notifications dropdown.
            Product updates now come exclusively from Firestore. */}

        {/* SuperAdmin: Indicador de font de dades */}
        {isSuperAdmin && (
          <>
            <Separator />
            <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20">
              <p className="text-[10px] font-mono text-amber-700 dark:text-amber-400">
                Source: {usingFallback ? '⚠️ Legacy fallback' : '✓ Firestore'}
                {error && ` (Error: ${error.message.slice(0, 50)})`}
              </p>
            </div>
          </>
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
