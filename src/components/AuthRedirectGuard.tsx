'use client';

import { useEffect, useContext, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { FirebaseContext } from '@/firebase/provider';

/**
 * Paths que NO requereixen autenticació (zones públiques)
 * Si el path comença per algun d'aquests, no fem redirect a login
 */
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/registre',
  '/ca',
  '/es',
  '/fr',
  '/pt',
  '/public',
  '/admin', // admin té el seu propi guard
];

/**
 * Paths exactes que són públics
 */
const PUBLIC_EXACT_PATHS = [
  '/',
];

/**
 * Detecta si un path és públic (no requereix autenticació)
 */
function isPublicPath(pathname: string): boolean {
  // Paths exactes públics
  if (PUBLIC_EXACT_PATHS.includes(pathname)) {
    return true;
  }

  // Paths que comencen per prefixos públics
  for (const prefix of PUBLIC_PATH_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return true;
    }
  }

  return false;
}

/**
 * Extreu el slug de l'organització del path
 * Ex: /baruma/dashboard/movimientos → baruma
 */
function extractOrgSlugFromPath(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const firstPart = parts[0];

  // Si és un prefix públic conegut, no és un slug d'org
  if (PUBLIC_PATH_PREFIXES.some(p => p.startsWith('/' + firstPart))) {
    return null;
  }

  // Assumim que el primer segment és un slug d'org
  return firstPart;
}

/**
 * Guard de redirect d'autenticació.
 *
 * Quan l'usuari passa a signed out (user === null):
 * - Si està dins d'una instància d'org (/{orgSlug}/...), redirigeix a /{orgSlug}/login
 * - Si està a una zona pública, redirigeix a /
 *
 * Aquest component ha d'estar dins del FirebaseProvider i escoltar
 * canvis a l'estat d'autenticació per fer redirect immediat.
 */
export function AuthRedirectGuard() {
  const firebaseContext = useContext(FirebaseContext);
  const router = useRouter();
  const pathname = usePathname();

  // Ref per evitar múltiples redirects
  const hasRedirectedRef = useRef(false);
  // Ref per detectar transició de logged in a logged out
  const wasLoggedInRef = useRef<boolean | null>(null);

  useEffect(() => {
    // Esperem a que l'auth estigui resolt
    if (firebaseContext?.isUserLoading) {
      return;
    }

    const user = firebaseContext?.user;
    const isLoggedIn = !!user;

    // Detectem transició: de logged in a logged out
    const wasLoggedIn = wasLoggedInRef.current;
    wasLoggedInRef.current = isLoggedIn;

    // Si acaba de fer logout (transició de true a false)
    if (wasLoggedIn === true && !isLoggedIn) {
      console.log('[AuthRedirectGuard] User logged out, checking redirect...');

      // Si ja hem redirigit, no tornar a fer-ho
      if (hasRedirectedRef.current) {
        return;
      }

      // Si ja estem a una pàgina de login, no redirigir
      if (pathname.includes('/login')) {
        console.log('[AuthRedirectGuard] Already on login page, skipping redirect');
        return;
      }

      // Si estem a un path públic, no redirigir
      if (isPublicPath(pathname)) {
        console.log('[AuthRedirectGuard] On public path, skipping redirect');
        return;
      }

      // Extreure el slug de l'org del path actual
      const orgSlug = extractOrgSlugFromPath(pathname);

      if (orgSlug) {
        // Redirigir a la pàgina de login de l'org
        console.log('[AuthRedirectGuard] Redirecting to org login:', `/${orgSlug}/login`);
        hasRedirectedRef.current = true;
        router.replace(`/${orgSlug}/login`);
      } else {
        // Redirigir a la pàgina principal
        console.log('[AuthRedirectGuard] Redirecting to home');
        hasRedirectedRef.current = true;
        router.replace('/');
      }
    }

    // Reset del flag quan l'usuari torna a estar logged in
    if (isLoggedIn) {
      hasRedirectedRef.current = false;
    }
  }, [firebaseContext?.user, firebaseContext?.isUserLoading, pathname, router]);

  // Aquest component no renderitza res
  return null;
}
