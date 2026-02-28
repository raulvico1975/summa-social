import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  HEARTBEAT_INTERVAL_MS,
  LOCK_TTL_SECONDS,
  isLockError,
  type LockError,
} from '../fiscal/remittances/locks';

describe('remittances locks constants', () => {
  it('exports expected TTL and heartbeat values', () => {
    assert.equal(LOCK_TTL_SECONDS, 300);
    assert.equal(HEARTBEAT_INTERVAL_MS, 60_000);
  });

  it('heartbeat interval is lower than lock TTL', () => {
    assert.equal(HEARTBEAT_INTERVAL_MS < LOCK_TTL_SECONDS * 1000, true);
  });
});

describe('isLockError', () => {
  it('returns true for lock error payload', () => {
    const result: LockError = { error: 'failed', code: 'LOCK_ERROR' };
    assert.equal(isLockError(result), true);
  });

  it('returns false for lock state payload', () => {
    const result = {
      lockRef: {} as FirebaseFirestore.DocumentReference,
      operationId: 'op-1',
      heartbeatInterval: null,
    };

    assert.equal(isLockError(result), false);
  });
});
