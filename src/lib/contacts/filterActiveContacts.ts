/**
 * Filtratge centralitzat de contactes
 *
 * DOS FILTRES DIFERENTS:
 * - filterActiveContacts: per UI i llistats (exclou baixa/inactive)
 * - filterMatchableContacts: per matching fiscal (INCLOU baixa, exclou deleted/archived)
 *
 * INVARIANT: Mai crear donant nou si existeix taxId (actiu O baixa)
 */

import type { AnyContact, Donor } from '@/lib/data';

/**
 * Filtra contactes actius: exclou arxivats, eliminats i inactius
 * Usar per UI i llistats on només es volen veure els actius
 */
export function filterActiveContacts<T extends AnyContact>(contacts: T[]): T[] {
  return contacts.filter(c => {
    // Exclou arxivats
    if (c.archivedAt) return false;
    // Exclou eliminats (soft delete)
    if ('deletedAt' in c && c.deletedAt) return false;
    // Exclou inactius (només per donors que tenen status)
    if ('status' in c && c.status === 'inactive') return false;
    return true;
  });
}

/**
 * Filtra contactes per matching fiscal: INCLOU baixa/inactive
 * Exclou NOMÉS arxivats i eliminats
 *
 * IMPORTANT: Usar per matching de remeses per taxId/IBAN
 * Això garanteix que no es creïn duplicats amb el mateix DNI
 *
 * Si un donant està "Baixa" (inactive) però té taxId:
 * - Ha de fer match
 * - No s'ha de crear donant nou
 * - Es pot oferir reactivar
 */
export function filterMatchableContacts<T extends AnyContact>(contacts: T[]): T[] {
  return contacts.filter(c => {
    // Exclou arxivats (no existeixen per al sistema)
    if (c.archivedAt) return false;
    // Exclou eliminats (soft delete - no existeixen per al sistema)
    if ('deletedAt' in c && c.deletedAt) return false;
    // INCLOU inactius/baixa - són matchables per taxId/IBAN
    return true;
  });
}

/**
 * Filtra només donants actius (helper tipat)
 */
export function filterActiveDonors(donors: Donor[]): Donor[] {
  return filterActiveContacts(donors);
}

/**
 * Filtra donants per matching fiscal (inclou baixa)
 */
export function filterMatchableDonors(donors: Donor[]): Donor[] {
  return filterMatchableContacts(donors);
}

/**
 * Detecta si un string és numèric o gairebé numèric
 * Evita falsos positius en matching per nom (ex: "12345" no hauria de fer match)
 */
export function isNumericLikeName(str: string): boolean {
  if (!str) return false;
  // Elimina espais i guions, comprova si queda només números
  const cleaned = str.replace(/[\s\-]/g, '');
  return /^\d+$/.test(cleaned);
}

/**
 * Genera un valor emmascarament per mostrar traçabilitat del match
 * @param method - Tipus de match (iban, taxId, name)
 * @param value - Valor original
 * @returns Valor emmascarament per mostrar a la UI
 */
export function maskMatchValue(method: 'iban' | 'taxId' | 'name', value: string): string {
  if (!value) return '';

  switch (method) {
    case 'iban':
      // Últims 4 dígits
      return `···${value.slice(-4)}`;
    case 'taxId':
      // Últims 3 caràcters
      return `···${value.slice(-3)}`;
    case 'name':
      // Primers 2 tokens
      const tokens = value.trim().split(/\s+/).slice(0, 2);
      return tokens.join(' ');
    default:
      return value;
  }
}
