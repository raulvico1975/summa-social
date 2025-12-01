// All data is now managed in Firestore. This file only contains type definitions.

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS BASE
// ═══════════════════════════════════════════════════════════════════════════════

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null;
  document: string | null;
  contactId?: string | null;      // CANVI: emisorId -> contactId (més genèric)
  contactType?: ContactType;       // NOU: tipus de contacte per facilitar filtres
  projectId?: string | null;
};

export type Category = {
  id: string;
  name: string;
  type: 'income' | 'expense';
};

export type Project = {
  id: string;
  name: string;
  funderId: string | null;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SISTEMA DE CONTACTES (Donants + Proveïdors)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tipus de contacte
 */
export type ContactType = 'donor' | 'supplier';

/**
 * Model base comú per tots els contactes
 * S'emmagatzema a: organizations/{orgId}/contacts/{contactId}
 */
export type Contact = {
  id: string;
  type: ContactType;
  name: string;
  taxId: string;                   // DNI/CIF
  zipCode: string;                 // Codi postal
  createdAt: string;
  updatedAt?: string;
};

/**
 * Donant - Persona o entitat que fa donacions
 * Camps específics per a la gestió de donants i Model 182
 */
export type Donor = Contact & {
  type: 'donor';
  // Classificació
  donorType: 'individual' | 'company';       // Persona física o jurídica
  // Tipus de donació
  membershipType: 'one-time' | 'recurring';  // Puntual o recurrent (soci)
  // Dades per socis recurrents
  monthlyAmount?: number;                    // Import mensual/periòdic
  memberSince?: string;                      // Data d'alta com a soci
  // Dades bancàries (per domiciliacions)
  iban?: string;
  // Contacte
  email?: string;
  phone?: string;
  // Notes
  notes?: string;
};

/**
 * Proveïdor - Empresa o professional que presta serveis o ven productes
 */
export type Supplier = Contact & {
  type: 'supplier';
  // Classificació
  category?: string;                         // Serveis, materials, subministraments...
  // Dades fiscals i de contacte
  address?: string;                          // Adreça completa
  email?: string;
  phone?: string;
  // Dades bancàries (per fer pagaments)
  iban?: string;
  // Condicions
  paymentTerms?: string;                     // Ex: "30 dies", "Al comptat"
  // Notes
  notes?: string;
};

/**
 * Tipus unió per quan necessitem treballar amb qualsevol tipus de contacte
 */
export type AnyContact = Donor | Supplier;

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS LEGACY (per compatibilitat - DEPRECAT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @deprecated Usar Donor o Supplier en lloc d'Emisor
 * Mantingut temporalment per compatibilitat amb codi existent
 */
export type Emisor = {
  id: string;
  name: string;
  taxId: string;
  zipCode: string;
  type: 'donor' | 'supplier' | 'volunteer';
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS PER MULTI-ORGANITZACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Representa una organització (ONG/entitat social).
 */
export type Organization = {
  id: string;
  slug: string;
  name: string;
  taxId: string;
  createdAt: string;
};

/**
 * Representa un membre d'una organització.
 */
export type OrganizationMember = {
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationRole;
  joinedAt: string;
};

/**
 * Rols disponibles dins una organització.
 * - admin: Control total
 * - user: Gestió financera
 * - viewer: Només lectura
 */
export type OrganizationRole = 'admin' | 'user' | 'viewer';

/**
 * Perfil d'usuari amb la seva organització assignada.
 */
export type UserProfile = {
  organizationId: string;
  role: OrganizationRole;
  displayName: string;
};

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS PER SISTEMA D'INVITACIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Representa una invitació per unir-se a una organització.
 */
export type Invitation = {
  id: string;
  token: string;
  organizationId: string;
  organizationName: string;
  role: OrganizationRole;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  email?: string;
  usedAt?: string;
  usedBy?: string;
};

/**
 * Estat d'una invitació
 */
export type InvitationStatus = 'pending' | 'used' | 'expired';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS I HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Categories predefinides per proveïdors
 */
export const SUPPLIER_CATEGORIES = [
  'services',      // Serveis professionals
  'utilities',     // Subministraments (llum, aigua, gas)
  'materials',     // Materials i equipament
  'rent',          // Lloguer
  'insurance',     // Assegurances
  'banking',       // Serveis bancaris
  'communications', // Telecomunicacions
  'transport',     // Transport i missatgeria
  'maintenance',   // Manteniment
  'other',         // Altres
] as const;

export type SupplierCategory = typeof SUPPLIER_CATEGORIES[number];
