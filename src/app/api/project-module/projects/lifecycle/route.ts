import { NextRequest, NextResponse } from 'next/server';
import { handleProjectLifecyclePost } from '@/lib/project-module/project-lifecycle-route-handler';

interface ProjectLifecycleResponse {
  success: boolean;
}

export async function POST(request: NextRequest): Promise<NextResponse<ProjectLifecycleResponse>> {
  return handleProjectLifecyclePost(request);
}
