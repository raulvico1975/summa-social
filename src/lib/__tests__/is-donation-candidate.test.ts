import test from 'node:test';
import assert from 'node:assert/strict';

import type { Transaction } from '@/lib/data';
import { canToggleDonation182, isDonationCandidate } from '@/lib/transactions/is-donation-candidate';

function buildTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    date: '2026-04-14',
    description: 'Moviment prova',
    amount: 50,
    category: 'cat-1',
    document: null,
    contactId: 'donor-1',
    contactType: 'donor',
    transactionType: 'normal',
    ...overrides,
  };
}

test('isDonationCandidate returns true for a positive donor income not yet marked as donation', () => {
  assert.equal(isDonationCandidate(buildTransaction()), true);
});

test('isDonationCandidate returns false when there is no donor assigned', () => {
  assert.equal(isDonationCandidate(buildTransaction({ contactId: null })), false);
});

test('isDonationCandidate returns false for non-donor contact types', () => {
  assert.equal(isDonationCandidate(buildTransaction({ contactType: 'supplier' })), false);
});

test('isDonationCandidate returns false for negative amounts', () => {
  assert.equal(isDonationCandidate(buildTransaction({ amount: -50 })), false);
});

test('isDonationCandidate returns true even when the movement is still uncategorized', () => {
  assert.equal(isDonationCandidate(buildTransaction({ category: null })), true);
});

test('isDonationCandidate returns false when already marked as donation', () => {
  assert.equal(isDonationCandidate(buildTransaction({ transactionType: 'donation' })), false);
});

test('canToggleDonation182 returns true for a top-level bank donation already marked manually', () => {
  assert.equal(
    canToggleDonation182(buildTransaction({ transactionType: 'donation', category: null })),
    true
  );
});

test('canToggleDonation182 returns false for remittance-generated donations', () => {
  assert.equal(
    canToggleDonation182(
      buildTransaction({
        transactionType: 'donation',
        source: 'remittance',
        isRemittanceItem: true,
        parentTransactionId: 'parent-1',
      })
    ),
    false
  );
});

test('canToggleDonation182 returns false for Stripe donations', () => {
  assert.equal(
    canToggleDonation182(
      buildTransaction({
        transactionType: 'donation',
        source: 'stripe',
      })
    ),
    false
  );
});

test('canToggleDonation182 returns false for returned donations', () => {
  assert.equal(
    canToggleDonation182(
      buildTransaction({
        transactionType: 'donation',
        donationStatus: 'returned',
      })
    ),
    false
  );
});
