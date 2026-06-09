import assert from 'node:assert/strict';
import test from 'node:test';

import { transactionDocumentBelongsToPendingFile } from '@/lib/pending-documents/api';

const pendingFile = {
  storagePath: 'organizations/org-1/pendingDocuments/pending-1/invoice.pdf',
  finalStoragePath: 'organizations/org-1/documents/tx-1/invoice.pdf',
};

test('transactionDocumentBelongsToPendingFile detects original pending document storage URLs', () => {
  const url = `https://storage.local/${encodeURIComponent(pendingFile.storagePath)}?alt=media`;

  assert.equal(transactionDocumentBelongsToPendingFile(url, pendingFile), true);
});

test('transactionDocumentBelongsToPendingFile detects final matched document storage URLs', () => {
  const url = `https://storage.local/${encodeURIComponent(pendingFile.finalStoragePath)}?GoogleAccessId=fake`;

  assert.equal(transactionDocumentBelongsToPendingFile(url, pendingFile), true);
});

test('transactionDocumentBelongsToPendingFile rejects unrelated transaction documents', () => {
  const unrelatedUrl = `https://storage.local/${encodeURIComponent('organizations/org-1/documents/tx-2/other.pdf')}`;

  assert.equal(transactionDocumentBelongsToPendingFile(unrelatedUrl, pendingFile), false);
  assert.equal(transactionDocumentBelongsToPendingFile(null, pendingFile), false);
});
