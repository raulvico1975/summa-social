import { findExistingContact, type MatchResult } from '@/lib/contact-matching';
import type { Donor } from '@/lib/data';

export type DonorDuplicateMatch =
  | { kind: 'none' }
  | { kind: 'active'; match: MatchResult & { contact: Donor } }
  | { kind: 'deleted'; match: MatchResult & { contact: Donor } };

export function classifyDonorDuplicateMatch(
  donors: Donor[],
  taxId?: string,
  iban?: string,
  email?: string
): DonorDuplicateMatch {
  const activeMatch = findExistingContact(
    donors.filter((donor) => !donor.archivedAt),
    taxId,
    iban,
    email
  );

  if (activeMatch.found && activeMatch.contact) {
    return {
      kind: 'active',
      match: {
        ...activeMatch,
        contact: activeMatch.contact as Donor,
      },
    };
  }

  const deletedMatch = findExistingContact(
    donors.filter((donor) => Boolean(donor.archivedAt)),
    taxId,
    iban,
    email
  );

  if (deletedMatch.found && deletedMatch.contact) {
    return {
      kind: 'deleted',
      match: {
        ...deletedMatch,
        contact: deletedMatch.contact as Donor,
      },
    };
  }

  return { kind: 'none' };
}
