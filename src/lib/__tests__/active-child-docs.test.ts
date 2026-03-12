import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterActiveChildDocsForParent,
  isActiveChildDocForParent,
} from '../remittances/active-child-docs';

function makeDoc(
  id: string,
  data: {
    archivedAt?: unknown;
    parentTransactionId?: string | null;
    isRemittanceItem?: boolean | null;
  }
) {
  return {
    id,
    data: () => data,
  };
}

describe('isActiveChildDocForParent', () => {
  it('excludes the parent even if it shares the remittance id query', () => {
    const parent = makeDoc('parent-1', {});

    assert.equal(isActiveChildDocForParent(parent, 'parent-1'), false);
  });

  it('accepts active children by parentTransactionId', () => {
    const child = makeDoc('child-1', { parentTransactionId: 'parent-1' });

    assert.equal(isActiveChildDocForParent(child, 'parent-1'), true);
  });

  it('accepts legacy remittance items by flag when parentTransactionId is missing', () => {
    const child = makeDoc('child-legacy', { isRemittanceItem: true });

    assert.equal(isActiveChildDocForParent(child, 'parent-1'), true);
  });

  it('excludes archived children', () => {
    const child = makeDoc('child-2', {
      parentTransactionId: 'parent-1',
      archivedAt: '2026-03-12T07:36:22.594Z',
    });

    assert.equal(isActiveChildDocForParent(child, 'parent-1'), false);
  });
});

describe('filterActiveChildDocsForParent', () => {
  it('keeps only active child documents for the target parent', () => {
    const docs = [
      makeDoc('parent-1', {}),
      makeDoc('child-1', { parentTransactionId: 'parent-1' }),
      makeDoc('child-2', { parentTransactionId: 'parent-1', archivedAt: '2026-03-12T07:36:22.594Z' }),
      makeDoc('child-3', { isRemittanceItem: true }),
      makeDoc('other-parent-child', { parentTransactionId: 'parent-2' }),
    ];

    assert.deepEqual(
      filterActiveChildDocsForParent(docs, 'parent-1').map((doc) => doc.id),
      ['child-1', 'child-3'],
    );
  });
});
