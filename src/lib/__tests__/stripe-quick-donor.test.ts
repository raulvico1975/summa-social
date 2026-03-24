import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStripeQuickDonorContactPayload,
  toLocalDonorFromStripeQuickPayload,
} from '@/lib/stripe/quick-donor';

test('buildStripeQuickDonorContactPayload crea un donant puntual amb camps fiscals opcionals a null', () => {
  const payload = buildStripeQuickDonorContactPayload({
    kind: 'donor',
    formData: {
      name: '  Donant Stripe  ',
      email: '  donor@example.org ',
      taxId: ' ',
      zipCode: '',
    },
    nowIso: '2026-03-24T10:00:00.000Z',
  });

  assert.deepEqual(payload, {
    type: 'donor',
    roles: { donor: true },
    name: 'Donant Stripe',
    taxId: null,
    zipCode: null,
    email: 'donor@example.org',
    donorType: 'individual',
    membershipType: 'one-time',
    memberSince: null,
    periodicityQuota: null,
    status: 'active',
    createdAt: '2026-03-24T10:00:00.000Z',
    updatedAt: '2026-03-24T10:00:00.000Z',
  });
});

test('buildStripeQuickDonorContactPayload crea un soci amb membershipType recurring i memberSince', () => {
  const payload = buildStripeQuickDonorContactPayload({
    kind: 'member',
    formData: {
      name: 'Soci Stripe',
      email: 'soci@example.org',
      taxId: '12345678A',
      zipCode: '08001',
    },
    nowIso: '2026-03-24T10:00:00.000Z',
    memberSince: '2026-03-20',
  });

  assert.equal(payload.membershipType, 'recurring');
  assert.equal(payload.memberSince, '2026-03-20');
  assert.equal(payload.periodicityQuota, 'manual');
  assert.equal(payload.status, 'active');
});

test('toLocalDonorFromStripeQuickPayload converteix nulls persistits al shape del drawer de donants', () => {
  const donor = toLocalDonorFromStripeQuickPayload('donor_123', {
    type: 'donor',
    roles: { donor: true },
    name: 'Soci Stripe',
    taxId: null,
    zipCode: null,
    email: null,
    donorType: 'individual',
    membershipType: 'recurring',
    memberSince: '2026-03-20',
    periodicityQuota: 'manual',
    status: 'active',
    createdAt: '2026-03-24T10:00:00.000Z',
    updatedAt: '2026-03-24T10:00:00.000Z',
  });

  assert.equal(donor.id, 'donor_123');
  assert.equal(donor.membershipType, 'recurring');
  assert.equal(donor.taxId, '');
  assert.equal(donor.zipCode, '');
  assert.equal(donor.email, undefined);
});
