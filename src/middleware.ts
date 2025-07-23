import {NextRequest, NextResponse} from 'next/server';

// Middleware is disabled to allow development without login.
export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
