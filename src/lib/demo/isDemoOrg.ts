/**
 * Helper únic per detectar entorn DEMO
 *
 * Regles:
 * - isDemoEnv(): true si APP_ENV === 'demo'
 * - isDemoOrg(org): true si estem en demo I l'org té slug='demo' I isDemo=true
 *
 * Guardrail: MAI comparar per orgId directament.
 */

/**
 * Detecta si estem executant en entorn DEMO
 * Funciona tant a client (NEXT_PUBLIC_APP_ENV) com a server (APP_ENV)
 */
export function isDemoEnv(): boolean {
  // Client-side: usa NEXT_PUBLIC_APP_ENV (exposat al browser)
  // Server-side: pot usar APP_ENV o NEXT_PUBLIC_APP_ENV
  return (
    process.env.NEXT_PUBLIC_APP_ENV === 'demo' ||
    process.env.APP_ENV === 'demo'
  );
}

/**
 * Detecta si una organització és l'org demo
 * Requereix que estem en entorn demo I que l'org tingui slug='demo' I isDemo=true
 */
export function isDemoOrg(
  org: { slug?: string; isDemo?: boolean } | null | undefined
): boolean {
  if (!isDemoEnv()) return false;
  if (!org) return false;
  return org.slug === 'demo' && org.isDemo === true;
}

/**
 * Constant per identificar dades creades pel seed demo
 * Usada per purgar només dades demo sense tocar dades reals
 */
export const DEMO_DATA_MARKER = 'isDemoData';

/**
 * Prefix per IDs de documents demo
 * Facilita identificar documents creats pel seed
 */
export const DEMO_ID_PREFIX = 'demo_';

/**
 * Helper per bypass de permisos UI en mode DEMO
 *
 * A DEMO no hi ha fricció per rols/permisos a nivell UI.
 * Això NO canvia les regles de Firestore (ACL backend intacte).
 *
 * Ús:
 *   const canEdit = demoBypassPermission(hasEditPermission);
 *   // En DEMO: sempre true
 *   // En PROD: retorna el valor original
 */
export function demoBypassPermission(originalPermission: boolean): boolean {
  if (isDemoEnv()) return true;
  return originalPermission;
}

/**
 * Helper per comprovar si una acció hauria d'estar permesa en demo
 * Combina isDemoEnv amb una condició existent
 *
 * Ús:
 *   const canDoAction = allowInDemo(userRole === 'admin');
 */
export function allowInDemo(prodCondition: boolean): boolean {
  return isDemoEnv() || prodCondition;
}
