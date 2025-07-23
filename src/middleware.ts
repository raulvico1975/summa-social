import {NextRequest, NextResponse} from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ['/'];

  // This check is to prevent the middleware from running on static assets and API routes.
  if (publicPaths.includes(pathname) || pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.endsWith('.ico') || pathname.endsWith('.png')) {
    return NextResponse.next();
  }
  
  // In the middleware, we just check if the cookie exists.
  // The actual validation of the cookie will be done in server components or API routes
  // where the Node.js environment is available.
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('auth-token');
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}
