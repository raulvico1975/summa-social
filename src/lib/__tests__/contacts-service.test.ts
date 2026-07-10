import assert from 'node:assert/strict';
import test from 'node:test';

import { ContactApiError, updateContactViaApi } from '@/services/contacts';

test('updateContactViaApi turns permission codes into a useful support message', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(
    JSON.stringify({ error: 'READ_ONLY_ROLE', code: 'READ_ONLY_ROLE' }),
    {
      status: 403,
      headers: { 'X-Summa-Request-Id': '12345678-aaaa-bbbb-cccc-123456789012' },
    }
  );

  try {
    await assert.rejects(
      updateContactViaApi({
        orgId: 'org-1',
        docId: 'contact-1',
        data: { name: 'Contacte' },
        auth: { currentUser: { getIdToken: async () => 'token' } } as never,
      }),
      (error: unknown) => {
        assert.ok(error instanceof ContactApiError);
        assert.equal(error.code, 'READ_ONLY_ROLE');
        assert.match(error.message, /només lectura/);
        assert.match(error.message, /12345678/);
        return true;
      }
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
