import assert from 'node:assert/strict';
import test from 'node:test';

import { createInvitationViaApi, InvitationApiError } from '@/services/invitations';

test('createInvitationViaApi requires a complete server response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, token: 'token-only' }));

  try {
    await assert.rejects(
      createInvitationViaApi({
        user: { getIdToken: async () => 'id-token' } as never,
        organizationId: 'org-1',
        email: 'test@example.com',
        role: 'user',
        source: 'member-dialog',
      }),
      (error: unknown) => {
        assert.ok(error instanceof InvitationApiError);
        assert.equal(error.code, 'invalid_invitation_response');
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
