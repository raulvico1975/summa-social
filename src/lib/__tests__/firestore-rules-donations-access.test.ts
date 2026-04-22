import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const rulesPath = join(process.cwd(), 'firestore.rules');

test('firestore rules expose donations read behind moviments.read capability', () => {
  const rules = readFileSync(rulesPath, 'utf8');

  assert.match(
    rules,
    /match \/donations\/\{donationId\}\s*\{[\s\S]*allow read: if isSuperAdmin\(\) \|\| hasCapability\(orgId, 'moviments\.read'\);/m,
  );
});
