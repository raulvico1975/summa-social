// All data is now managed in Firestore. This file only contains type definitions.

// ═══════════════════════════════════════════════════════════════════════════════
// TIPUS EXISTENTS (sense canvis)
// ═══════════════════════════════════════════════════════════════════════════════

export type Transaction = {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string | null; // This is a key, not a name
  document: string | null;
  emisorId?: string | null;
  projectId?: string | null;
};

export type Category = {
  id: string;
  name: string; // This is a key, e.g., 'rent', 'donations'
  type: 'income' | 'expense';
};

export type Emisor = {
  id: string;
  name: string;
  taxId: string; // DNI/CIF
  zipCode: string;
  type: 'donor' | 'supplier' | 'volunteer';
};

export type Project = {
  id: string;
  name: string;
  funderId: string | null; // Emisor ID of the funder
};

// ═══════════════════════════════════════════════════════════════════════════════
// NOUS TIPUS PER MULTI-ORGANITZACIÓ
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Representa una organització (ONG/entitat social).
 * Cada organització té les seves pròpies dades (transaccions, categories, etc.)
 */
export type Organization = {
  id: string;
  slug: string;                    // URL-friendly: "creu-roja" → /creu-roja/dashboard
  name: string;                    // Nom complet: "Creu Roja Barcelona"
  taxId: string;                   // CIF de l'entitat (ex: "G12345678")
  createdAt: string;               // Data de creació (format ISO)
};

/**
 * Representa un membre d'una organització.
 * Cada usuari pot tenir un rol diferent dins l'organització.
 */
export type OrganizationMember = {
  userId: string;                  // UID de Firebase Auth
  email: string;                   // Email de l'usuari
  displayName: string;             // Nom visible
  role: OrganizationRole;          // Rol dins l'organització
  joinedAt: string;                // Data d'incorporació (format ISO)
};

/**
 * Rols disponibles dins una organització.
 * - admin: Control total (pot gestionar membres, configuració, tot)
 * - treasurer: Gestió financera (moviments, informes, categories)
 * - viewer: Només lectura (pot veure però no modificar)
 */
export type OrganizationRole = 'admin' | 'treasurer' | 'viewer';

/**
 * Informació bàsica de l'organització de l'usuari actual.
 * S'utilitza per accedir ràpidament a l'organització sense consultes addicionals.
 */
export type UserProfile = {
  organizationId: string;          // ID de l'organització a la que pertany
  role: OrganizationRole;          // Rol de l'usuari en aquesta organització
  displayName: string;             // Nom de l'usuari per mostrar a la UI
};
