import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateS9FiscalCoherence,
  isS9PendingFiscalTransaction,
} from '../fiscal/sentinels/s9-fiscal-coherence'

test('calculateS9FiscalCoherence compta ingressos assignats no fiscals', () => {
  const result = calculateS9FiscalCoherence(
    [
      {
        id: 'tx-donation-ok',
        date: '2026-01-10',
        amount: 120,
        category: 'cat-donations',
        contactId: 'donor-1',
        contactType: 'donor',
        source: 'bank',
        transactionType: 'normal',
        fiscalKind: 'donation',
        archivedAt: null,
      },
      {
        id: 'tx-pending',
        date: '2026-02-10',
        amount: 50,
        category: 'cat-donations',
        contactId: 'donor-2',
        contactType: 'donor',
        source: 'bank',
        transactionType: 'normal',
        fiscalKind: 'pending_review',
        archivedAt: null,
      },
      {
        id: 'tx-non-fiscal',
        date: '2026-03-01',
        amount: 31.5,
        category: 'cat-other-income',
        contactId: 'donor-3',
        contactType: 'donor',
        source: 'bank',
        transactionType: 'normal',
        fiscalKind: 'non_fiscal',
        archivedAt: null,
      },
      {
        id: 'tx-archived',
        date: '2026-03-15',
        amount: 90,
        category: 'cat-donations',
        contactId: 'donor-4',
        contactType: 'donor',
        source: 'bank',
        transactionType: 'normal',
        fiscalKind: 'pending_review',
        archivedAt: '2026-03-16T00:00:00.000Z',
      },
    ],
    { fiscalIncomeCategoryIds: ['cat-donations', 'cat-member-fees'] }
  )

  assert.equal(result.pendingCount, 2)
  assert.equal(result.pendingAmountCents, 8150)
  assert.match(result.diagnosisTextCa, /2 ingressos assignats no computen fiscalment/)
  assert.ok(result.actionTextCa.length > 0)
})

test('calculateS9FiscalCoherence retorna diagnòstic net quan no hi ha pendents', () => {
  const result = calculateS9FiscalCoherence(
    [
      {
        id: 'tx-donation-ok',
        date: '2026-01-10',
        amount: 120,
        category: 'cat-donations',
        contactId: 'donor-1',
        contactType: 'donor',
        source: 'bank',
        transactionType: 'normal',
        fiscalKind: 'donation',
        archivedAt: null,
      },
    ],
    { fiscalIncomeCategoryIds: ['cat-donations'] }
  )

  assert.equal(result.pendingCount, 0)
  assert.equal(result.pendingAmountCents, 0)
  assert.equal(result.diagnosisTextCa, 'No hi ha ingressos assignats fora del còmput fiscal.')
  assert.equal(result.actionTextCa, 'Cap acció necessària.')
})

test('isS9PendingFiscalTransaction usa la resolució fiscal efectiva existent', () => {
  assert.equal(
    isS9PendingFiscalTransaction({
      id: 'tx-1',
      date: '2026-01-01',
      amount: 40,
      contactId: 'donor-1',
      contactType: 'donor',
      source: 'bank',
      transactionType: 'normal',
      fiscalKind: 'donation',
      archivedAt: null,
    }),
    false
  )

  assert.equal(
    isS9PendingFiscalTransaction({
      id: 'tx-2',
      date: '2026-01-01',
      amount: 40,
      contactId: 'donor-1',
      contactType: 'donor',
      source: 'bank',
      transactionType: 'normal',
      fiscalKind: 'pending_review',
      archivedAt: null,
    }),
    true
  )
})
