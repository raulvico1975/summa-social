import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';

import {
  ORGS,
  QA_ORG,
  REQUIRED_CHECKS,
  addUniqueResource,
  buildReportMarkdown,
  buildScenario,
  chunkItems,
  computeFinalStatus,
  contactNameVariants,
  createEmptyManifest,
  createInitialResult,
  createRunId,
  normalizePermissionProfile,
  normalizeRunId,
  omitUndefined,
  recordCheck,
  redactSecrets,
  samePermissionProfile,
  validateCleanupResource,
  validateFirebasePasswordCredential,
} from '../user-standard-core.mjs';

const RUN_ID = 'QAUSR-20260710-120000-A1B2C3';

test('the permanent QA email is not a static SuperAdmin', async () => {
  const source = await fs.readFile(
    new URL('../../../src/lib/admin/superadmin-allowlist.ts', import.meta.url),
    'utf8'
  );
  const block = source.match(/const SUPERADMIN_EMAILS_BASE = \[([\s\S]*?)\] as const;/)?.[1] ?? '';
  assert.doesNotMatch(block, /raul@semillasl\.com/i);
  assert.match(block, /raul\.vico\.ferre@gmail\.com/i);
});

function manifestFixture() {
  const scenario = buildScenario(RUN_ID, new Date('2026-07-10T12:00:00.000Z'));
  return createEmptyManifest({
    runId: RUN_ID,
    profile: 'standard',
    baseUrl: 'https://summasocial.app',
    revision: 'revision-1',
    startedAt: '2026-07-10T12:00:00.000Z',
    scenario,
  });
}

test('createRunId creates the stable QA marker format', () => {
  const runId = createRunId(
    new Date('2026-07-10T12:34:56.000Z'),
    Buffer.from([0xab, 0xcd, 0xef]),
    'UTC'
  );
  assert.equal(runId, 'QAUSR-20260710-123456-ABCDEF');
  assert.equal(normalizeRunId(runId.toLowerCase()), runId);
  assert.throws(() => normalizeRunId('qa-bad'));
});

test('chunkItems never permits Firestore batches above 50', () => {
  const chunks = chunkItems(Array.from({ length: 121 }, (_, index) => index), 50);
  assert.deepEqual(chunks.map((chunk) => chunk.length), [50, 50, 21]);
  assert.throws(() => chunkItems([1], 51));
  assert.throws(() => chunkItems([1], 0));
});

test('omitUndefined removes undefined recursively and preserves null', () => {
  assert.deepEqual(omitUndefined({
    a: undefined,
    b: null,
    c: { d: undefined, e: 1 },
    f: [undefined, 2, null],
  }), {
    b: null,
    c: { e: 1 },
    f: [2, null],
  });
});

test('redactSecrets removes credentials and bearer tokens from evidence', () => {
  const redacted = redactSecrets({
    password: 'unsafe',
    nested: { authorization: 'Bearer abc.def.ghi' },
    message: 'request used Bearer abc123',
  });
  assert.equal(redacted.password, '[REDACTED]');
  assert.equal(redacted.nested.authorization, '[REDACTED]');
  assert.equal(redacted.message, 'request used Bearer [REDACTED]');
  assert.doesNotMatch(JSON.stringify(redacted), /unsafe|abc123|abc\.def/);
});

test('credential preflight validates the real password without returning tokens', async () => {
  let capturedBody = null;
  const valid = await validateFirebasePasswordCredential({
    apiKey: 'web-api-key',
    email: 'qa@example.test',
    password: 'secret-password',
    fetchImpl: async (_url, init) => {
      capturedBody = JSON.parse(init.body);
      return { ok: true, json: async () => ({ idToken: 'must-not-leak' }) };
    },
  });
  assert.deepEqual(valid, { ok: true, code: 'QA_CREDENTIAL_VALID' });
  assert.equal(capturedBody.email, 'qa@example.test');
  assert.equal(capturedBody.password, 'secret-password');
  assert.doesNotMatch(JSON.stringify(valid), /must-not-leak|secret-password/);
});

