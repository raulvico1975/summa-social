/**
 * Utilitats per gestionar idiomes a les rutes públiques.
 * Suporta ca/es/fr/pt amb detecció automàtica via Accept-Language.
 */
import type { Metadata } from 'next';

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

const OPEN_GRAPH_LOCALES: Record<PublicLocale, string> = {
  ca: 'ca_ES',
  es: 'es_ES',
  fr: 'fr_FR',
  pt: 'pt_PT',
};

export interface PublicPageMetadataOptions {
  title?: string;
  description?: string;
  availableLocales?: PublicLocale[];
  canonicalLocale?: PublicLocale;
  index?: boolean;
  follow?: boolean;
  openGraphType?: 'website' | 'article';
}

/**
 * Genera les metadades hreflang per SEO.
 * Només anuncia idiomes que tenen una versió publicable equivalent.
 */
export function generateAlternateLanguages(
  basePath: string,
  baseUrl: string = 'https://summasocial.app',
  locales: PublicLocale[] = PUBLIC_LOCALES
): Partial<Record<PublicLocale, string>> {
  const result: Partial<Record<PublicLocale, string>> = {};
  for (const locale of locales) {
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
  options: PublicPageMetadataOptions = {},
  baseUrl: string = 'https://summasocial.app'
): Metadata {
  const availableLocales = options.availableLocales?.length
    ? [...new Set(options.availableLocales)]
    : PUBLIC_LOCALES;
  const canonicalLocale = options.canonicalLocale ?? locale;
  const alternates = generateAlternateLanguages(basePath, baseUrl, availableLocales);
  const canonical = `${baseUrl}/${canonicalLocale}${basePath}`;
  const fallbackLocale = availableLocales.includes(DEFAULT_PUBLIC_LOCALE)
    ? DEFAULT_PUBLIC_LOCALE
    : availableLocales[0] ?? canonicalLocale;
  const fallbackUrl = `${baseUrl}/${fallbackLocale}${basePath}`;
  const alternateLocales = availableLocales
    .filter((candidate) => candidate !== locale)
    .map((candidate) => OPEN_GRAPH_LOCALES[candidate]);

  return {
    alternates: {
      canonical,
      languages: {
        ...alternates,
        'x-default': fallbackUrl,
      },
    },
    ...(typeof options.index === 'boolean'
      ? {
          robots: {
            index: options.index,
            follow: options.follow ?? true,
          },
        }
      : {}),
    ...(options.title && options.description
      ? {
          openGraph: {
            title: options.title,
            description: options.description,
            url: canonical,
            siteName: 'Summa Social',
            locale: OPEN_GRAPH_LOCALES[locale],
            alternateLocale: alternateLocales,
            type: options.openGraphType ?? 'website',
          },
          twitter: {
            card: 'summary' as const,
            title: options.title,
            description: options.description,
          },
        }
      : {}),
  };
}
