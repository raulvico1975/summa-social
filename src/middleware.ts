import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'summasocial.app';
const ALIAS_HOST = 'app.summasocial.app';

// Idiomes públics vàlids per [lang]
const PUBLIC_LOCALES = new Set(['ca', 'es', 'fr', 'pt']);

// Rutes que MAI s'han de redirigir (evitar loops i salts dobles)
const PROTECTED_ROUTES = [
  '/redirect-to-org',
  '/admin',
  '/login',
  '/quick',
  '/registre',
  '/public', // segment intern per rutes públiques
];

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname, search } = request.nextUrl;

  // Redirect de app.summasocial.app a summasocial.app (canonical)
  if (host === ALIAS_HOST || host.startsWith(`${ALIAS_HOST}:`)) {
    const canonicalUrl = `https://${CANONICAL_HOST}${pathname}${search}`;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  // Mai redirigir rutes protegides (evita loops)
  if (PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  // Redirect /{lang}/login → /{lang} (no existeix login públic general)
  const loginMatch = pathname.match(/^\/(ca|es|fr|pt)\/login$/);
  if (loginMatch) {
    const lang = loginMatch[1];
    return NextResponse.redirect(new URL(`/${lang}`, request.url));
  }

  // Rewrite d'idiomes: /fr/... → /public/fr/... (intern)
  // Això evita la col·lisió amb [orgSlug] mantenint la URL pública
  const segments = pathname.split('/').filter(Boolean);
  const firstSegment = segments[0];

  if (firstSegment && PUBLIC_LOCALES.has(firstSegment)) {
    const url = request.nextUrl.clone();
    const rest = '/' + segments.slice(1).join('/');
    url.pathname = `/public/${firstSegment}${rest === '/' ? '' : rest}`;
    return NextResponse.rewrite(url);
  }

  // Si l'usuari accedeix a /dashboard sense slug, redirigir a la pàgina de selecció
  // Sempre conservar searchParams (inclòs ?next=...)
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/redirect-to-org';
    // Conservar next existent o posar pathname com a next
    if (!url.searchParams.has('next')) {
      url.searchParams.set('next', pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// Processar totes les rutes per detectar el host alias
export const config = {
  matcher: [
    // Excloure fitxers estàtics i API
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};