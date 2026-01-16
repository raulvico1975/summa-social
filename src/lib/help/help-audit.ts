/**
 * Help Audit utilities
 *
 * Helpers per verificar l'estat de publicació de les ajudes
 * per a cada routeKey i idioma.
 */

export const REQUIRED_HELP_LOCALES = ['ca', 'es', 'fr', 'pt'] as const;
export type HelpLocale = (typeof REQUIRED_HELP_LOCALES)[number];

/**
 * Construeix la clau i18n del títol d'ajuda per un routeKey
 * @param routeKey - Ex: 'movimientos_pendents'
 * @returns Ex: 'help.movimientos_pendents.title'
 */
export function buildHelpTitleKey(routeKey: string): string {
  return `help.${routeKey}.title`;
}

/**
 * Comprova si una ajuda està publicada per un idioma donat
 *
 * Una ajuda es considera publicada si:
 * - La clau retorna un valor diferent de la clau mateixa
 * - El valor no és buit
 *
 * @param tr - Funció de traducció (trFactory result)
 * @param routeKey - Ex: 'movimientos_pendents'
 * @returns true si l'ajuda està publicada
 */
export function isHelpPublished(
  tr: (key: string, fallback?: string) => string,
  routeKey: string
): boolean {
  const key = buildHelpTitleKey(routeKey);
  const value = tr(key);
  // Publicada si retorna un valor diferent de la clau i no és buit
  return Boolean(value && value !== key && value.trim() !== '');
}

/**
 * Tipus per al resultat d'auditoria d'una ajuda
 */
export type HelpAuditResult = {
  routeKey: string;
  locales: Record<HelpLocale, boolean>;
  isComplete: boolean; // true si tots els idiomes estan publicats
};

/**
 * Audita l'estat de publicació d'una ajuda per tots els idiomes
 *
 * @param routeKey - Ex: 'movimientos_pendents'
 * @param getTrForLocale - Funció que retorna el tr() per un idioma
 * @returns Resultat de l'auditoria
 */
export function auditHelpForRoute(
  routeKey: string,
  getTrForLocale: (locale: HelpLocale) => (key: string, fallback?: string) => string
): HelpAuditResult {
  const locales = {} as Record<HelpLocale, boolean>;

  for (const locale of REQUIRED_HELP_LOCALES) {
    const tr = getTrForLocale(locale);
    locales[locale] = isHelpPublished(tr, routeKey);
  }

  const isComplete = REQUIRED_HELP_LOCALES.every((locale) => locales[locale]);

  return {
    routeKey,
    locales,
    isComplete,
  };
}
