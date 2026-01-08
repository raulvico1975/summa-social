/**
 * Filtratge centralitzat de contactes actius
 * Evita que contactes arxivats/eliminats/inactius apareguin en matching
 */

import type { AnyContact, Donor } from '@/lib/data';

/**
 * Filtra contactes actius: exclou arxivats, eliminats i inactius
 * Usar SEMPRE abans de fer matching de remeses o mostrar selectors
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
 * Filtra només donants actius (helper tipat)
 */
export function filterActiveDonors(donors: Donor[]): Donor[] {
  return filterActiveContacts(donors);
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
