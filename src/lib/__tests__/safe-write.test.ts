import test from 'node:test';
import assert from 'node:assert/strict';
import { safeAdd, safeSet, SafeWriteValidationError } from '../safe-write';

class FakeSentinel {
  constructor(public readonly name: string) {}
}

const UNDEF = void 0;

test('safeSet: strip undefined deep + writeMeta', async () => {
  const received = await safeSet({
    data: {
      id: 'tx_1',
      amount: 10,
      nested: {
        keep: 'ok',
        remove: UNDEF,
      },
      items: [1, UNDEF, { a: 2, b: UNDEF }],
    },
    context: {
      source: 'import',
      updatedBy: 'user_1',
      updatedAtFactory: () => '2026-02-15T00:00:00.000Z',
      requiredFields: ['id'],
      amountFields: ['amount'],
    },
    write: (payload) => {
      return payload;
    },
  });

  assert.deepEqual(received, {
    id: 'tx_1',
    amount: 10,
    nested: { keep: 'ok' },
    items: [1, { a: 2 }],
    writeMeta: {
      updatedAt: '2026-02-15T00:00:00.000Z',
      updatedBy: 'user_1',
      source: 'import',
    },
  });
});

test('safeSet: preserva sentinels/objectes no plans', async () => {
  const sentinel = new FakeSentinel('serverTimestamp');
  const received = await safeSet({
    data: {
      id: 'doc_1',
      amount: 1,
      marker: sentinel,
      nested: { value: sentinel },
      list: [sentinel],
    },
    context: {
      source: 'system',
      requiredFields: ['id'],
      amountFields: ['amount'],
    },
    write: (payload) => {
      return payload;
    },
  });

  assert.equal(received.marker, sentinel);
  assert.equal((received.nested as { value: unknown }).value, sentinel);
  assert.equal((received.list as unknown[])[0], sentinel);
});

test('safeSet: rebutja NaN i Infinity', async () => {
  await assert.rejects(
    async () => {
      await safeSet({
        data: { amount: Number.NaN },
        context: { source: 'user' },
        write: () => undefined,
      });
    },
    (error: unknown) => {
      assert.ok(error instanceof SafeWriteValidationError);
      assert.equal(error.code, 'SAFE_WRITE_INVALID_PAYLOAD');
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await safeSet({
        data: { nested: { amount: Number.POSITIVE_INFINITY } },
        context: { source: 'user' },
        write: () => undefined,
      });
    },
    (error: unknown) => {
      assert.ok(error instanceof SafeWriteValidationError);
      assert.equal(error.code, 'SAFE_WRITE_INVALID_PAYLOAD');
      return true;
    }
  );
});

test('safeSet: valida requiredFields i amountFields', async () => {
  await assert.rejects(
    async () => {
      await safeSet({
        data: { description: 'ok' },
        context: { source: 'import', requiredFields: ['date'] },
        write: () => undefined,
      });
    },
    (error: unknown) => {
      assert.ok(error instanceof SafeWriteValidationError);
      assert.equal(error.code, 'SAFE_WRITE_INVALID_PAYLOAD');
      return true;
    }
  );

  await assert.rejects(
    async () => {
      await safeSet({
        data: { amount: null },
        context: { source: 'import', amountFields: ['amount'] },
        write: () => undefined,
      });
    },
    (error: unknown) => {
      assert.ok(error instanceof SafeWriteValidationError);
      assert.equal(error.code, 'SAFE_WRITE_INVALID_PAYLOAD');
      return true;
    }
  );
});

test('safeAdd: retorna el valor del callback', async () => {
  const result = await safeAdd({
    data: { id: 'new_doc' },
    context: { source: 'user', updatedBy: 'u-1' },
    write: async () => ({ id: 'new_doc' }),
  });

  assert.deepEqual(result, { id: 'new_doc' });
});
