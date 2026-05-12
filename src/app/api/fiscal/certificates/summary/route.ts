import { NextRequest } from 'next/server';
import { handleCertificateSummaryPost } from './handler';

export async function POST(request: NextRequest) {
  return handleCertificateSummaryPost(request);
}
