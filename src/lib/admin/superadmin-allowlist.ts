/**
 * Allowlist de SuperAdmins per email
 *
 * Aquesta llista controla l'accés UI a /admin.
 * Els emails llistats aquí poden entrar al panell d'administració.
 *
 * El registre Firestore (systemSuperAdmins/{uid}) s'alinea automàticament
 * quan un usuari allowlisted entra a /admin.
 */

export const SUPERADMIN_EMAILS = [
  'raul.vico.ferre@gmail.com',
  'raul@semillasl.com',
] as const;

/**
 * Comprova si un email està a l'allowlist de SuperAdmins
 */
export function isAllowlistedSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  return SUPERADMIN_EMAILS.some(allowed => allowed.toLowerCase() === normalizedEmail);
}
