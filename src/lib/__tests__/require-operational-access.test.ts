import assert from 'node:assert/strict';
import test from 'node:test';

import { requireOperationalAccess } from '@/lib/api/require-operational-access';

test('requireOperationalAccess allows only explicit admin and user roles', () => {
  assert.equal(requireOperationalAccess({ valid: true, role: 'admin' }), null);
  assert.equal(requireOperationalAccess({ valid: true, role: 'user' }), null);
});

test('requireOperationalAccess fails closed for unknown roles', async () => {
  const response = requireOperationalAccess({ valid: true, role: 'editor' });

  assert.ok(response);
  assert.equal(response.status, 403);
  assert.equal((await response.json()).code, 'READ_ONLY_ROLE');
});
