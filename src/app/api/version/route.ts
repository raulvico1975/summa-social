import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const revision = process.env.K_REVISION || process.env.BUILD_ID || 'development';

  return NextResponse.json(
    { revision },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
