import { type NextRequest } from 'next/server';
import { handleOpenOrgDocument } from './handler';

export async function GET(request: NextRequest) {
  return handleOpenOrgDocument(request);
}
