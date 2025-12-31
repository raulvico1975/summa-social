import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'summasocial.app';
const ALIAS_HOST = 'app.summasocial.app';

// Rutes que MAI s'han de redirigir (evitar loops i salts dobles)
const PROTECTED_ROUTES = [
  '/redirect-to-org',
  '/admin',
  '/login',
  '/quick',
  '/registre',
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