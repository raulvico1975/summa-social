// All data is now managed in Firestore. This file only contains type definitions.

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS BASE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tipus de transacció per identificar devolucions
 */
export type TransactionType = 'normal' | 'return' | 'return_fee';

/**
 * Estat d'una donació
 */
export type DonationStatus = 'completed' | 'returned' | 'partial';

export type Transaction = {
  id: string;
  date: string;
  description: string;             // Concepte original del banc (no editable)
  note?: string | null;            // Nota/descripció editable per l'usuari
  amount: number;
  category: string | null;
  document: string | null;
  contactId?: string | null;
  contactType?: ContactType;
  projectId?: string | null;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPS PER GESTIÓ DE DEVOLUCIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Tipus de transacció
   * - normal: Transacció normal (ingrés o despesa)
   * - return: Devolució de rebut/donació
   * - return_fee: Comissió bancària per devolució
   */
  transactionType?: TransactionType;
  
  /**
   * Estat de la donació (només per ingressos de donants)
   * - completed: Donació cobrada correctament
   * - returned: Donació retornada (rebut devolt)
   * - partial: Parcialment retornada (casos excepcionals)
   */
  donationStatus?: DonationStatus;
  
  /**
   * ID de la transacció original (per devolucions)
   * Permet vincular una devolució amb la donació original
   */
  linkedTransactionId?: string | null;
  
  /**
   * IDs de transaccions vinculades (per devolucions agrupades)
   * Quan un apunt bancari agrupa múltiples devolucions
   */
  linkedTransactionIds?: string[];
  
  /**
   * Indica si aquesta transacció s'ha dividit en múltiples
   * Similar a les remeses dividides
   */
  isSplit?: boolean;
  
  /**
   * ID de la transacció pare (si és fruit d'una divisió)
   */
  parentTransactionId?: string | null;
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
export type ContactType = 'donor' | 'supplier' | 'employee';

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
  city?: string;                   // Ciutat
  province?: string;               // Província
  createdAt: string;
  updatedAt?: string;
  defaultCategoryId?: string;      // Categoria per defecte per auto-assignar a transaccions
};

/**
 * Estat d'un donant/soci
 */
export type DonorStatus = 'active' | 'pending_return' | 'inactive';

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
  // Adreça completa (per certificats de donació)
  address?: string;
  monthlyAmount?: number;                    // Import mensual/periòdic
  memberSince?: string;                      // Data d'alta com a soci
  // Dades bancàries (per domiciliacions)
  iban?: string;
  // Contacte
  email?: string;
  phone?: string;
  // Notes
  notes?: string;
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPS PER GESTIÓ DE DEVOLUCIONS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Estat del donant
   * - active: Tot correcte
   * - pending_return: Té devolucions pendents de resoldre
   * - inactive: Donat de baixa o massa devolucions
   */
  status?: DonorStatus;
  
  /**
   * Comptador de devolucions
   * Per generar alertes quan supera un llindar
   */
  returnCount?: number;
  
  /**
   * Data de l'última devolució
   */
  lastReturnDate?: string;
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
/**
 * Treballador - Persona contractada per l'entitat
 */
export type Employee = Contact & {
  type: 'employee';
  // Dades bancàries (per pagar nòmines)
  iban?: string;
  // Data d'alta
  startDate?: string;
  // Contacte
  email?: string;
  phone?: string;
  // Notes
  notes?: string;
};
export type AnyContact = Donor | Supplier | Employee;

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
 * Estats possibles d'una organització
 */
export type OrganizationStatus = 'active' | 'suspended' | 'pending';

/**
 * Idiomes suportats per l'organització (certificats, emails, etc.)
 */
export type OrganizationLanguage = 'ca' | 'es';

/**
 * Representa una organització (ONG/entitat social).
 * S'emmagatzema a: organizations/{orgId}
 */
