import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Si l'usuari accedeix a /dashboard sense slug, redirigir a la pàgina de selecció
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    const url = request.nextUrl.clone();
    url.pathname = '/redirect-to-org';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

// NOMÉS processar rutes /dashboard/*
export const config = {
  matcher: ['/dashboard/:path*'],
};