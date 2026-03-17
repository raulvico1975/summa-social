import type { Donor } from '@/lib/data';
import type { StripePayoutGroup } from '@/components/stripe-importer/useStripeImporter';

export type EditableStripeImputationLine = {
  localId: string;
  contactId: string | null;
  amountGross: number | null;
  imputationOrigin: 'csv' | 'manual';
  stripePaymentId?: string;
  feeAmount?: number | null;
  customerEmail?: string | null;
  description?: string | null;
  date?: string | null;
};

export type EditableStripeImputationSummary = {
  totalImputed: number;
  difference: number;
  hasInvalidLines: boolean;
  duplicateStripePaymentIds: string[];
};

export type StripeDonorUsageStats = Record<string, {
  count: number;
  lastDate: string | null;
}>;

export function createManualEditableStripeImputationLine(localId: string): EditableStripeImputationLine {
  return {
    localId,
    contactId: null,
    amountGross: null,
    imputationOrigin: 'manual',
  };
}

export function buildEditableStripeImputationLinesFromGroup({
  group,
  donorByEmail,
  createLocalId,
}: {
  group: StripePayoutGroup;
  donorByEmail: Map<string, string>;
  createLocalId: () => string;
}): EditableStripeImputationLine[] {
  return group.rows.map((row) => ({
    localId: createLocalId(),
    contactId: donorByEmail.get(row.customerEmail.toLowerCase().trim()) ?? null,
    amountGross: row.amount,
    imputationOrigin: 'csv',
    stripePaymentId: row.id,
    feeAmount: row.fee,
    customerEmail: row.customerEmail,
    description: row.description,
    date: row.createdDate,
  }));
}

export function resetEditableStripeImputationLinesFromCsv({
  matchingGroups,
  selectedTransferId,
  donorByEmail,
  createLocalId,
}: {
  matchingGroups: StripePayoutGroup[];
  selectedTransferId: string | null;
  donorByEmail: Map<string, string>;
  createLocalId: () => string;
}): EditableStripeImputationLine[] {
  if (!selectedTransferId) return [];
  const group = matchingGroups.find((item) => item.transferId === selectedTransferId);
  if (!group) return [];
  return buildEditableStripeImputationLinesFromGroup({
    group,
    donorByEmail,
    createLocalId,
  });
}

export function resolveInitialSelectedTransferId(matchingGroups: StripePayoutGroup[]): string | null {
  return matchingGroups.length === 1 ? matchingGroups[0].transferId : null;
}

export function shouldPromptCsvReplacement(lines: EditableStripeImputationLine[]): boolean {
  return lines.length > 0;
}

export function calculateEditableStripeImputationSummary({
  lines,
  bankAmount,
}: {
  lines: EditableStripeImputationLine[];
  bankAmount: number;
}): EditableStripeImputationSummary {
  const totalImputed = Number(
    lines.reduce((sum, line) => sum + (line.amountGross ?? 0), 0).toFixed(2)
  );
  const difference = Number((bankAmount - totalImputed).toFixed(2));
  const hasInvalidLines = lines.some((line) => {
    const amountGross = line.amountGross;
    return !line.contactId || amountGross == null || !Number.isFinite(amountGross) || amountGross <= 0;
  });

  const seen = new Set<string>();
  const duplicateStripePaymentIds = new Set<string>();
  for (const line of lines) {
    const stripePaymentId = line.stripePaymentId?.trim();
    if (!stripePaymentId) continue;
    if (seen.has(stripePaymentId)) {
      duplicateStripePaymentIds.add(stripePaymentId);
      continue;
    }
    seen.add(stripePaymentId);
  }

  return {
    totalImputed,
    difference,
    hasInvalidLines,
    duplicateStripePaymentIds: [...duplicateStripePaymentIds],
  };
}

export function sortDonorsForStripeImputation(
  donors: Donor[],
  stripeUsageByDonorId: StripeDonorUsageStats = {}
): Donor[] {
  return [...donors].sort((a, b) => {
    const usageA = stripeUsageByDonorId[a.id] ?? { count: 0, lastDate: null };
    const usageB = stripeUsageByDonorId[b.id] ?? { count: 0, lastDate: null };

    const hasRecentA = usageA.lastDate ? 1 : 0;
    const hasRecentB = usageB.lastDate ? 1 : 0;
    if (hasRecentA !== hasRecentB) {
      return hasRecentB - hasRecentA;
    }

    if (usageA.lastDate && usageB.lastDate && usageA.lastDate !== usageB.lastDate) {
      return usageB.lastDate.localeCompare(usageA.lastDate);
    }

    if (usageA.count !== usageB.count) {
      return usageB.count - usageA.count;
    }

    return a.name.localeCompare(b.name, 'ca', { sensitivity: 'base' });
  });
}
