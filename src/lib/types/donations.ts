export interface Donation {
  id?: string;
  date: string;
  contactId: string | null;
  amountGross?: number;
  amount?: number;
  source?: 'stripe';
  stripePaymentId?: string;
  parentTransactionId: string;
  imputationOrigin?: 'csv' | 'manual';
  type?: 'donation' | 'stripe_adjustment';
  description?: string | null;
  customerEmail?: string | null;
  archivedAt?: string | null;
}
