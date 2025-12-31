/**
 * Utilitats per gestionar idiomes a les rutes públiques.
 * Suporta ca/es/fr/pt amb detecció automàtica via Accept-Language.
 */

export type PublicLocale = 'ca' | 'es' | 'fr' | 'pt';

export const PUBLIC_LOCALES: PublicLocale[] = ['ca', 'es', 'fr', 'pt'];
export const DEFAULT_PUBLIC_LOCALE: PublicLocale = 'ca';

/**
 * Valida si un string és un PublicLocale vàlid
 */
export function isValidPublicLocale(lang: string): lang is PublicLocale {
  return PUBLIC_LOCALES.includes(lang as PublicLocale);
}

/**
 * Detecta l'idioma preferit de l'usuari a partir de l'Accept-Language header.
 * Retorna el primer idioma suportat o el default.
 *
 * Exemples Accept-Language:
 * - "ca,es;q=0.9,en;q=0.8" → 'ca'
 * - "pt-BR,pt;q=0.9,en;q=0.8" → 'pt'
 * - "fr-FR,fr;q=0.9" → 'fr'
 * - "en-US,en;q=0.9" → 'ca' (default)
 */
export function detectPublicLocale(acceptLanguage: string | null): PublicLocale {
  if (!acceptLanguage) return DEFAULT_PUBLIC_LOCALE;

  // Parse Accept-Language header
  // Format: "ca,es;q=0.9,en;q=0.8" or "pt-BR,pt;q=0.9"
  const languages = acceptLanguage
    .split(',')
    .map((part) => {
      const [lang, q] = part.trim().split(';q=');
      return {
        // Extreu codi de 2 lletres (ex: "pt-BR" → "pt", "ca" → "ca")
        lang: lang.split('-')[0].toLowerCase(),
        q: q ? parseFloat(q) : 1,
      };
    })
    .sort((a, b) => b.q - a.q);

  // Troba el primer idioma suportat
  for (const { lang } of languages) {
    if (isValidPublicLocale(lang)) {
      return lang;
    }
  }

  return DEFAULT_PUBLIC_LOCALE;
}

/**
 * Genera els metadades hreflang per SEO.
 * Retorna un objecte amb les URLs alternatives per cada idioma.
 */
export function generateAlternateLanguages(
  basePath: string,
  baseUrl: string = 'https://summasocial.app'
): Record<PublicLocale, string> {
  const result = {} as Record<PublicLocale, string>;
  for (const locale of PUBLIC_LOCALES) {
    result[locale] = `${baseUrl}/${locale}${basePath}`;
  }
  return result;
}

/**
 * Genera les metadades completes per una pàgina pública.
 * Inclou canonical i hreflang alternates (incloent x-default).
 */
export function generatePublicPageMetadata(
  locale: PublicLocale,
  basePath: string,
  baseUrl: string = 'https://summasocial.app'
) {
  const alternates = generateAlternateLanguages(basePath, baseUrl);
  const canonical = alternates[locale];

  return {
    alternates: {
      canonical,
      languages: {
        ...alternates,
        'x-default': alternates[DEFAULT_PUBLIC_LOCALE], // ca com a fallback
      },
    },
  };
}
