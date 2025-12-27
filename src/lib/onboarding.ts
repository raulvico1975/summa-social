/**
 * Onboarding utilities - Modal de benvinguda per primer admin
 *
 * Nova lògica simplificada:
 * - Només el primer admin veu una modal de benvinguda el primer cop
 * - No hi ha checklist persistent, ni progrés, ni estats complexos
 * - welcomeSeenAt es marca un cop i no torna a sortir
 */

import type { Organization, OrganizationMember } from './data';

/**
 * Determina si l'usuari actual és el "primer admin" de l'organització.
 *
 * Criteri: El membre admin/superadmin amb joinedAt més antic.
 *
 * Fallback si no hi ha timestamps: Si l'usuari és admin i és l'únic admin existent.
 */
export function isFirstAdmin(
  currentUserId: string | undefined,
  members: OrganizationMember[] | null
): boolean {
  if (!currentUserId || !members || members.length === 0) return false;

  // Filtrar només admins
  const admins = members.filter(m => m.role === 'admin');
  if (admins.length === 0) return false;

  // Comprovar si l'usuari actual és admin
  const currentMember = admins.find(m => m.userId === currentUserId);
  if (!currentMember) return false;

  // Fallback: si és l'únic admin
  if (admins.length === 1) return true;

  // Ordenar per joinedAt ascendent
  const sortedAdmins = [...admins].sort((a, b) => {
    const dateA = a.joinedAt ? new Date(a.joinedAt).getTime() : Infinity;
    const dateB = b.joinedAt ? new Date(b.joinedAt).getTime() : Infinity;
    return dateA - dateB;
  });

  // El primer admin és el que té joinedAt més antic
  return sortedAdmins[0]?.userId === currentUserId;
}

/**
 * Determina si cal mostrar la modal de benvinguda.
 *
 * Condicions:
 * - L'usuari és el primer admin
 * - No s'ha vist mai la modal (welcomeSeenAt no existeix)
 */
export function shouldShowWelcomeModal(
  organization: Organization | null,
  currentUserId: string | undefined,
  members: OrganizationMember[] | null
): boolean {
  if (!organization) return false;

  // Si ja s'ha vist, no mostrar
  if (organization.onboarding?.welcomeSeenAt) return false;

  // Només per al primer admin
  return isFirstAdmin(currentUserId, members);
}
