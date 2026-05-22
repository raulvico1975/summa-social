import type { BlogPostPublishInput } from '@/lib/blog/validateBlogPost'

type Locale = 'ca' | 'es'

const CATALAN_MARKERS = [
  /\bil·lustraci[oó]\b/i,
  /\bdevolucions?\b/i,
  /\brebuts?\b/i,
  /\bdespesa\b/i,
  /\btancament\b/i,
  /\bsocis?\b/i,
  /\bentitats?\b/i,
  /\bassociacions?\b/i,
  /\bllegir ara\b/i,
  /\bque ha passat\b/i,
  /\bben feta\b/i,
  /\bultima hora\b/i,
  /\bgesti[oó]\s+econ[oò]mica\b/i,
  /\bquotes?\s+de\s+socis?\b/i,
]

const SPANISH_MARKERS = [
  /\bilustraci[oó]n\b/i,
  /\bdevoluciones?\b/i,
  /\brecibos?\b/i,
  /\bgasto\b/i,
  /\bcierre\b/i,
  /\bsocios?\b/i,
  /\bentidades?\b/i,
  /\basociaciones?\b/i,
  /\bleer ahora\b/i,
  /\bqu[eé] ha pasado\b/i,
  /\bgesti[oó]n\s+econ[oó]mica\b/i,
  /\bcuotas?\s+de\s+socios?\b/i,
]

function normalizeForLocaleCheck(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function hasWrongLocaleMarkers(value: string, expectedLocale: Locale): boolean {
  const normalized = normalizeForLocaleCheck(value)
  if (!normalized) return false

  const markers = expectedLocale === 'es' ? CATALAN_MARKERS : SPANISH_MARKERS
  return markers.some((marker) => marker.test(normalized))
}

function assertLocale(
  value: string | null | undefined,
  field: string,
  expectedLocale: Locale,
  errors: string[]
) {
  if (!value) return
  if (hasWrongLocaleMarkers(value, expectedLocale)) {
    errors.push(`${field} appears to be in the wrong locale`)
  }
}

export function validateBlogPostEditorialQuality(post: BlogPostPublishInput): string[] {
  const errors: string[] = []
  const baseLocale = post.baseLocale ?? 'ca'

  assertLocale(post.title, 'title', baseLocale, errors)
  assertLocale(post.seoTitle, 'seoTitle', baseLocale, errors)
  assertLocale(post.metaDescription, 'metaDescription', baseLocale, errors)
  assertLocale(post.excerpt, 'excerpt', baseLocale, errors)
  assertLocale(post.coverImageAlt, 'coverImageAlt', baseLocale, errors)

  const es = post.translations?.es
  if (!es) {
    return errors
  }

  assertLocale(es.title, 'translations.es.title', 'es', errors)
  assertLocale(es.seoTitle, 'translations.es.seoTitle', 'es', errors)
  assertLocale(es.metaDescription, 'translations.es.metaDescription', 'es', errors)
  assertLocale(es.excerpt, 'translations.es.excerpt', 'es', errors)
  assertLocale(es.coverImageAlt, 'translations.es.coverImageAlt', 'es', errors)

  if (post.coverImageUrl && !es.coverImageAlt?.trim()) {
    errors.push('translations.es.coverImageAlt is required when coverImageUrl is present')
  }

  return errors
}
