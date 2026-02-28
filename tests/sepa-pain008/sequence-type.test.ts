import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  determineSequenceType,
  filterEligibleDonors,
  isEligibleForSepaCollection,
} from '../../src/lib/sepa/pain008/sequence-type';
import type { Donor } from '../../src/lib/data';

function makeDonor(overrides: Partial<Donor> = {}): Donor {
  return {
    id: 'donor-1',
    type: 'donor',
    name: 'Donor Test',
    taxId: '12345678Z',
    zipCode: '08001',
    createdAt: '2026-01-01T00:00:00.000Z',
    donorType: 'individual',
    membershipType: 'recurring',
    iban: 'ES9121000418450200051332',
    memberSince: '2025-01-01',
    status: 'active',
    ...overrides,
  };
}

describe('determineSequenceType', () => {
  it('returns RCUR for new donor (current forced behavior)', () => {
    const donor = makeDonor({
      sepaPain008LastRunAt: null,
      sepaMandate: { umr: 'M-1', signatureDate: '2025-01-01', sequenceTypeOverride: null },
    });

    assert.equal(determineSequenceType(donor), 'RCUR');
  });

  it('returns RCUR even if donor would normally be OOFF (temporary override)', () => {
    const donor = makeDonor({ membershipType: 'one-time' });
    assert.equal(determineSequenceType(donor), 'RCUR');
  });
});

describe('isEligibleForSepaCollection', () => {
  it('returns true for recurring active donor with required fields', () => {
    assert.equal(isEligibleForSepaCollection(makeDonor()), true);
  });

  it('returns false for inactive donor', () => {
    assert.equal(isEligibleForSepaCollection(makeDonor({ status: 'inactive' })), false);
  });

  it('returns false for missing required fields', () => {
    assert.equal(isEligibleForSepaCollection(makeDonor({ iban: undefined })), false);
    assert.equal(isEligibleForSepaCollection(makeDonor({ taxId: '' })), false);
    assert.equal(isEligibleForSepaCollection(makeDonor({ memberSince: undefined })), false);
    assert.equal(isEligibleForSepaCollection(makeDonor({ membershipType: 'one-time' })), false);
  });
});

describe('filterEligibleDonors', () => {
  it('filters mixed list and keeps only eligible donors', () => {
    const eligible = makeDonor({ id: 'd-ok' });
    const noIban = makeDonor({ id: 'd-no-iban', iban: undefined });
    const badIbanLength = makeDonor({ id: 'd-bad-iban', iban: 'ES91210004184502000513' });
    const noTaxId = makeDonor({ id: 'd-no-tax', taxId: '' });
    const inactive = makeDonor({ id: 'd-inactive', status: 'inactive' });

    const result = filterEligibleDonors([eligible, noIban, badIbanLength, noTaxId, inactive]);

    assert.deepEqual(
      result.eligible.map((d) => d.id),
      ['d-ok'],
    );
    assert.equal(result.excluded.length, 4);
    assert.equal(result.excluded.some((e) => e.reason.startsWith('IBAN_INCOMPLET:')), true);
  });

  it('returns empty groups for empty input', () => {
    const result = filterEligibleDonors([]);
    assert.deepEqual(result.eligible, []);
    assert.deepEqual(result.excluded, []);
  });
});