test('credential preflight distinguishes invalid credentials and network errors', async () => {
  const invalid = await validateFirebasePasswordCredential({
    apiKey: 'web-api-key',
    email: 'qa@example.test',
    password: 'bad',
    fetchImpl: async () => ({
      ok: false,
      json: async () => ({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }),
    }),
  });
  assert.deepEqual(invalid, { ok: false, code: 'QA_CREDENTIAL_INVALID_LOGIN_CREDENTIALS' });

  const network = await validateFirebasePasswordCredential({
    apiKey: 'web-api-key',
    email: 'qa@example.test',
    password: 'bad',
    fetchImpl: async () => { throw new Error('offline'); },
  });
  assert.deepEqual(network, { ok: false, code: 'QA_CREDENTIAL_CHECK_NETWORK_ERROR' });
});

test('permission profiles compare effective role, denies, grants and enabled capabilities', () => {
  const ainoa = {
    role: 'admin',
    capabilities: { z: false, b: true, a: true },
    userOverrides: { deny: ['x', 'x'] },
    userGrants: ['y'],
  };
  const qa = {
    role: 'admin',
    capabilities: { a: true, b: true },
    userOverrides: { deny: ['x'] },
    userGrants: ['y'],
  };
  assert.deepEqual(normalizePermissionProfile(ainoa), {
    role: 'admin', capabilities: ['a', 'b'], deny: ['x'], grants: ['y'],
  });
  assert.equal(samePermissionProfile(ainoa, qa), true);
  assert.equal(samePermissionProfile(ainoa, { ...qa, role: 'user' }), false);
});

test('scenario fixes the FX and partial assignment acceptance values', () => {
  const scenario = buildScenario(RUN_ID, new Date('2026-07-10T12:00:00.000Z'));
  assert.equal(scenario.expected.fxRateEurPerLocal, 1 / 65);
  assert.equal(scenario.expected.offBankHalfEUR, 100);
  assert.equal(scenario.expected.offBankFullEUR, 200);
  assert.equal(scenario.expected.bankHalfEUR, 150);
  assert.equal(scenario.expected.executedEUR, 500);
  assert.match(scenario.contacts[ORGS.baruma.slug].supplier, new RegExp(RUN_ID));
  assert.match(scenario.bankFileName, new RegExp(RUN_ID));
});

test('contact discovery includes the exact form-normalized name', () => {
  assert.deepEqual(
    contactNameVariants('QAUSR-20260711-003641-560827-TREBALLADOR-baruma'),
    [
      'QAUSR-20260711-003641-560827-TREBALLADOR-baruma',
      'Qausr-20260711-003641-560827-treballador-baruma',
    ]
  );
});

test('manifest de-duplicates exact resources', () => {
  const manifest = manifestFixture();
  addUniqueResource(manifest, 'firestore', { path: 'organizations/x/contacts/1' });
  addUniqueResource(manifest, 'firestore', { path: 'organizations/x/contacts/1' });
  addUniqueResource(manifest, 'auth', { uid: 'u1', email: 'qa@example.test' });
  addUniqueResource(manifest, 'auth', { uid: 'u1', email: 'qa@example.test' });
  assert.equal(manifest.resources.firestore.length, 1);
  assert.equal(manifest.resources.auth.length, 1);
});

test('cleanup guard accepts only exact reversible QA resources', () => {
  const manifest = manifestFixture();
  assert.equal(validateCleanupResource(manifest, 'firestore', {
    path: `organizations/${ORGS.baruma.id}/contacts/random-contact-id`,
    discoveredByExactFixture: true,
  }), true);
  assert.equal(validateCleanupResource(manifest, 'firestore', {
    path: `organizations/${QA_ORG.id}/transactions/random-transaction-id`,
    discoveredByExactFixture: true,
  }), true);
  assert.equal(validateCleanupResource(manifest, 'storage', {
    path: `organizations/${QA_ORG.id}/documents/tx/${RUN_ID}-invoice.pdf`,
  }), true);
  assert.equal(validateCleanupResource(manifest, 'auth', {
    uid: 'temporary-uid',
    email: `qa+${RUN_ID.toLowerCase()}@summa-social.test`,
  }), true);
});

