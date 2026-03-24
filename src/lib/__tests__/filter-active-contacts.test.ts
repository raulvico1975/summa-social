import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Donor } from '../data';
import {
  filterActiveDonors,
  filterReturnAssignableDonors,
} from '../contacts/filterActiveContacts';

function makeDonor(
  id: string,
  name: string,
  overrides: Partial<Donor> = {}
): Donor {
  return {
    id,
    type: 'donor',
    name,
    taxId: '',
    zipCode: '',
    createdAt: '2026-03-24T10:00:00.000Z',
    donorType: 'individual',
    membershipType: 'recurring',
    ...overrides,
  };
}

describe('filterReturnAssignableDonors', () => {
  it('includes inactive donors for return assignment while keeping active donors first', () => {
    const donors: Donor[] = [
      makeDonor('inactive-1', 'Zeta Baixa', { status: 'inactive' }),
      makeDonor('active-1', 'Anna Activa', { status: 'active' }),
      makeDonor('pending-1', 'Bernat Pendent', { status: 'pending_return' }),
    ];

    const result = filterReturnAssignableDonors(donors);

    assert.deepEqual(
      result.map((donor) => donor.id),
      ['active-1', 'pending-1', 'inactive-1']
    );
  });

  it('excludes archived and deleted donors even if they are inactive', () => {
    const donors: Donor[] = [
      makeDonor('active-1', 'Anna Activa', { status: 'active' }),
      makeDonor('inactive-1', 'Berta Baixa', { status: 'inactive' }),
      makeDonor('archived-1', 'Carla Arxivada', {
        status: 'inactive',
        archivedAt: '2026-02-01T00:00:00.000Z',
      }),
      {
        ...makeDonor('deleted-1', 'David Eliminat', { status: 'inactive' }),
        deletedAt: '2026-02-02T00:00:00.000Z',
      } as Donor,
    ];

    const result = filterReturnAssignableDonors(donors);

    assert.deepEqual(
      result.map((donor) => donor.id),
      ['active-1', 'inactive-1']
    );
  });
});

describe('filterActiveDonors', () => {
  it('still excludes inactive donors from general active donor lists', () => {
    const donors: Donor[] = [
      makeDonor('active-1', 'Anna Activa', { status: 'active' }),
      makeDonor('inactive-1', 'Berta Baixa', { status: 'inactive' }),
    ];

    const result = filterActiveDonors(donors);

    assert.deepEqual(result.map((donor) => donor.id), ['active-1']);
  });
});
