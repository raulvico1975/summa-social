
import {NextRequest, NextResponse} from 'next/server';
import {getFirebaseAuth} from 'next-firebase-auth-edge';

const {verifySessionCookie} = getFirebaseAuth({
    apiKey: "AIzaSyAi_dEPmqHpbEdZH04pCnRRS85AlJ9Pe5g",
    cookieName: 'auth-token',
    cookieSignatureKeys: ['secret-key-1', 'secret-key-2'],
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: true, 
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 24, // 12 days in seconds
    },
    serviceAccount: {},
});

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const publicPaths = ['/'];

  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth-token');
    
    if (!token) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    try {
      await verifySessionCookie(token.value);
      return NextResponse.next();
    } catch (error) {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/'],
};
