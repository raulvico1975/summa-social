import assert from 'node:assert/strict';
import test from 'node:test';

import {
  handlePrivateIndividualCertificateGenerate,
  type IndividualCertificateGenerateDeps,
} from '@/app/api/integrations/private/certificates/individual/generate/handler';
import { hashIntegrationToken, type IntegrationAuthRepository, type IntegrationTokenRecord } from '@/lib/api/integration-auth';
import type { Transaction } from '@/lib/data';

class AuthRepository implements IntegrationAuthRepository {
  readonly audits: unknown[] = [];
  readonly token: IntegrationTokenRecord = {
    id: 'token-1', tokenType: 'private_integration', orgId: 'org-1',
    tokenHash: hashIntegrationToken('valid-token'), scopes: ['certificates.generate'],
    status: 'active', createdAt: null, createdBy: 'admin', lastUsedAt: null,
    label: 'test', sourceRepo: 'test',
  };
  async findTokenByHash(hash: string) { return hash === this.token.tokenHash ? this.token : null; }
  async touchTokenLastUsed() {}
  async recordAudit(entry: unknown) { this.audits.push(entry); }
}

function request() {
  return {
    headers: new Headers({ Authorization: 'Bearer valid-token' }),
    async json() {
      return {
        orgId: 'org-1', planId: 'plan-1', transactionId: 'donation-1', donorId: 'donor-1',
        preconditionToken: 'precondition', humanConfirmed: true, confirmationText: 'confirm',
      };
    },
  } as never;
}

const donation: Transaction = {
  id: 'donation-1', date: '2026-08-01', description: 'Donació', amount: 100,
  category: null, document: null, transactionType: 'donation', contactId: 'donor-1',
};
const unresolvedReturn: Transaction = {
  id: 'return-1', date: '2026-08-02', description: 'Devolució', amount: -100,
  category: null, document: null, transactionType: 'return', contactId: null,
};

function deps(transactions: Transaction[], claim: () => Promise<unknown>): IndividualCertificateGenerateDeps {
  return {
    authRepository: new AuthRepository(),
    getTransactionsForReadinessFn: async () => transactions,
    planStore: {
      async create() {},
      async claim() { return claim() as never; },
      async complete() {},
      async block() {},
    },
    generator: { async generate() { return { ok: false, code: 'NOT_USED' }; } },
  };
}

test('individual certificate: bloqueja si queda una devolució fiscal no resolta', async () => {
  let claimed = false;
  const response = await handlePrivateIndividualCertificateGenerate(request(), deps(
    [donation, unresolvedReturn],
    async () => { claimed = true; return { ok: false, code: 'PLAN_NOT_FOUND' }; },
  ));

  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, 'UNRESOLVED_FISCAL_RETURNS');
  assert.equal(claimed, false);
});

test('individual certificate: amb readiness correcta conserva el claim del pla', async () => {
  let claimed = false;
  const response = await handlePrivateIndividualCertificateGenerate(request(), deps(
    [donation],
    async () => { claimed = true; return { ok: false, code: 'PLAN_NOT_FOUND' }; },
  ));

  assert.equal(response.status, 404);
  assert.equal(claimed, true);
});
