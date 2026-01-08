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

/**
 * Determina el tipus de seqüència SEPA per un donant
 *
 * @param donor - El donant amb el seu mandat SEPA
 * @returns El tipus de seqüència a usar
 */
export function determineSequenceType(donor: Donor): SepaSequenceType {
  const mandate = donor.sepaMandate;

  // Si no té mandat, no hauria d'arribar aquí, però per seguretat
  if (!mandate) {
    throw new Error(`Donant ${donor.id} no té mandat SEPA actiu`);
  }

  // Override manual té prioritat
  if (mandate.sequenceTypeOverride) {
    return mandate.sequenceTypeOverride;
  }

  // OOFF per donacions puntuals
  if (donor.membershipType === 'one-time') {
    return 'OOFF';
  }

  // Recurrents: FRST o RCUR segons historial
  if (!mandate.lastCollectedAt) {
    return 'FRST';
  }

  return 'RCUR';
}

/**
 * Comprova si un donant és elegible per incloure en una remesa SEPA
 */
export function isEligibleForSepaCollection(donor: Donor): boolean {
  // Ha de tenir IBAN
  if (!donor.iban) {
    return false;
  }

  // Ha de tenir mandat SEPA actiu
  if (!donor.sepaMandate?.isActive) {
    return false;
  }

  // Ha de tenir UMR i data de signatura
  if (!donor.sepaMandate.umr || !donor.sepaMandate.signatureDate) {
    return false;
  }

  // Ha d'estar actiu (no donat de baixa)
  if (donor.status === 'inactive') {
    return false;
  }

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

    if (!donor.sepaMandate) {
      excluded.push({ donor, reason: 'Sense mandat SEPA' });
      continue;
    }

    if (!donor.sepaMandate.isActive) {
      excluded.push({ donor, reason: 'Mandat SEPA inactiu' });
      continue;
    }

    if (!donor.sepaMandate.umr) {
      excluded.push({ donor, reason: 'Sense UMR' });
      continue;
    }

    if (!donor.sepaMandate.signatureDate) {
      excluded.push({ donor, reason: 'Sense data signatura' });
      continue;
    }

    if (donor.status === 'inactive') {
      excluded.push({ donor, reason: 'Donant inactiu' });
      continue;
    }

    // Tot OK
    eligible.push(donor);
  }

  return { eligible, excluded };
}
