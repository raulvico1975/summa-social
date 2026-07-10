'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { APP_REVISION_STORAGE_KEY, shouldReloadForRevision } from '@/lib/app-version';

const MIN_CHECK_INTERVAL_MS = 15_000;
const BACKGROUND_CHECK_INTERVAL_MS = 5 * 60_000;

export function AppVersionGuard() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (!pathname.includes('/dashboard')) return;

    let isActive = true;
    let isReloading = false;
    let lastCheckedAt = 0;

    const checkRevision = async () => {
      const now = Date.now();
      if (isReloading || now - lastCheckedAt < MIN_CHECK_INTERVAL_MS) return;
      lastCheckedAt = now;

      try {
        const response = await fetch('/api/version', { cache: 'no-store' });
        if (!response.ok || !isActive) return;

        const body = await response.json() as { revision?: unknown };
        if (typeof body.revision !== 'string' || !body.revision) return;

        const previousRevision = window.sessionStorage.getItem(APP_REVISION_STORAGE_KEY);
        window.sessionStorage.setItem(APP_REVISION_STORAGE_KEY, body.revision);

        if (shouldReloadForRevision(previousRevision, body.revision)) {
          isReloading = true;
          window.location.reload();
        }
      } catch {
        // Una comprovació de versió no ha de bloquejar mai la feina de l'usuari.
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void checkRevision();
    };

    void checkRevision();
    window.addEventListener('focus', checkRevision);
    document.addEventListener('visibilitychange', handleVisibility);
    const intervalId = window.setInterval(checkRevision, BACKGROUND_CHECK_INTERVAL_MS);

    return () => {
      isActive = false;
      window.removeEventListener('focus', checkRevision);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(intervalId);
    };
  }, [pathname]);

  return null;
}
