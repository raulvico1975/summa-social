/**
 * Funcions per detectar contactes existents i evitar duplicats
 *
 * Regla de creació/matching:
 * 1. Provar match per identificadors forts (NIF/IBAN/email)
 * 2. Si existeix un contacte amb `type` diferent:
 *    - NO crear un nou contacte
 *    - Actualitzar `roles` del contacte existent (afegir el nou rol)
 */

import type { ContactType, ContactRoles, AnyContact } from './data';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALITZACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalitza NIF/CIF (majúscules, sense espais ni guions)
 */
export function normalizeTaxId(taxId: string | undefined | null): string {
  if (!taxId) return '';
  return taxId.toUpperCase().replace(/[\s\-\.]/g, '').trim();
}

/**
 * Normalitza IBAN (majúscules, sense espais)
 */
export function normalizeIBAN(iban: string | undefined | null): string {
  if (!iban) return '';
  return iban.toUpperCase().replace(/\s/g, '').trim();
}

/**
 * Normalitza email (minúscules, sense espais)
 */
export function normalizeEmail(email: string | undefined | null): string {
  if (!email) return '';
  return email.toLowerCase().trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATCHING
// ═══════════════════════════════════════════════════════════════════════════════

export interface MatchResult {
  found: boolean;
  contact?: AnyContact;
  matchedBy?: 'taxId' | 'iban' | 'email';
}

/**
 * Cerca un contacte existent per identificadors forts
 * Ordre de prioritat: NIF > IBAN > email
 */
export function findExistingContact(
  contacts: AnyContact[],
  taxId?: string,
  iban?: string,
  email?: string
): MatchResult {
  const normTaxId = normalizeTaxId(taxId);
  const normIban = normalizeIBAN(iban);
  const normEmail = normalizeEmail(email);

  // 1. Match per NIF (més fort)
  if (normTaxId && normTaxId.length >= 8) {
    const match = contacts.find(c =>
      normalizeTaxId(c.taxId) === normTaxId
    );
    if (match) {
      return { found: true, contact: match, matchedBy: 'taxId' };
    }
  }

  // 2. Match per IBAN
  if (normIban && normIban.length >= 20) {
    const match = contacts.find(c =>
      'iban' in c && normalizeIBAN((c as any).iban) === normIban
    );
    if (match) {
      return { found: true, contact: match, matchedBy: 'iban' };
    }
  }

  // 3. Match per email
  if (normEmail && normEmail.includes('@')) {
    const match = contacts.find(c =>
      'email' in c && normalizeEmail((c as any).email) === normEmail
    );
    if (match) {
      return { found: true, contact: match, matchedBy: 'email' };
    }
  }

  return { found: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// GESTIÓ DE ROLS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obté els rols efectius d'un contacte
 * Si no té `roles`, només té el rol de `type`
 */
export function getEffectiveRoles(contact: AnyContact): ContactRoles {
  if (contact.roles) {
    return contact.roles;
  }
  // Fallback: només el rol del type
  return { [contact.type]: true } as ContactRoles;
}

/**
 * Comprova si un contacte té un rol específic
 */
export function hasRole(contact: AnyContact, role: ContactType): boolean {
  const roles = getEffectiveRoles(contact);
  return roles[role] === true;
}

/**
 * Crea l'objecte roles actualitzat afegint un nou rol
 */
export function addRole(contact: AnyContact, newRole: ContactType): ContactRoles {
  const currentRoles = getEffectiveRoles(contact);
  return {
    ...currentRoles,
    [newRole]: true,
  };
}

/**
 * Comprova si afegir un rol és necessari
 */
export function needsRoleUpdate(contact: AnyContact, newRole: ContactType): boolean {
  return !hasRole(contact, newRole);
}
