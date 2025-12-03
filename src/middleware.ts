import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Middleware per gestionar les redireccions d'URLs d'organització.
 * 
 * Lògica:
 * 1. /dashboard/* → Redirigir a /{orgSlug}/dashboard/* (si l'usuari té org)
 * 2. /{orgSlug}/dashboard/* → Permetre accés (validació al component)
 * 3. Altres rutes → Permetre accés normal
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ═══════════════════════════════════════════════════════════════════════════
  // Rutes que requereixen redirecció a URLs amb slug
  // ═══════════════════════════════════════════════════════════════════════════
  
  // Si l'usuari accedeix a /dashboard sense slug, redirigir a la pàgina de selecció
  // Aquesta pàgina determinarà l'organització de l'usuari i redirigirà
  if (pathname === '/dashboard' || pathname.startsWith('/dashboard/')) {
    // Comprovar si ja té un slug (evitar bucle infinit)
    const segments = pathname.split('/').filter(Boolean);
    
    // Si el primer segment és "dashboard", cal redirigir
    if (segments[0] === 'dashboard') {
      // Redirigir a una pàgina que determini l'organització
      const url = request.nextUrl.clone();
      url.pathname = '/redirect-to-org';
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
  }

  // Permetre totes les altres rutes
  return NextResponse.next();
}

// Configurar quines rutes processa el middleware
export const config = {
  matcher: [
    // Processar rutes de dashboard
    '/dashboard/:path*',
    // No processar rutes estàtiques ni API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
