
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// This middleware is temporarily disabled to allow access to the dashboard
// without a real login flow. The development login process is handled
// by a button on the homepage. Re-enable or adjust this middleware
// once a full authentication flow is implemented.
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  // By not specifying a matcher, the middleware will not run on any path.
  // matcher: ['/dashboard/:path*'],
}