test('cleanup guard rejects deep live writes and permanent memberships', () => {
  const manifest = manifestFixture();
  assert.throws(() => validateCleanupResource(manifest, 'firestore', {
    path: `organizations/${ORGS.baruma.id}/transactions/tx-1`,
    discoveredByExactFixture: true,
  }), /Recurs profund prohibit/);
  assert.throws(() => validateCleanupResource(manifest, 'firestore', {
    path: `organizations/${ORGS.baruma.id}/members/permanent-uid`,
    discoveredByExactFixture: true,
  }), /Membre permanent protegit/);
  assert.throws(() => validateCleanupResource(manifest, 'firestore', {
    path: 'invitations/unrelated',
  }), /fora del perimetre/);
  assert.throws(() => validateCleanupResource(manifest, 'storage', {
    path: `organizations/${QA_ORG.id}/documents/real-file.pdf`,
  }), /fora del perimetre/);
  assert.throws(() => validateCleanupResource(manifest, 'auth', {
    uid: 'permanent-uid',
    email: 'raul@semillasl.com',
  }), /fora del perimetre/);
});

test('final result is PASS only with every required check and clean cleanup', () => {
  const checks = REQUIRED_CHECKS.quick.map((id) => ({ id, status: 'PASS' }));
  const clean = { status: 'PASS', remaining: { firestore: [], storage: [], auth: [] } };
  assert.equal(computeFinalStatus({ profile: 'quick', checks, cleanup: clean, blocker: null }), 'PASS');
  assert.equal(computeFinalStatus({
    profile: 'quick', checks: checks.slice(1), cleanup: clean, blocker: null,
  }), 'FAIL_FUNCTIONAL');
  assert.equal(computeFinalStatus({
    profile: 'quick',
    checks: checks.map((check, index) => index === 3 ? { ...check, status: 'FAIL' } : check),
    cleanup: clean,
    blocker: null,
  }), 'FAIL_FUNCTIONAL');
  assert.equal(computeFinalStatus({
    profile: 'quick', checks, cleanup: { ...clean, status: 'FAIL' }, blocker: null,
  }), 'FAIL_CLEANUP');
});

test('injected failure remains functional failure after successful cleanup', () => {
  const result = createInitialResult({
    runId: RUN_ID,
    profile: 'standard',
    baseUrl: 'dry-run://local',
    revision: 'dry-run',
    startedAt: '2026-07-10T12:00:00.000Z',
    preflight: { blocker: null },
  });
  for (const id of REQUIRED_CHECKS.standard) {
    recordCheck(result, { id, status: id === 'qa.bankImport' ? 'FAIL' : 'PASS' });
  }
  assert.equal(computeFinalStatus({
    profile: 'standard',
    checks: result.checks,
    cleanup: { status: 'PASS' },
    blocker: null,
  }), 'FAIL_FUNCTIONAL');
});

test('report is complete and never includes recorded secrets', () => {
  const result = createInitialResult({
    runId: RUN_ID,
    profile: 'quick',
    baseUrl: 'https://summasocial.app',
    revision: 'revision-1',
    startedAt: '2026-07-10T12:00:00.000Z',
    preflight: { blocker: null },
  });
  recordCheck(result, {
    id: 'preflight.revision',
    status: 'PASS',
    evidence: { authorization: 'Bearer private-token', revision: 'revision-1' },
  });
  result.cleanup = { status: 'PASS', remaining: { firestore: [], storage: [], auth: [] } };
  const report = buildReportMarkdown(result);
  assert.match(report, /preflight\.revision/);
  assert.match(report, /\[REDACTED\]/);
  assert.doesNotMatch(report, /private-token/);
});
