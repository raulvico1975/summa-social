import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Donor } from '../data';
import { classifyDonorDuplicateMatch } from '../donors/classify-donor-duplicate-match';

function makeDonor(
  id: string,
  overrides: Partial<Donor> = {}
): Donor {
  return {
    id,
    type: 'donor',
    name: `Donor ${id}`,
    taxId: '',
    zipCode: '07001',
    createdAt: '2026-04-09T10:00:00.000Z',
    donorType: 'individual',
    membershipType: 'one-time',
    ...overrides,
  };
}

describe('classifyDonorDuplicateMatch', () => {
  it('detects active duplicates before archived ones', () => {
    const donors = [
      makeDonor('deleted', {
        taxId: '12345678Z',
        archivedAt: '2026-04-09T09:00:00.000Z',
      }),
      makeDonor('active', {
        taxId: '12345678Z',
      }),
    ];

    const result = classifyDonorDuplicateMatch(donors, '12345678Z');

    assert.equal(result.kind, 'active');
    if (result.kind !== 'active') return;
    assert.equal(result.match.contact.id, 'active');
  });

  it('flags archived duplicates so creation can be blocked and redirected to Eliminats', () => {
    const donors = [
      makeDonor('deleted', {
        email: 'archived@example.org',
        archivedAt: '2026-04-09T09:00:00.000Z',
      }),
    ];

    const result = classifyDonorDuplicateMatch(donors, undefined, undefined, 'archived@example.org');

    assert.equal(result.kind, 'deleted');
    if (result.kind !== 'deleted') return;
    assert.equal(result.match.contact.id, 'deleted');
    assert.equal(result.match.matchedBy, 'email');
  });
});
