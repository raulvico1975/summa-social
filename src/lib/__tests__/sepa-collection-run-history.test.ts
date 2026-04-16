import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { summarizeSepaCollectionRunRecord } from '../sepa/pain008/run-history';

describe('summarizeSepaCollectionRunRecord', () => {
  it('prefers explicit persisted counters when present', () => {
    const summary = summarizeSepaCollectionRunRecord({
      id: 'run-1',
      scheme: 'CORE',
      bankAccountId: 'bank-1',
      collectionDate: '2026-04-20',
      createdAt: '2026-04-16T10:00:00.000Z',
      exportedAt: '2026-04-16T10:01:00.000Z',
      messageId: 'MSG-FALLBACK',
      itemCount: 4,
      totalCents: 12500,
      included: [
        { contactId: 'donor-1', amountCents: 2000, umr: 'UMR-1', sequenceType: 'RCUR' },
        { contactId: 'donor-2', amountCents: 2500, umr: 'UMR-2', sequenceType: 'FRST' },
      ],
      excluded: [
        { contactId: 'donor-3', reason: 'Sense IBAN' },
      ],
      sepaFile: {
        filename: 'remesa.xml',
        storagePath: 'organizations/org-1/sepaCollectionRuns/run-1/remesa.xml',
        messageId: 'MSG-SEPA',
      },
    });

    assert.equal(summary.itemCount, 4);
    assert.equal(summary.totalCents, 12500);
    assert.equal(summary.includedCount, 2);
    assert.equal(summary.excludedCount, 1);
    assert.equal(summary.filename, 'remesa.xml');
    assert.equal(summary.storagePath, 'organizations/org-1/sepaCollectionRuns/run-1/remesa.xml');
    assert.equal(summary.messageId, 'MSG-SEPA');
  });

  it('derives counters and fallbacks from included items when needed', () => {
    const summary = summarizeSepaCollectionRunRecord({
      id: 'run-2',
      scheme: 'CORE',
      bankAccountId: 'bank-2',
      requestedCollectionDate: '2026-05-05',
      createdAt: '2026-04-16T11:00:00.000Z',
      messageId: 'MSG-ROOT',
      included: [
        { contactId: 'donor-1', amountCents: 500, umr: 'UMR-1', sequenceType: 'RCUR' },
        { contactId: 'donor-2', amountCents: 800, umr: 'UMR-2', sequenceType: 'RCUR' },
      ],
      excluded: [
        { contactId: 'donor-3', reason: 'Import invàlid' },
        { contactId: 'donor-4', reason: 'Sense IBAN' },
      ],
      sepaFile: null,
    });

    assert.equal(summary.collectionDate, '2026-05-05');
    assert.equal(summary.itemCount, 2);
    assert.equal(summary.totalCents, 1300);
    assert.equal(summary.includedCount, 2);
    assert.equal(summary.excludedCount, 2);
    assert.equal(summary.messageId, 'MSG-ROOT');
    assert.equal(summary.filename, null);
    assert.equal(summary.storagePath, null);
  });
});
