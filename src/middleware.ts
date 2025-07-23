import {NextRequest, NextResponse} from 'next/server';
import { verifySessionCookie } from './services/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ['/'];

  if (publicPaths.includes(pathname) || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('auth-token')?.value;
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    try {
      const decodedClaims = await verifySessionCookie(sessionCookie);
      if (!decodedClaims) {
          throw new Error("Invalid session cookie");
      }
      return NextResponse.next();
    } catch (error) {
      console.error("Middleware error:", error);
      const response = NextResponse.redirect(new URL('/', request.url));
      // Clear the invalid cookie
      response.cookies.delete('auth-token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/'],
};