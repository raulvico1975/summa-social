import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const CANONICAL_HOST = 'summasocial.app';
const ALIAS_HOST = 'app.summasocial.app';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname, search } = request.nextUrl;

  // Redirect de app.summasocial.app a summasocial.app (canonical)
  if (host === ALIAS_HOST || host.startsWith(`${ALIAS_HOST}:`)) {
    const canonicalUrl = `https://${CANONICAL_HOST}${pathname}${search}`;
    return NextResponse.redirect(canonicalUrl, 308);
  }

  // Si l'usuari accedeix a /dashboard sense slug, redirigir a la pàgina de selecció
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/redirect-to-org';
    url.searchParams.set('next', pathname);
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