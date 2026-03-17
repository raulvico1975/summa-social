import type { Donation } from '@/lib/types/donations';

export interface DrawerStripeDonation extends Donation {
  id: string;
  amountGross: number;
  contactId: string;
  source: 'stripe';
}

type FilterStripeDonationsForDrawerArgs = {
  donations: Donation[];
  selectedYear: string;
  filterStatus: 'all' | 'returns';
};

export function isStripeDonationForDrawer(donation: Donation): donation is DrawerStripeDonation {
  return Boolean(
    donation.id &&
    donation.source === 'stripe' &&
    donation.type !== 'stripe_adjustment' &&
    !donation.archivedAt &&
    donation.contactId &&
    typeof donation.amountGross === 'number' &&
    donation.amountGross > 0
  );
}

export function filterStripeDonationsForDrawer({
  donations,
  selectedYear,
  filterStatus,
}: FilterStripeDonationsForDrawerArgs): DrawerStripeDonation[] {
  if (filterStatus === 'returns') return [];

  return donations
    .filter(isStripeDonationForDrawer)
    .filter((donation) => donation.date.startsWith(selectedYear))
    .sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return a.id.localeCompare(b.id);
    });
}
