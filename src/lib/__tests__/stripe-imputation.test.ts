import test from 'node:test';
import assert from 'node:assert/strict';

import { createStripeDonations, ERR_STRIPE_DUPLICATE_PAYMENT } from '@/lib/stripe/createStripeDonations';
import { undoStripeImputation } from '@/lib/stripe/undoStripeImputation';

test('imputacio simple crea una donacio', async () => {
  const result = await createStripeDonations({
    parentTransactionId: 'tx-parent-1',
    bankAmount: 11.49,
    payments: [
      {
        stripePaymentId: 'pay_1',
        amount: 12,
        fee: 0.51,
        contactId: 'donor-1',
        date: '2026-03-17',
        customerEmail: 'emilio@example.org',
      },
    ],
    findDonationByStripePaymentId: async () => null,
  });

  assert.equal(result.donations.length, 1);
  assert.equal(result.donations[0].amountGross, 12);
  assert.equal(result.donations[0].contactId, 'donor-1');
  assert.equal(result.donations[0].stripePaymentId, 'pay_1');
  assert.equal(result.adjustment, null);
});

test('duplicat Stripe queda bloquejat', async () => {
  await assert.rejects(
    () =>
      createStripeDonations({
        parentTransactionId: 'tx-parent-3',
        payments: [
          { stripePaymentId: 'pay_dup', amount: 20, fee: 1, contactId: 'donor-1', date: '2026-03-17' },
        ],
        findDonationByStripePaymentId: async () => ({
          id: 'existing',
          date: '2026-03-16',
          contactId: 'donor-1',
          source: 'stripe',
          stripePaymentId: 'pay_dup',
          parentTransactionId: 'other-parent',
        }),
      }),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, ERR_STRIPE_DUPLICATE_PAYMENT);
      return true;
    }
  );
});

test('undo elimina tot per parentTransactionId', async () => {
  const deletedDocs: string[] = [];
  const firestore = {} as any;
  const organizationId = 'org-1';
  const parentTransactionId = 'tx-parent-4';
  const result = await undoStripeImputation({
    firestore,
    organizationId,
    parentTransactionId,
    deps: {
      loadStripeDonationsByParentTransactionId: async (args) => {
        assert.equal(args.organizationId, organizationId);
        assert.equal(args.parentTransactionId, parentTransactionId);
        return [{ ref: { id: 'd-1' } }, { ref: { id: 'd-2' } }];
      },
      deleteDonationRefs: async ({ refs }) => {
        refs.forEach((docSnap) => {
          deletedDocs.push((docSnap.ref as { id: string }).id);
        });
      },
    },
  });

  assert.equal(result.deletedCount, 2);
  assert.deepEqual(deletedDocs, ['d-1', 'd-2']);
});
