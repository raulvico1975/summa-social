// src/lib/public-locale.ts
// Utilitat per detectar l'idioma del navegador per al web públic

export type PublicLocale = 'ca' | 'es';

/**
 * Detecta l'idioma preferit del navegador a partir de l'header Accept-Language.
 * Retorna 'ca' (català) com a fallback per defecte.
 */
export function detectPublicLocale(acceptLanguage?: string | null): PublicLocale {
  const al = (acceptLanguage || '').toLowerCase();
  if (al.includes('ca')) return 'ca';
  if (al.includes('es')) return 'es';
  return 'ca';
}
