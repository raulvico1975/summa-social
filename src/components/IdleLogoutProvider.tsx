'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase/provider';
import { toast } from '@/hooks/use-toast';

type Props = {
  children: React.ReactNode;
  idleMs?: number;          // per defecte 30 min
  warnMs?: number;          // avís abans (opcional)
};

type LogoutReason = 'idle' | 'max_session';

// Segments que NO són slugs d'organització
const RESERVED_SEGMENTS = [
  'login',
  'registre',
  'redirect-to-org',
  'admin',
  'dashboard',
  'privacy',
  'api',
  'q',
  // Idiomes públics i segment intern
  'ca',
  'es',
  'fr',
  'pt',
  'public',
];

function buildInstanceLoginUrl(pathname: string | null, reason: LogoutReason): string {
  if (!pathname) return `/login?reason=${reason}`;

  // Panell admin: mantenir ruta /admin també per login
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return `/admin?reason=${reason}`;
  }

  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  // Si el primer segment és reservat o no existeix, login genèric
  if (!firstSegment || RESERVED_SEGMENTS.includes(firstSegment)) {
    return `/login?reason=${reason}`;
  }

  // És un slug d'organització - construir URL amb next per poder tornar
  const next = encodeURIComponent(pathname);
  return `/${firstSegment}/login?reason=${reason}&next=${next}`;
}

const DEFAULT_IDLE_MS = 30 * 60 * 1000; // 30 min
const ADMIN_IDLE_MS = 15 * 60 * 1000;   // 15 min
const DEFAULT_WARN_MS = 60 * 1000;      // 1 min abans
const MAX_SESSION_MS = 12 * 60 * 60 * 1000; // 12h

export function IdleLogoutProvider({
  children,
  idleMs = DEFAULT_IDLE_MS,
  warnMs = DEFAULT_WARN_MS,
}: Props) {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const pathname = usePathname();
  const router = useRouter();

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxSessionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLogoutRef = useRef(false);

  // Mantenim pathname en un ref per tenir sempre el valor actual quan dispara el timer
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const effectiveIdleMs = pathname?.startsWith('/admin') ? ADMIN_IDLE_MS : idleMs;

  const clearIdleTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warnTimerRef.current) clearTimeout(warnTimerRef.current);
    idleTimerRef.current = null;
    warnTimerRef.current = null;
  }, []);

  const clearMaxSessionTimer = useCallback(() => {
    if (maxSessionTimerRef.current) clearTimeout(maxSessionTimerRef.current);
    maxSessionTimerRef.current = null;
  }, []);

  const clearTimers = useCallback(() => {
    clearIdleTimers();
    clearMaxSessionTimer();
  }, [clearIdleTimers, clearMaxSessionTimer]);

  const isExcluded = useCallback(() => {
    // Exclou /login i /{slug}/login
    return pathname === '/login' || pathname?.endsWith('/login');
  }, [pathname]);

  const doLogout = useCallback(async (reason: LogoutReason) => {
    if (didLogoutRef.current) return;
    didLogoutRef.current = true;
    clearTimers();

    // Usem pathnameRef.current per tenir el valor actual, no el capturat pel closure
    const currentPathname = pathnameRef.current;

    // Primer redirigim a login, després fem signOut
    // Així els components amb subscripcions Firestore es desmunten abans que auth sigui null
    router.replace(buildInstanceLoginUrl(currentPathname, reason));

    // Petit delay per permetre la navegació abans del signOut
    setTimeout(async () => {
      try {
        if (auth) await signOut(auth);
      } catch {
        // Ignorem errors de signOut si ja hem redirigit
      }
    }, 100);
  }, [auth, clearTimers, router]);

  const scheduleTimers = useCallback(() => {
    clearIdleTimers();
    didLogoutRef.current = false;

    // Warning opcional (si warnMs < idleMs efectiu)
    if (warnMs > 0 && warnMs < effectiveIdleMs) {
      warnTimerRef.current = setTimeout(() => {
        toast({
          title: 'Sessió a punt de caducar',
          description: 'Per seguretat, es tancarà la sessió en 1 minut si no hi ha activitat.',
        });
      }, effectiveIdleMs - warnMs);
    }

    idleTimerRef.current = setTimeout(() => {
      void doLogout('idle');
    }, effectiveIdleMs);
  }, [clearIdleTimers, doLogout, effectiveIdleMs, warnMs]);

  const onActivity = useCallback(() => {
    // Reseteja timers només si realment està actiu
    scheduleTimers();
  }, [scheduleTimers]);

  useEffect(() => {
    // No fem res fins que auth/user estiguin resolts
    if (isUserLoading) return;
    if (!user) {
      clearTimers();
      return;
    }
    if (!auth) {
      clearTimers();
      return;
    }
    if (isExcluded()) {
      clearTimers();
      return;
    }

    // Arrencar timers
    scheduleTimers();

    const events: (keyof WindowEventMap)[] = [
      'mousemove',
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
    ];

    // listener passiu per no penalitzar scroll
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));

    // canvis de pestanya: opcional, però útil
    const onVis = () => {
      // quan torna a ser visible, considerem activitat i resetejem
      if (document.visibilityState === 'visible') onActivity();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity as EventListener));
      document.removeEventListener('visibilitychange', onVis);
      clearIdleTimers();
    };
  }, [auth, user, isUserLoading, isExcluded, scheduleTimers, onActivity, clearTimers, clearIdleTimers]);

  useEffect(() => {
    if (isUserLoading || !user || !auth || isExcluded()) {
      clearMaxSessionTimer();
      return;
    }

    let isMounted = true;

    const scheduleMaxSessionLogout = async () => {
      if (maxSessionTimerRef.current) {
        clearTimeout(maxSessionTimerRef.current);
        maxSessionTimerRef.current = null;
      }

      try {
        const tokenResult = await user.getIdTokenResult();
        if (!isMounted || didLogoutRef.current) return;

        const authTimeRaw = tokenResult.claims.auth_time;
        const authTimeSeconds = typeof authTimeRaw === 'number'
          ? authTimeRaw
          : typeof authTimeRaw === 'string'
            ? Number(authTimeRaw)
            : NaN;

        if (!Number.isFinite(authTimeSeconds) || authTimeSeconds <= 0) {
          return;
        }

        const expiresAt = authTimeSeconds * 1000 + MAX_SESSION_MS;
        const remainingMs = expiresAt - Date.now();

        if (remainingMs <= 0) {
          void doLogout('max_session');
          return;
        }

        maxSessionTimerRef.current = setTimeout(() => {
          void doLogout('max_session');
        }, remainingMs);
      } catch {
        // Fallback no disruptiu: si falla auth_time, mantenir només idle logout
      }
    };

    void scheduleMaxSessionLogout();

    return () => {
      isMounted = false;
      clearMaxSessionTimer();
    };
  }, [auth, user, isUserLoading, isExcluded, doLogout, clearMaxSessionTimer]);

  return <>{children}</>;
}
