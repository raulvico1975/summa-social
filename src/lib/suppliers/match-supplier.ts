// src/lib/suppliers/match-supplier.ts
// Helper per trobar un proveïdor existent a partir de CIF/NIF o nom

import type { Contact, Supplier, Employee } from '@/lib/data';

/**
 * Input per fer match d'un proveïdor.
 */
export interface MatchSupplierInput {
  taxId?: string;
  name?: string;
}

/**
 * Tipus de contacte que pot ser un "supplier" (proveïdor o treballador).
 */
type SupplierLikeContact = Supplier | Employee;

/**
 * Normalitza un CIF/NIF per comparació.
 * - Elimina espais, guions i punts
 * - Converteix a majúscules
 * - Elimina prefix "ES" si existeix (format VIES)
 */
export function normalizeTaxId(taxId: string | undefined | null): string {
  if (!taxId) return '';
  return taxId
    .replace(/[\s\-\.]/g, '')
    .toUpperCase()
    .replace(/^ES/, '');
}

/**
 * Normalitza un nom per comparació.
 * - Converteix a minúscules
 * - Elimina accents
 * - Elimina espais extra
 * - Elimina sufixos legals comuns (S.L., S.A., etc.)
 */
export function normalizeName(name: string | undefined | null): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')  // Eliminar accents
    .replace(/\s+/g, ' ')              // Normalitzar espais
    .trim()
    .replace(/,?\s*(s\.?l\.?u?\.?|s\.?a\.?|s\.?c\.?|c\.?b\.?)$/i, '')  // Eliminar sufixos legals
    .trim();
}

/**
 * Cerca un proveïdor o treballador a la llista de contactes.
 *
 * Prioritat de match:
 * 1. CIF/NIF exacte (normalitzat) - només si és supplier o employee
 * 2. Nom exacte (normalitzat) - només si és supplier o employee
 *
 * @param input - Dades del proveïdor a buscar
 * @param contacts - Llista de contactes de l'organització
 * @returns ID del contacte si es troba, null si no
 */
export function matchSupplier(
  input: MatchSupplierInput,
  contacts: Contact[]
): string | null {
  // Filtrar només suppliers i employees (no donors)
  const supplierLikeContacts = contacts.filter(
    (c): c is SupplierLikeContact => c.type === 'supplier' || c.type === 'employee'
  );

  if (supplierLikeContacts.length === 0) return null;

  const normalizedInputTaxId = normalizeTaxId(input.taxId);
  const normalizedInputName = normalizeName(input.name);

  // 1. Match per CIF/NIF exacte
  if (normalizedInputTaxId) {
    for (const contact of supplierLikeContacts) {
      const contactTaxId = normalizeTaxId(contact.taxId);
      if (contactTaxId && contactTaxId === normalizedInputTaxId) {
        return contact.id;
      }
    }
  }

  // 2. Match per nom exacte (només si no hem trobat per CIF)
  if (normalizedInputName) {
    for (const contact of supplierLikeContacts) {
      const contactName = normalizeName(contact.name);
      if (contactName && contactName === normalizedInputName) {
        return contact.id;
      }
    }
  }

  return null;
}

/**
 * Versió que retorna el contacte complet en lloc de només l'ID.
 */
export function findSupplier(
  input: MatchSupplierInput,
  contacts: Contact[]
): SupplierLikeContact | null {
  const id = matchSupplier(input, contacts);
  if (!id) return null;
  return contacts.find(
    (c): c is SupplierLikeContact => c.id === id && (c.type === 'supplier' || c.type === 'employee')
  ) || null;
}
