import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This function can be marked `async` if using `await` inside
export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('auth-token');
  const { pathname } = request.nextUrl;

  // If the user is trying to access the dashboard and doesn't have a session cookie,
  // redirect them to the login page (root).
  if (pathname.startsWith('/dashboard') && !sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // If the user is on the login page but already has a session, redirect to dashboard.
  // This is optional but good user experience.
  if (pathname === '/' && sessionCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/', '/dashboard/:path*'],
}
