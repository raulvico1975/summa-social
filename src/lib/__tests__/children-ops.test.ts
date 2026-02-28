import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  chunkIds,
  deletePendingItems,
  getActiveChildTransactionIds,
  softArchiveTransactionsByIds,
} from '../fiscal/remittances/children-ops';

describe('chunkIds', () => {
  it('splits ids into chunks of <= 50', () => {
    const ids = Array.from({ length: 103 }, (_, i) => `tx-${i + 1}`);
    const chunks = chunkIds(ids, 50);

    assert.deepEqual(chunks.map((c) => c.length), [50, 50, 3]);
    assert.equal(chunks.every((c) => c.length <= 50), true);
  });

  it('returns empty for empty input', () => {
    assert.deepEqual(chunkIds([], 50), []);
  });
});

describe('getActiveChildTransactionIds', () => {
  it('excludes archived children when transactionIds come from remittance doc', async () => {
    const existing = new Map<string, { exists: boolean; archivedAt?: string | null }>([
      ['tx-1', { exists: true, archivedAt: null }],
      ['tx-2', { exists: true, archivedAt: '2026-01-01T00:00:00.000Z' }],
      ['tx-3', { exists: true }],
      ['tx-4', { exists: false }],
    ]);

    const db = {
      doc(path: string) {
        const txId = path.split('/').pop() as string;
        const row = existing.get(txId) || { exists: false };
        return {
          async get() {
            return {
              exists: row.exists,
              data: () => ({ archivedAt: row.archivedAt }),
            };
          },
        };
      },
      collection() {
        throw new Error('fallback query should not be called in this test');
      },
    };

    const active = await getActiveChildTransactionIds(
      db as any,
      'org-1',
      'parent-1',
      'remit-1',
      ['tx-1', 'tx-2', 'tx-3', 'tx-4'],
    );

    assert.deepEqual(active, ['tx-1', 'tx-3']);
  });
});

describe('softArchiveTransactionsByIds', () => {
  it('archives in chunks <= 50 and returns count', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `tx-${i + 1}`);
    const commitSizes: number[] = [];

    const db = {
      doc(path: string) {
        return { path };
      },
      batch() {
        let ops = 0;
        return {
          update() {
            ops += 1;
          },
          async commit() {
            commitSizes.push(ops);
          },
        };
      },
    };

    const archived = await softArchiveTransactionsByIds(
      db as any,
      'org-1',
      ids,
      'uid-1',
      'undo_remittance',
      'undo_remittance_in',
    );

    assert.equal(archived, 120);
    assert.deepEqual(commitSizes, [50, 50, 20]);
    assert.equal(commitSizes.every((n) => n <= 50), true);
  });
});

describe('deletePendingItems', () => {
  it('deletes pending docs in chunks <= 50', async () => {
    const pendingDocs = Array.from({ length: 103 }, (_, i) => ({ ref: { id: `p-${i + 1}` } }));
    const commitSizes: number[] = [];

    const db = {
      collection(_path: string) {
        return {
          async get() {
            return {
              empty: false,
              docs: pendingDocs,
            };
          },
        };
      },
      batch() {
        let ops = 0;
        return {
          delete() {
            ops += 1;
          },
          async commit() {
            commitSizes.push(ops);
          },
        };
      },
    };

    const deleted = await deletePendingItems(db as any, 'org-1', 'remit-1');

    assert.equal(deleted, 103);
    assert.deepEqual(commitSizes, [50, 50, 3]);
    assert.equal(commitSizes.every((n) => n <= 50), true);
  });

  it('returns 0 when there are no pending docs', async () => {
    const db = {
      collection() {
        return {
          async get() {
            return { empty: true, docs: [] };
          },
        };
      },
      batch() {
        throw new Error('batch should not be called for empty pending');
      },
    };

    const deleted = await deletePendingItems(db as any, 'org-1', 'remit-1');
    assert.equal(deleted, 0);
  });
});
