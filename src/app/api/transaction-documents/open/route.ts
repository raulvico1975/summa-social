import { type NextRequest } from 'next/server';
import { handleOpenTransactionDocument } from './handler';

export async function GET(request: NextRequest) {
  return handleOpenTransactionDocument(request);
}
