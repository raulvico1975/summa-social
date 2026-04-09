import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canArchiveContact,
  getLinkedTransactionCount,
} from '../contacts/archive-contact-policy';

describe('archive-contact-policy', () => {
  it('allows deleting a donor only when there are no linked transactions in donor mode', () => {
    assert.equal(
      canArchiveContact({ activeCount: 0, archivedCount: 0 }, { blockIfAnyTransaction: true }),
      true
    );
    assert.equal(
      canArchiveContact({ activeCount: 1, archivedCount: 0 }, { blockIfAnyTransaction: true }),
      false
    );
    assert.equal(
      canArchiveContact({ activeCount: 0, archivedCount: 1 }, { blockIfAnyTransaction: true }),
      false
    );
  });

  it('keeps the legacy generic contact behavior when blockIfAnyTransaction is false', () => {
    assert.equal(
      canArchiveContact({ activeCount: 0, archivedCount: 3 }),
      true
    );
    assert.equal(
      canArchiveContact({ activeCount: 2, archivedCount: 0 }),
      false
    );
  });

  it('computes total linked transactions from active plus archived counts', () => {
    assert.equal(
      getLinkedTransactionCount({ activeCount: 2, archivedCount: 3 }),
      5
    );
  });
});
