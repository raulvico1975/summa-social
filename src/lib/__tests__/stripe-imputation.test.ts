import test from 'node:test';
import assert from 'node:assert/strict';

import { createStripeDonations, ERR_STRIPE_DUPLICATE_PAYMENT } from '@/lib/stripe/createStripeDonations';
import {
  assertNoActiveStripeImputationByParentTransactionId,
  ERR_STRIPE_PARENT_ALREADY_IMPUTED,
} from '@/lib/stripe/activeStripeImputation';
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
        imputationOrigin: 'csv',
        customerEmail: 'emilio@example.org',
      },
    ],
    findDonationByStripePaymentId: async () => null,
  });

  assert.equal(result.donations.length, 1);
  assert.equal(result.donations[0].amountGross, 12);
  assert.equal(result.donations[0].contactId, 'donor-1');
  assert.equal(result.donations[0].stripePaymentId, 'pay_1');
  assert.equal(result.donations[0].imputationOrigin, 'csv');
  assert.equal(result.adjustment, null);
});

test('imputacio manual sense CSV crea donació Stripe sense stripePaymentId', async () => {
  const result = await createStripeDonations({
    parentTransactionId: 'tx-parent-manual-1',
    bankAmount: 21.17,
    payments: [
      {
        amount: 21.17,
        fee: 0,
        contactId: 'donor-2',
        date: '2026-03-17',
        imputationOrigin: 'manual',
        description: 'Imputació manual Stripe',
      },
    ],
    findDonationByStripePaymentId: async () => null,
  });

  assert.equal(result.donations.length, 1);
  assert.equal(result.donations[0].contactId, 'donor-2');
  assert.equal(result.donations[0].stripePaymentId, undefined);
  assert.equal(result.donations[0].imputationOrigin, 'manual');
});

test('duplicat Stripe queda bloquejat', async () => {
  await assert.rejects(
    () =>
      createStripeDonations({
        parentTransactionId: 'tx-parent-3',
        payments: [
          { stripePaymentId: 'pay_dup', amount: 20, fee: 1, contactId: 'donor-1', date: '2026-03-17', imputationOrigin: 'csv' },
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

test('duplicat dins la mateixa imputació queda bloquejat per stripePaymentId', async () => {
  await assert.rejects(
    () =>
      createStripeDonations({
        parentTransactionId: 'tx-parent-dup-local',
        payments: [
          { stripePaymentId: 'pay_same', amount: 12, fee: 0.43, contactId: 'donor-1', date: '2026-03-17', imputationOrigin: 'csv' },
          { stripePaymentId: 'pay_same', amount: 10, fee: 0.4, contactId: 'donor-2', date: '2026-03-17', imputationOrigin: 'csv' },
        ],
        findDonationByStripePaymentId: async () => null,
      }),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, ERR_STRIPE_DUPLICATE_PAYMENT);
      return true;
    }
  );
});

test('bloqueja nova imputació si el parent ja té imputació activa', async () => {
  await assert.rejects(
    () =>
      assertNoActiveStripeImputationByParentTransactionId({
        firestore: {} as any,
        organizationId: 'org-1',
        parentTransactionId: 'tx-parent-5',
        deps: {
          hasActiveStripeImputationByParentTransactionId: async () => true,
        },
      }),
    (error: unknown) => {
      assert.equal(error instanceof Error, true);
      assert.equal((error as Error).message, ERR_STRIPE_PARENT_ALREADY_IMPUTED);
      return true;
    }
  );
});

test('undo elimina tot per parentTransactionId', async () => {
  const deletedDocs: string[] = [];
  let clearedParentId: string | null = null;
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
        return [{ ref: { id: 'd-csv-1' } }, { ref: { id: 'd-manual-1' } }];
      },
      deleteDonationRefs: async ({ refs }) => {
        refs.forEach((docSnap) => {
          deletedDocs.push((docSnap.ref as { id: string }).id);
        });
      },
      clearParentStripeMarker: async ({ parentTransactionId: clearedId }) => {
        clearedParentId = clearedId;
      },
    },
  });

  assert.equal(result.deletedCount, 2);
  assert.deepEqual(deletedDocs, ['d-csv-1', 'd-manual-1']);
  assert.equal(clearedParentId, parentTransactionId);
});
