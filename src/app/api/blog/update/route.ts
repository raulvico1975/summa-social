import { type NextRequest, type NextResponse } from 'next/server'
import { handleBlogUpdate, type UpdateBlogResponse } from './handler'

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<UpdateBlogResponse>> {
  return handleBlogUpdate(request)
}
