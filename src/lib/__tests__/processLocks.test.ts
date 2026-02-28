import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildLockConflictResult,
  getLockFailureMessage,
  isLockActive,
} from '../fiscal/processLocks';

describe('processLocks pure helpers', () => {
  it('isLockActive returns true only when expiration is in the future', () => {
    assert.equal(isLockActive(2000, 1000), true);
    assert.equal(isLockActive(1000, 1000), false);
    assert.equal(isLockActive(999, 1000), false);
  });

  it('buildLockConflictResult returns locked_by_other payload', () => {
    const result = buildLockConflictResult('uid-1', 'undoRemittance');
    assert.deepEqual(result, {
      ok: false,
      reason: 'locked_by_other',
      lockedByUid: 'uid-1',
      operation: 'undoRemittance',
    });
  });
});

describe('getLockFailureMessage', () => {
  it('returns locked-by-other message for lock conflicts', () => {
    const msg = getLockFailureMessage({ ok: false, reason: 'locked_by_other' });
    assert.equal(msg.includes('altre usuari'), true);
  });

  it('uses provided translation overrides', () => {
    const msg = getLockFailureMessage(
      { ok: false, reason: 'locked_by_other' },
      { lockedByOther: 'LOCKED' },
    );
    assert.equal(msg, 'LOCKED');
  });

  it('returns processing error fallback for generic failures', () => {
    const msg = getLockFailureMessage({ ok: false, reason: 'error' });
    assert.equal(msg.includes('Error iniciant el processament'), true);
  });
});
