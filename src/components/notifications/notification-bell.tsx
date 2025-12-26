// src/components/notifications/notification-bell.tsx
// Campana de notificacions amb badge i popover
// Persistència via localStorage (sense backend)

'use client';

import * as React from 'react';
import { Bell, ExternalLink, Check, CheckCheck } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useOrgUrl, useCurrentOrganization } from '@/hooks/organization-provider';
import { useAuth } from '@/hooks/use-auth';
import {
  type AppNotification,
  getReadNotificationIds,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/notifications';

interface NotificationBellProps {
  notifications: AppNotification[];
}

export function NotificationBell({ notifications }: NotificationBellProps) {
  const { organizationId } = useCurrentOrganization();
  const { user } = useAuth();
  const { buildUrl } = useOrgUrl();

  const [readIds, setReadIds] = React.useState<string[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);

  // Carregar readIds al muntar
  React.useEffect(() => {
    if (organizationId && user?.uid) {
      setReadIds(getReadNotificationIds(organizationId, user.uid));
    }
  }, [organizationId, user?.uid]);

  const unreadNotifications = React.useMemo(
    () => notifications.filter((n) => !readIds.includes(n.id)),
    [notifications, readIds]
  );

  const unreadCount = unreadNotifications.length;

  const handleMarkRead = React.useCallback(
    (notificationId: string) => {
      if (!organizationId || !user?.uid) return;
      markNotificationRead(organizationId, user.uid, notificationId);
      setReadIds((prev) => [...prev, notificationId]);
    },
    [organizationId, user?.uid]
  );

  const handleMarkAllRead = React.useCallback(() => {
    if (!organizationId || !user?.uid) return;
    const allIds = notifications.map((n) => n.id);
    markAllNotificationsRead(organizationId, user.uid, allIds);
    setReadIds(allIds);
  }, [organizationId, user?.uid, notifications]);

  const isRead = (id: string) => readIds.includes(id);

  if (notifications.length === 0) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notificacions${unreadCount > 0 ? ` (${unreadCount} noves)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 text-xs font-bold"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notificacions</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="h-3.5 w-3.5 mr-1" />
              Marcar totes
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-80 overflow-y-auto">
          {notifications.map((notification, idx) => {
            const read = isRead(notification.id);
            return (
              <React.Fragment key={notification.id}>
                {idx > 0 && <Separator />}
                <div
                  className={`px-4 py-3 ${read ? 'opacity-60' : 'bg-muted/30'}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${read ? 'font-normal' : 'font-medium'}`}>
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {notification.body}
                      </p>
                      {notification.href && notification.ctaLabel && (
                        <Link
                          href={buildUrl(notification.href)}
                          onClick={() => {
                            handleMarkRead(notification.id);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5"
                        >
                          {notification.ctaLabel}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                    {!read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleMarkRead(notification.id)}
                        aria-label="Marcar com llegida"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {/* Footer (optional info) */}
        {unreadCount === 0 && (
          <div className="px-4 py-2 border-t">
            <p className="text-xs text-muted-foreground text-center">
              No tens notificacions noves
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
