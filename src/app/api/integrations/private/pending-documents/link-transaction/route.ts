import { type NextRequest } from 'next/server';
import { handlePrivatePendingDocumentLinkTransaction } from './handler';

export async function POST(request: NextRequest) {
  return handlePrivatePendingDocumentLinkTransaction(request);
}
