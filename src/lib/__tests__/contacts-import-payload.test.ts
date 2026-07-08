import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeContactImportData } from '../api/contacts-import-payload';

test('sanitizeContactImportData removes undefined values deeply', () => {
  const sanitized = sanitizeContactImportData({
    name: 'Ainoa',
    taxId: undefined,
    nested: {
      keep: null,
      drop: undefined,
    },
    list: ['a', undefined, { keep: true, drop: undefined }],
  });

  assert.deepEqual(sanitized, {
    name: 'Ainoa',
    nested: {
      keep: null,
    },
    list: ['a', { keep: true }],
  });
});

test('sanitizeContactImportData strips archive fields from client payloads', () => {
  const sanitized = sanitizeContactImportData({
    name: 'Contacte',
    archivedAt: '2026-07-08T10:00:00.000Z',
    archivedByUid: 'uid',
    archivedFromAction: 'client',
  });

  assert.deepEqual(sanitized, {
    name: 'Contacte',
  });
});

test('sanitizeContactImportData rejects non-object update data', () => {
  assert.throws(() => sanitizeContactImportData(null), /plain object/);
  assert.throws(() => sanitizeContactImportData(['not-valid']), /plain object/);
});
