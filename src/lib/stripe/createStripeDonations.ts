import type { Donation } from '@/lib/types/donations';

export const ERR_STRIPE_DUPLICATE_PAYMENT = 'ERR_STRIPE_DUPLICATE_PAYMENT';

export interface StripePaymentInput {
  stripePaymentId?: string | null;
  amount: number;
  fee?: number | null;
  contactId: string | null;
  date: string;
  imputationOrigin: 'csv' | 'manual';
  customerEmail?: string | null;
  description?: string | null;
}

export interface CreateStripeDonationsInput {
  parentTransactionId: string;
  payments: StripePaymentInput[];
  bankAmount?: number | null;
  adjustmentDate?: string;
  findDonationByStripePaymentId: (stripePaymentId: string) => Promise<Donation | null>;
}

export interface CreateStripeDonationsResult {
  donations: Donation[];
  adjustment: Donation | null;
}

export async function createStripeDonations({
  parentTransactionId,
  payments,
  bankAmount = null,
  adjustmentDate,
  findDonationByStripePaymentId,
}: CreateStripeDonationsInput): Promise<CreateStripeDonationsResult> {
  const seenStripePaymentIds = new Set<string>();
  const donations: Donation[] = [];

  for (const payment of payments) {
    if (!payment.contactId) {
      throw new Error('ERR_STRIPE_CONTACT_REQUIRED');
    }
    const stripePaymentId = payment.stripePaymentId?.trim() ?? '';

    if (payment.imputationOrigin === 'csv') {
      if (!stripePaymentId) {
        throw new Error('ERR_STRIPE_PAYMENT_ID_REQUIRED');
      }
      if (seenStripePaymentIds.has(stripePaymentId)) {
        throw new Error(ERR_STRIPE_DUPLICATE_PAYMENT);
      }

      const exists = await findDonationByStripePaymentId(stripePaymentId);
      if (exists) {
        throw new Error(ERR_STRIPE_DUPLICATE_PAYMENT);
      }

      seenStripePaymentIds.add(stripePaymentId);
    }

    donations.push({
      date: payment.date,
      contactId: payment.contactId,
      amountGross: payment.amount,
      source: 'stripe',
      parentTransactionId,
      imputationOrigin: payment.imputationOrigin,
      type: 'donation',
      description: payment.description ?? (
        payment.customerEmail
          ? `Donacio Stripe - ${payment.customerEmail}`
          : 'Donacio Stripe manual'
      ),
      customerEmail: payment.customerEmail ?? null,
      archivedAt: null,
      ...(stripePaymentId ? { stripePaymentId } : {}),
    });
  }

  const expectedNet = payments.reduce((sum, payment) => sum + (payment.amount - (payment.fee ?? 0)), 0);
  const diff = bankAmount == null ? 0 : Number((bankAmount - expectedNet).toFixed(2));
  const adjustment =
    bankAmount != null && Math.abs(diff) > 0
      ? {
          date: adjustmentDate ?? donations[0]?.date ?? new Date().toISOString().slice(0, 10),
          contactId: null,
          amount: diff,
          source: 'stripe' as const,
          parentTransactionId,
          imputationOrigin: payments.some((payment) => payment.imputationOrigin === 'manual') ? 'manual' as const : 'csv' as const,
          type: 'stripe_adjustment' as const,
          description: 'Ajust Stripe',
          archivedAt: null,
        }
      : null;

  return { donations, adjustment };
}
