/**
 * Lògica per determinar el SeqTp (Sequence Type) SEPA
 *
 * Regles:
 * - FRST: Primer cobrament d'un mandat recurrent (lastCollectedAt = null)
 * - RCUR: Cobraments successius d'un mandat recurrent
 * - OOFF: Cobrament únic (membershipType = 'one-time')
 * - FNAL: Últim cobrament (override manual, no automàtic)
 */

import type { Donor, SepaSequenceType } from '@/lib/data';
import { getIbanLengthIssue } from './iban-length';

/**
 * Determina el tipus de seqüència SEPA per un donant
 *
 * @param donor - El donant amb el seu mandat SEPA
 * @returns El tipus de seqüència a usar
 */
export function determineSequenceType(donor: Donor): SepaSequenceType {
  // Override manual del mandat té prioritat (si existeix)
  if (donor.sepaMandate?.sequenceTypeOverride) {
    return donor.sepaMandate.sequenceTypeOverride;
  }

  // OOFF per donacions puntuals
  if (donor.membershipType === 'one-time') {
    return 'OOFF';
  }

  // FRST si mai s'ha cobrat, RCUR si ja s'ha cobrat
  if (!donor.sepaPain008LastRunAt && !donor.sepaMandate?.lastCollectedAt) {
    return 'FRST';
  }

  return 'RCUR';
}

/**
 * Comprova si un donant és elegible per incloure en una remesa SEPA
 */
export function isEligibleForSepaCollection(donor: Donor): boolean {
  if (!donor.iban) return false;
  if (donor.membershipType !== 'recurring') return false;
  if (!donor.taxId) return false;
  if (!donor.memberSince) return false;
  if (donor.status === 'inactive') return false;
  return true;
}

/**
 * Prepara la llista de donants elegibles per una remesa SEPA
 */
export function filterEligibleDonors(donors: Donor[]): {
  eligible: Donor[];
  excluded: Array<{ donor: Donor; reason: string }>;
} {
  const eligible: Donor[] = [];
  const excluded: Array<{ donor: Donor; reason: string }> = [];

  for (const donor of donors) {
    if (!donor.iban) {
      excluded.push({ donor, reason: 'Sense IBAN' });
      continue;
    }

    const ibanIssue = getIbanLengthIssue(donor.iban);
    if (ibanIssue) {
      excluded.push({
        donor,
        reason: `IBAN_INCOMPLET:${ibanIssue.country}:${ibanIssue.length}:${ibanIssue.expected}`,
      });
      continue;
    }

    if (donor.membershipType !== 'recurring') {
      excluded.push({ donor, reason: 'No és recurrent' });
      continue;
    }

    if (!donor.taxId) {
      excluded.push({ donor, reason: 'Sense NIF' });
      continue;
    }

    if (!donor.memberSince) {
      excluded.push({ donor, reason: "Sense data d'alta" });
      continue;
    }

    if (donor.status === 'inactive') {
      excluded.push({ donor, reason: 'Donant inactiu' });
      continue;
    }

    eligible.push(donor);
  }

  return { eligible, excluded };
}
