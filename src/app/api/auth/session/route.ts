import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/services/auth';

export async function GET(request: NextRequest) {
  const user = await getSession();

  if (!user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({ user });
}
