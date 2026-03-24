import type { Donor } from '@/lib/data';

export type StripeQuickDonorKind = 'donor' | 'member';

export interface StripeQuickDonorFormInput {
  name: string;
  email: string;
  taxId: string;
  zipCode: string;
}

export interface StripeQuickDonorContactPayload {
  type: 'donor';
  roles: { donor: true };
  name: string;
  taxId: string | null;
  zipCode: string | null;
  email: string | null;
  donorType: 'individual';
  membershipType: 'one-time' | 'recurring';
  memberSince: string | null;
  periodicityQuota: 'manual' | null;
  status: 'active';
  createdAt: string;
  updatedAt: string;
}

function normalizeOptionalString(value: string): string | null {
  const normalized = value.trim();
  return normalized ? normalized : null;
}

export function buildStripeQuickDonorContactPayload(input: {
  kind: StripeQuickDonorKind;
  formData: StripeQuickDonorFormInput;
  nowIso: string;
  memberSince?: string | null;
}): StripeQuickDonorContactPayload {
  const isMember = input.kind === 'member';

  return {
    type: 'donor',
    roles: { donor: true },
    name: input.formData.name.trim(),
    taxId: normalizeOptionalString(input.formData.taxId),
    zipCode: normalizeOptionalString(input.formData.zipCode),
    email: normalizeOptionalString(input.formData.email),
    donorType: 'individual',
    membershipType: isMember ? 'recurring' : 'one-time',
    memberSince: isMember ? (input.memberSince ?? null) : null,
    periodicityQuota: isMember ? 'manual' : null,
    status: 'active',
    createdAt: input.nowIso,
    updatedAt: input.nowIso,
  };
}

export function toLocalDonorFromStripeQuickPayload(
  donorId: string,
  payload: StripeQuickDonorContactPayload
): Donor {
  return {
    id: donorId,
    type: 'donor',
    roles: payload.roles,
    name: payload.name,
    taxId: payload.taxId ?? '',
    zipCode: payload.zipCode ?? '',
    email: payload.email ?? undefined,
    donorType: payload.donorType,
    membershipType: payload.membershipType,
    memberSince: payload.memberSince ?? undefined,
    periodicityQuota: payload.periodicityQuota,
    status: payload.status,
    createdAt: payload.createdAt,
    updatedAt: payload.updatedAt,
  };
}
