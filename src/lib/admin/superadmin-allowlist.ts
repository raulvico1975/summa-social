/**
 * Allowlist de SuperAdmins per email
 *
 * Aquesta llista controla l'accés UI a /admin.
 * Els emails llistats aquí poden entrar al panell d'administració.
 *
 * El registre Firestore (systemSuperAdmins/{uid}) s'alinea automàticament
 * quan un usuari allowlisted entra a /admin.
 *
 * En mode DEMO, es pot afegir un email addicional via SUPERADMIN_EMAIL a .env.demo
 */

const SUPERADMIN_EMAILS_BASE = [
  'raul.vico.ferre@gmail.com',
  'raul@semillasl.com',
] as const;

/**
 * Llista completa d'emails SuperAdmin
 * Inclou els hardcoded + l'opcional de env (per DEMO)
 */
function getSuperAdminEmails(): string[] {
  const emails: string[] = [...SUPERADMIN_EMAILS_BASE];

  // En servidor, permetre afegir email via env (per DEMO)
  if (typeof process !== 'undefined' && process.env?.SUPERADMIN_EMAIL) {
    const envEmail = process.env.SUPERADMIN_EMAIL.toLowerCase().trim();
    if (envEmail && !emails.includes(envEmail)) {
      emails.push(envEmail);
    }
  }

  return emails;
}

// Export per compatibilitat (només els hardcoded)
export const SUPERADMIN_EMAILS = SUPERADMIN_EMAILS_BASE;

/**
 * Comprova si un email està a l'allowlist de SuperAdmins
 */
export function isAllowlistedSuperAdmin(email?: string | null): boolean {
  if (!email) return false;
  const normalizedEmail = email.toLowerCase().trim();
  const allowedEmails = getSuperAdminEmails();
  return allowedEmails.some(allowed => allowed.toLowerCase() === normalizedEmail);
}
