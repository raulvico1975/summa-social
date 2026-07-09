import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInvitationUrl, resolveInvitationWithRetry } from '@/lib/invitations/client';

test('invitation links use the canonical production origin', () => {
  assert.equal(
    buildInvitationUrl('a token', 'https://preview.example.test', true),
    'https://summasocial.app/registre?token=a%20token'
  );
  assert.equal(
    buildInvitationUrl('local-token', 'http://127.0.0.1:9002/', false),
    'http://127.0.0.1:9002/registre?token=local-token'
  );
});

test('invitation resolution retries server errors and returns the invitation', async () => {
  let calls = 0;
  const result = await resolveInvitationWithRetry('token', async () => {
    calls++;
    if (calls < 3) return new Response(JSON.stringify({ error: 'internal_error' }), { status: 500 });
    return new Response(JSON.stringify({
      invitationId: 'inv-1',
      organizationId: 'org-1',
      organizationName: 'Org 1',
      email: 'new@test.com',
      role: 'user',
      expiresAt: '2026-07-16T12:00:00.000Z',
    }), { status: 200 });
  });

  assert.equal(calls, 3);
  assert.equal(result.status, 'ready');
});

test('invitation resolution distinguishes invalid links from temporary failures', async () => {
  const invalid = await resolveInvitationWithRetry(
    'bad-token',
    async () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
  );
  assert.equal(invalid.status, 'invalid');

  let calls = 0;
  const unavailable = await resolveInvitationWithRetry('token', async () => {
    calls++;
    throw new Error('network unavailable');
  });
  assert.equal(calls, 3);
  assert.equal(unavailable.status, 'unavailable');
});

test('invitation resolution does not describe rate limits as invalid links', async () => {
  let calls = 0;
  const result = await resolveInvitationWithRetry('token', async () => {
    calls++;
    return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429 });
  });

  assert.equal(calls, 3);
  assert.equal(result.status, 'unavailable');
});

test('invitation resolution preserves expired and used states', async () => {
  const expired = await resolveInvitationWithRetry(
    'expired-token',
    async () => new Response(JSON.stringify({ error: 'expired' }), { status: 410 })
  );
  const used = await resolveInvitationWithRetry(
    'used-token',
    async () => new Response(JSON.stringify({ error: 'already_used' }), { status: 410 })
  );

  assert.equal(expired.status, 'expired');
  assert.equal(used.status, 'used');
});
