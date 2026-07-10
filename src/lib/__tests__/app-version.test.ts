import assert from 'node:assert/strict';
import test from 'node:test';

import { shouldReloadForRevision } from '@/lib/app-version';

test('app version guard reloads only when a known revision changes', () => {
  assert.equal(shouldReloadForRevision(null, 'revision-1'), false);
  assert.equal(shouldReloadForRevision('revision-1', 'revision-1'), false);
  assert.equal(shouldReloadForRevision('revision-1', 'revision-2'), true);
});
