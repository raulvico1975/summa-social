import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RemittanceInvariantError,
  SUM_TOLERANCE_CENTS,
  assertCountInvariant,
  assertSumInvariant,
  assertSumInvariantExact,
  checkIdempotence,
  computeInputHashServer,
  sumCents,
  toCents,
  toEuros,
} from '../fiscal/remittance-invariants';

describe('remittance invariants utilities', () => {
  it('toCents/toEuros roundtrip keeps monetary coherence', () => {
    assert.equal(toCents(12.34), 1234);
    assert.equal(toEuros(1234), 12.34);
    assert.equal(toCents(toEuros(999)), 999);
  });

  it('sumCents sums all children amounts', () => {
    const total = sumCents([{ amountCents: 500 }, { amountCents: -200 }, { amountCents: 100 }]);
    assert.equal(total, 400);
  });
});

describe('assertSumInvariantExact', () => {
  it('passes only when exact', () => {
    assert.doesNotThrow(() => assertSumInvariantExact(1000, 1000));
  });

  it('fails with 1 cent difference', () => {
    assert.throws(
      () => assertSumInvariantExact(1000, 999),
      (err: unknown) => err instanceof RemittanceInvariantError && err.code === 'R-SUM-1',
    );
  });
});

describe('assertSumInvariant with tolerance', () => {
  it('accepts delta up to SUM_TOLERANCE_CENTS', () => {
    assert.equal(SUM_TOLERANCE_CENTS, 2);
    assert.doesNotThrow(() => assertSumInvariant(1000, 998));
    assert.doesNotThrow(() => assertSumInvariant(1000, 1002));
  });

  it('fails when delta exceeds tolerance', () => {
    assert.throws(
      () => assertSumInvariant(1000, 997),
      (err: unknown) => err instanceof RemittanceInvariantError && err.code === 'R-SUM-1',
    );
  });
});

describe('assertCountInvariant', () => {
  it('passes when transactionIds count equals active child count', () => {
    assert.doesNotThrow(() => assertCountInvariant(['a', 'b'], 2));
  });

  it('fails when counts differ', () => {
    assert.throws(
      () => assertCountInvariant(['a', 'b'], 1),
      (err: unknown) => err instanceof RemittanceInvariantError && err.code === 'R-COUNT-1',
    );
  });
});

describe('checkIdempotence', () => {
  it('returns shouldProcess true when no existing hash', () => {
    const res = checkIdempotence(null, 'new-hash');
    assert.equal(res.shouldProcess, true);
  });

  it('returns shouldProcess false when hash matches', () => {
    const res = checkIdempotence('same-hash', 'same-hash', 'processed');
    assert.equal(res.shouldProcess, false);
  });

  it('returns shouldProcess true when status is undone even if hash matches', () => {
    const res = checkIdempotence('same-hash', 'same-hash', 'undone');
    assert.equal(res.shouldProcess, true);
  });

  it('returns shouldProcess true for different hash', () => {
    const res = checkIdempotence('old-hash', 'new-hash', 'processed');
    assert.equal(res.shouldProcess, true);
  });
});

describe('computeInputHashServer', () => {
  it('is deterministic for same semantic input', () => {
    const itemsA = [
      { contactId: 'c-1', amountCents: 1000, iban: 'es91 2100', taxId: ' 1234z ', sourceRowIndex: 2 },
      { contactId: 'c-2', amountCents: 2000, iban: 'ES66 2100', taxId: 'A123', sourceRowIndex: 1 },
    ];

    const itemsB = [itemsA[1], itemsA[0]];

    const hashA = computeInputHashServer('parent-1', itemsA);
    const hashB = computeInputHashServer('parent-1', itemsB);

    assert.equal(hashA, hashB);
  });

  it('changes hash when input changes', () => {
    const base = [{ contactId: 'c-1', amountCents: 1000 }];
    const changed = [{ contactId: 'c-1', amountCents: 1001 }];

    const hashBase = computeInputHashServer('parent-1', base);
    const hashChanged = computeInputHashServer('parent-1', changed);

    assert.notEqual(hashBase, hashChanged);
  });
});
