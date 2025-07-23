import {NextRequest, NextResponse} from 'next/server';
import { verifySessionCookie } from './services/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ['/'];

  // This check is to prevent the middleware from running on static assets and API routes.
  if (publicPaths.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.endsWith('.ico') || pathname.endsWith('.png')) {
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
