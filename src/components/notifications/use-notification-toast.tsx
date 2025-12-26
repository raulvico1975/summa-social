// src/components/notifications/use-notification-toast.tsx
// Hook per mostrar toast de notificacions noves al carregar

'use client';

import * as React from 'react';
import { useToast } from '@/hooks/use-toast';
import { useCurrentOrganization } from '@/hooks/organization-provider';
import { useAuth } from '@/hooks/use-auth';
import {
  type AppNotification,
  getUnreadNotifications,
  hasShownToastThisSession,
  setToastShownThisSession,
} from '@/lib/notifications';

interface UseNotificationToastOptions {
  notifications: AppNotification[];
  /** Durada del toast en ms (default: 5000) */
  duration?: number;
}

export function useNotificationToast({ notifications, duration = 5000 }: UseNotificationToastOptions) {
  const { organizationId } = useCurrentOrganization();
  const { user } = useAuth();
  const { toast } = useToast();

  React.useEffect(() => {
    if (!organizationId || !user?.uid) return;

    // Evitar mostrar si ja s'ha mostrat aquesta sessió
    if (hasShownToastThisSession(organizationId, user.uid)) return;

    const unread = getUnreadNotifications(notifications, organizationId, user.uid);
    if (unread.length === 0) return;

    // Mostrar la notificació més recent (primera de la llista)
    const notification = unread[0];

    // Marcar com mostrat abans de mostrar el toast
    setToastShownThisSession(organizationId, user.uid);

    // Petit delay per assegurar que la UI està carregada
    const timeoutId = setTimeout(() => {
      toast({
        title: notification.title,
        description: notification.body,
        duration,
      });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [organizationId, user?.uid, notifications, toast, duration]);
}
