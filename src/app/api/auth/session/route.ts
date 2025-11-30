import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // This endpoint is no longer used in the new auth architecture.
  // Returning a 404 to indicate it's not available.
  return new NextResponse('Not Found', { status: 404 });
}
