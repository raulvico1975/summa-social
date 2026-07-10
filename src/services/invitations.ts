import type { User } from 'firebase/auth';
import type { OrganizationRole } from '@/lib/data';

export type InvitationSource = 'member-dialog' | 'member-import' | 'create-organization';

export interface CreateInvitationResult {
  token: string;
  invitationId: string;
  reused: boolean;
}

export class InvitationApiError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number
  ) {
    super(code);
    this.name = 'InvitationApiError';
  }
}

export async function createInvitationViaApi(params: {
  user: Pick<User, 'getIdToken'>;
  organizationId: string;
  email: string;
  role: OrganizationRole;
  source: InvitationSource;
  userOverrides?: { deny?: string[] };
  userGrants?: string[];
}): Promise<CreateInvitationResult> {
  const idToken = await params.user.getIdToken();
  const response = await fetch('/api/invitations/create', {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
      'X-Summa-Client-Build': process.env.BUILD_ID || 'unknown',
    },
    body: JSON.stringify({
      organizationId: params.organizationId,
      email: params.email,
      role: params.role,
      source: params.source,
      ...(params.userOverrides ? { userOverrides: params.userOverrides } : {}),
      ...(params.userGrants ? { userGrants: params.userGrants } : {}),
    }),
  });

  const body = await response.json().catch(() => ({})) as {
    error?: string;
    token?: string;
    invitationId?: string;
    reused?: boolean;
  };

  if (!response.ok) {
    throw new InvitationApiError(body.error || 'invitation_request_failed', response.status);
  }

  if (!body.token || !body.invitationId) {
    throw new InvitationApiError('invalid_invitation_response', 502);
  }

  return {
    token: body.token,
    invitationId: body.invitationId,
    reused: body.reused === true,
  };
}