export type Organization = {
  id: string;
  name: string;                    // Nom complet de l'entitat
  slug: string;                    // URL-friendly identifier
  taxId: string;                   // CIF
  // Estat i control
  status: OrganizationStatus;      // Estat de l'organització
  createdAt: string;
  createdBy: string;               // UID del Super Admin que la va crear
  // Dades opcionals
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  // Branding i certificats
  logoUrl?: string;                // URL del logo (Firebase Storage)
  signatureUrl?: string;           // URL de la firma digitalitzada (Firebase Storage)
  signatoryName?: string;          // Nom del signant (ex: "Maria Garcia López")
  signatoryRole?: string;          // Càrrec del signant (ex: "Presidenta")
  // Configuració d'alertes
  contactAlertThreshold?: number;  // Llindar mínim (€) per alertes de moviments sense contacte (default: 50)
  // Configuració d'idioma
  language?: OrganizationLanguage; // Idioma per certificats i emails (default: 'es')
  // Metadata
  updatedAt?: string;
  suspendedAt?: string;
  suspendedReason?: string;
};

/**
 * Representa un membre d'una organització.
 * S'emmagatzema a: organizations/{orgId}/members/{userId}
 */
export type OrganizationMember = {
  userId: string;
  email: string;
  displayName: string;
  role: OrganizationRole;
  joinedAt: string;
  invitedBy?: string;              // UID de qui el va convidar
};

/**
 * Rols disponibles dins una organització.
 * - admin: Control total de l'organització
 * - user: Gestió financera (transaccions, contactes, informes)
 * - viewer: Només lectura
 */
export type OrganizationRole = 'admin' | 'user' | 'viewer';

/**
 * Etiquetes dels rols per mostrar a la UI
 */
export const ROLE_LABELS: Record<OrganizationRole, string> = {
  admin: 'Administrador',
  user: 'Usuari',
  viewer: 'Només lectura',
};

/**
 * Perfil d'usuari global.
 * S'emmagatzema a: users/{userId}
 * Conté la referència a l'organització principal (per login directe)
 */
export type UserProfile = {
  organizationId: string;          // Organització principal/per defecte
  role: OrganizationRole;
  displayName: string;
  email?: string;
  // Per usuaris amb múltiples organitzacions
  organizations?: string[];        // Array d'IDs d'organitzacions
};

/**
 * UID del Super Admin (pot accedir a tot)
 */
export const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';


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

// ═══════════════════════════════════════════════════════════════════════════════
// PATRONS DE DETECCIÓ DE DEVOLUCIONS PER BANC
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Patrons per detectar devolucions als extractes bancaris
 * Cada banc té el seu format específic
 */
export const RETURN_PATTERNS = {
  // Devolucions
  return: [
    /devolucion\s*(de)?\s*recibo/i,                    // Santander: "Devolucion De Recibo"
    /adeudo\s*devolucion\s*recibos/i,                  // Triodos: "ADEUDO DEVOLUCION RECIBOS"
    /dev\.?\s*recibo/i,                                // CaixaBank: "DEV.RECIBO ADEUDO SEPA"
    /recibo\s*devuelto/i,                              // Genèric
    /devolución/i,                                     // Genèric amb accent
  ],
  // Comissions per devolució
  returnFee: [
    /comision\s*devol/i,                               // Triodos: "COMISION DEVOL. RECIBOS"
    /gastos?\s*devolucion/i,                           // Santander: "Gastos Devoluciones De Recibos"
    /comision.*devolucion/i,                           // Genèric
    /gastos?.*devol/i,                                 // Genèric
  ],
} as const;

/**
 * Detecta si una descripció correspon a una devolució
 * @returns 'return' | 'return_fee' | null
 */
export function detectReturnType(description: string): TransactionType | null {
  const normalized = description.toLowerCase();
  
  // Primer comprovar si és una comissió (més específic)
  for (const pattern of RETURN_PATTERNS.returnFee) {
    if (pattern.test(normalized)) {
      return 'return_fee';
    }
  }
  
  // Després comprovar si és una devolució
  for (const pattern of RETURN_PATTERNS.return) {
    if (pattern.test(normalized)) {
      return 'return';
    }
  }
  
  return null;
}
