// src/lib/notifications.ts
// Sistema de notificacions in-app sense backend
// Persistència via localStorage per marcar com llegides

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  href?: string; // ruta interna sense orgSlug
  ctaLabel?: string;
  severity?: 'info' | 'success' | 'warning';
  createdAt: string; // YYYY-MM-DD
  scope: 'dashboard';
};

// Notificacions actives (hardcoded, s'actualitzen amb cada release)
export const DASHBOARD_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'bulk-categorize-2025-12-26',
    title: 'Nova funció: categories en bloc',
    body: 'Ara pots seleccionar diversos moviments i assignar categories de cop.',
    href: '/dashboard/movimientos',
    ctaLabel: 'Veure com funciona',
    severity: 'info',
    createdAt: '2025-12-26',
    scope: 'dashboard',
  },
  {
    id: 'roadmap-2025-12',
    title: 'En què estem treballant',
    body: 'Identificació de donants a remeses · dades fiscals pendents · devolucions parcials.',
    severity: 'info',
    createdAt: '2025-12-26',
    scope: 'dashboard',
  },
];

// =============================================================================
// PERSISTENCE HELPERS
// =============================================================================

function getStorageKey(orgId: string, userId: string): string {
  return `ss.notifications.read.${orgId}.${userId}`;
}

function getToastShownKey(orgId: string, userId: string): string {
  return `ss.notifications.toastShown.${orgId}.${userId}`;
}

export function getReadNotificationIds(orgId: string, userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(getStorageKey(orgId, userId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function markNotificationRead(orgId: string, userId: string, notificationId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getReadNotificationIds(orgId, userId);
    if (!current.includes(notificationId)) {
      const updated = [...current, notificationId];
      localStorage.setItem(getStorageKey(orgId, userId), JSON.stringify(updated));
    }
  } catch {
    // ignore
  }
}

export function markAllNotificationsRead(orgId: string, userId: string, notificationIds: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    const current = getReadNotificationIds(orgId, userId);
    const updated = Array.from(new Set([...current, ...notificationIds]));
    localStorage.setItem(getStorageKey(orgId, userId), JSON.stringify(updated));
  } catch {
    // ignore
  }
}

export function hasShownToastThisSession(orgId: string, userId: string): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return sessionStorage.getItem(getToastShownKey(orgId, userId)) === '1';
  } catch {
    return true;
  }
}

export function setToastShownThisSession(orgId: string, userId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(getToastShownKey(orgId, userId), '1');
  } catch {
    // ignore
  }
}

export function getUnreadNotifications(
  notifications: AppNotification[],
  orgId: string,
  userId: string
): AppNotification[] {
  const readIds = getReadNotificationIds(orgId, userId);
  return notifications.filter((n) => !readIds.includes(n.id));
}
