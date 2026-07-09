export interface ResolvedInvitation {
  invitationId: string;
  organizationId: string;
  organizationName: string | null;
  email: string;
  role: 'admin' | 'user' | 'viewer';
  expiresAt: string | null;
}

export type InvitationResolution =
  | { status: 'ready'; invitation: ResolvedInvitation }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'used' }
  | { status: 'unavailable' };

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export function buildInvitationUrl(token: string, currentOrigin: string, isProduction: boolean): string {
  const origin = isProduction ? 'https://summasocial.app' : currentOrigin.replace(/\/$/, '');
  return `${origin}/registre?token=${encodeURIComponent(token)}`;
}

export async function resolveInvitationWithRetry(
  token: string,
  fetchFn: FetchLike = fetch,
  maxAttempts = 3
): Promise<InvitationResolution> {
  const attempts = Math.max(1, maxAttempts);

  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetchFn(
        `/api/invitations/resolve?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      );
      const body = await response.json().catch(() => ({})) as Partial<ResolvedInvitation> & { error?: string };

      if (response.ok) {
        if (
          typeof body.invitationId !== 'string' ||
          typeof body.organizationId !== 'string' ||
          typeof body.email !== 'string' ||
          !['admin', 'user', 'viewer'].includes(body.role ?? '')
        ) {
          return { status: 'unavailable' };
        }
        return { status: 'ready', invitation: body as ResolvedInvitation };
      }

      if (response.status === 410) {
        if (body.error === 'already_used') return { status: 'used' };
        if (body.error === 'expired') return { status: 'expired' };
        return { status: 'invalid' };
      }

      if (response.status === 400 || response.status === 404) {
        return { status: 'invalid' };
      }
    } catch {
      // Els errors de xarxa es reintenten abans de mostrar una incidència temporal.
    }
  }

  return { status: 'unavailable' };
}
