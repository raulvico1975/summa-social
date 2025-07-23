
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getFirebaseAuth } from 'next-firebase-auth-edge';

const { verifySessionCookie } = getFirebaseAuth({
    apiKey: "AIzaSyAi_dEPmqHpbEdZH04pCnRRS85AlJ9Pe5g",
    cookieName: 'auth-token',
    cookieSignatureKeys: ['secret-key-1', 'secret-key-2'],
    cookieSerializeOptions: {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'lax',
        maxAge: 12 * 60 * 60 * 24, // 12 days
    },
    serviceAccount: {},
    authDomain: "summa-social.firebaseapp.com",
});

export async function GET(request: NextRequest) {
  const token = cookies().get('auth-token')?.value;

  if (!token) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  try {
    const user = await verifySessionCookie(token);
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
