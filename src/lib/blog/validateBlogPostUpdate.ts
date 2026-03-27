import type { BlogPostTranslation } from '@/lib/blog/types'

type BlogPostTranslationUpdateInput = Partial<BlogPostTranslation>

export type BlogPostUpdatePatch = {
  title?: string
  seoTitle?: string
  metaDescription?: string
  excerpt?: string
  contentHtml?: string
  tags?: string[]
  category?: string
  coverImageUrl?: string | null
  coverImageAlt?: string | null
  baseLocale?: 'ca'
  publishedAt?: string
  translations?: {
    es?: BlogPostTranslationUpdateInput
  }
}

export type BlogPostUpdateValidationResult =
  | {
      ok: true
      value: {
        slug: string
        patch: BlogPostUpdatePatch
      }
    }
  | {
      ok: false
      errors: string[]
    }

const URL_SAFE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/

const ALLOWED_TOP_LEVEL_KEYS = new Set([
  'slug',
  'title',
  'seoTitle',
  'metaDescription',
  'excerpt',
  'contentHtml',
  'tags',
  'category',
  'coverImageUrl',
  'coverImageAlt',
  'baseLocale',
  'publishedAt',
  'translations',
])

const ALLOWED_TRANSLATION_KEYS = new Set([
  'title',
  'seoTitle',
  'metaDescription',
  'excerpt',
  'contentHtml',
  'coverImageAlt',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeRequiredString(value: unknown, field: string, errors: string[]): string {
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`)
    return ''
  }

  const normalized = value.trim()
  if (!normalized) {
    errors.push(`${field} is required`)
    return ''
  }

  return normalized
}

function normalizeOptionalUpdateString(
  value: unknown,
  field: string,
  errors: string[]
): string | undefined {
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`)
    return undefined
  }

  const normalized = value.trim()
  if (!normalized) {
    errors.push(`${field} is required`)
    return undefined
  }

  return normalized
}

function normalizeOptionalCoverImageUrl(
  value: unknown,
  errors: string[]
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null

  if (typeof value !== 'string') {
    errors.push('coverImageUrl must be a string, null or undefined')
    return undefined
  }

  const normalized = value.trim()
  if (!normalized) return null

  try {
    const url = new URL(normalized)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      errors.push('coverImageUrl must use http or https')
      return undefined
    }
    return normalized
  } catch {
    errors.push('coverImageUrl must be a valid absolute URL')
    return undefined
  }
}

function normalizeOptionalCoverImageAlt(
  value: unknown,
  errors: string[],
  field = 'coverImageAlt'
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null

  if (typeof value !== 'string') {
    errors.push(`${field} must be a string, null or undefined`)
    return undefined
  }

  const normalized = value.trim()
  if (!normalized) return null

  return normalized
}

function normalizeOptionalTags(value: unknown, errors: string[]): string[] | undefined {
  if (value === undefined) return undefined
  if (!Array.isArray(value)) {
    errors.push('tags must be an array')
    return undefined
  }

  const normalizedTags: string[] = []
  value.forEach((tag, index) => {
    if (typeof tag !== 'string') {
      errors.push(`tags[${index}] must be a string`)
      return
    }

    const normalized = tag.trim()
    if (!normalized) {
      errors.push(`tags[${index}] must not be empty`)
      return
    }

    normalizedTags.push(normalized)
  })

  return normalizedTags
}

function normalizeOptionalBaseLocale(
  value: unknown,
  errors: string[]
): 'ca' | undefined {
  if (value === undefined) return undefined
  if (value !== 'ca') {
    errors.push('baseLocale must be "ca"')
    return undefined
  }

  return 'ca'
}

function normalizeOptionalIsoDate(
  value: unknown,
  field: string,
  errors: string[]
): string | undefined {
  if (value === undefined) return undefined
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`)
    return undefined
  }

  const normalized = value.trim()
  if (!normalized) {
    errors.push(`${field} is required`)
    return undefined
  }

  if (!ISO_DATE_PATTERN.test(normalized)) {
    errors.push(`${field} must be a valid ISO datetime`)
    return undefined
  }

  const parsed = new Date(normalized)
  if (!Number.isFinite(parsed.getTime())) {
    errors.push(`${field} must be a valid ISO datetime`)
    return undefined
  }

  return parsed.toISOString()
}

function normalizePartialEsTranslation(
  value: unknown,
  errors: string[]
): BlogPostTranslationUpdateInput | undefined {
  if (value === undefined) return undefined

  if (!isRecord(value)) {
    errors.push('translations.es must be an object')
    return undefined
  }

  const unsupportedKeys = Object.keys(value).filter((key) => !ALLOWED_TRANSLATION_KEYS.has(key))
  if (unsupportedKeys.length > 0) {
    errors.push(`translations.es contains unsupported fields: ${unsupportedKeys.join(', ')}`)
  }

  const patch: BlogPostTranslationUpdateInput = {}

  if ('title' in value) {
    const normalized = normalizeOptionalUpdateString(value.title, 'translations.es.title', errors)
    if (normalized !== undefined) patch.title = normalized
  }
  if ('seoTitle' in value) {
    const normalized = normalizeOptionalUpdateString(
      value.seoTitle,
      'translations.es.seoTitle',
      errors
    )
    if (normalized !== undefined) patch.seoTitle = normalized
  }
  if ('metaDescription' in value) {
    const normalized = normalizeOptionalUpdateString(
      value.metaDescription,
      'translations.es.metaDescription',
      errors
    )
    if (normalized !== undefined) patch.metaDescription = normalized
  }
  if ('excerpt' in value) {
    const normalized = normalizeOptionalUpdateString(
      value.excerpt,
      'translations.es.excerpt',
      errors
    )
    if (normalized !== undefined) patch.excerpt = normalized
  }
  if ('contentHtml' in value) {
    const normalized = normalizeOptionalUpdateString(
      value.contentHtml,
      'translations.es.contentHtml',
      errors
    )
    if (normalized !== undefined) patch.contentHtml = normalized
  }
  if ('coverImageAlt' in value) {
    const normalized = normalizeOptionalCoverImageAlt(
      value.coverImageAlt,
      errors,
      'translations.es.coverImageAlt'
    )
    if (normalized !== undefined || value.coverImageAlt === null) {
      patch.coverImageAlt = normalized ?? null
    }
  }

  return Object.keys(patch).length > 0 ? patch : undefined
}

function normalizeOptionalTranslations(
  value: unknown,
  errors: string[]
): BlogPostUpdatePatch['translations'] | undefined {
  if (value === undefined) return undefined

  if (!isRecord(value)) {
    errors.push('translations must be an object')
    return undefined
  }

  const unsupportedKeys = Object.keys(value).filter((key) => key !== 'es')
  if (unsupportedKeys.length > 0) {
    errors.push('translations only supports: es')
  }

  const es = normalizePartialEsTranslation(value.es, errors)
  if (!es) return undefined

  return { es }
}

export function validateBlogPostUpdate(payload: unknown): BlogPostUpdateValidationResult {
  if (!isRecord(payload)) {
    return { ok: false, errors: ['payload must be an object'] }
  }

  const errors: string[] = []
  const unsupportedKeys = Object.keys(payload).filter((key) => !ALLOWED_TOP_LEVEL_KEYS.has(key))
  if (unsupportedKeys.length > 0) {
    errors.push(`unsupported fields: ${unsupportedKeys.join(', ')}`)
  }

  if ('orgId' in payload) {
    errors.push('orgId is not accepted')
  }
  if ('id' in payload) {
    errors.push('id is generated server-side')
  }
  if ('createdAt' in payload) {
    errors.push('createdAt is generated server-side')
  }
  if ('updatedAt' in payload) {
    errors.push('updatedAt is generated server-side')
  }

  const slug = normalizeRequiredString(payload.slug, 'slug', errors)
  if (slug && !URL_SAFE_SLUG_PATTERN.test(slug)) {
    errors.push('slug must be URL-safe')
  }

  const patch: BlogPostUpdatePatch = {}

  if ('title' in payload) {
    const normalized = normalizeOptionalUpdateString(payload.title, 'title', errors)
    if (normalized !== undefined) patch.title = normalized
  }
  if ('seoTitle' in payload) {
    const normalized = normalizeOptionalUpdateString(payload.seoTitle, 'seoTitle', errors)
    if (normalized !== undefined) patch.seoTitle = normalized
  }
  if ('metaDescription' in payload) {
    const normalized = normalizeOptionalUpdateString(
      payload.metaDescription,
      'metaDescription',
      errors
    )
    if (normalized !== undefined) patch.metaDescription = normalized
  }
  if ('excerpt' in payload) {
    const normalized = normalizeOptionalUpdateString(payload.excerpt, 'excerpt', errors)
    if (normalized !== undefined) patch.excerpt = normalized
  }
  if ('contentHtml' in payload) {
    const normalized = normalizeOptionalUpdateString(payload.contentHtml, 'contentHtml', errors)
    if (normalized !== undefined) patch.contentHtml = normalized
  }
  if ('tags' in payload) {
    const normalized = normalizeOptionalTags(payload.tags, errors)
    if (normalized !== undefined) patch.tags = normalized
  }
  if ('category' in payload) {
    const normalized = normalizeOptionalUpdateString(payload.category, 'category', errors)
    if (normalized !== undefined) patch.category = normalized
  }
  if ('coverImageUrl' in payload) {
    const normalized = normalizeOptionalCoverImageUrl(payload.coverImageUrl, errors)
    if (normalized !== undefined || payload.coverImageUrl === null) {
      patch.coverImageUrl = normalized ?? null
    }
  }
  if ('coverImageAlt' in payload) {
    const normalized = normalizeOptionalCoverImageAlt(payload.coverImageAlt, errors)
    if (normalized !== undefined || payload.coverImageAlt === null) {
      patch.coverImageAlt = normalized ?? null
    }
  }
  if ('baseLocale' in payload) {
    const normalized = normalizeOptionalBaseLocale(payload.baseLocale, errors)
    if (normalized !== undefined) patch.baseLocale = normalized
  }
  if ('publishedAt' in payload) {
    const normalized = normalizeOptionalIsoDate(payload.publishedAt, 'publishedAt', errors)
    if (normalized !== undefined) patch.publishedAt = normalized
  }
  if ('translations' in payload) {
    const normalized = normalizeOptionalTranslations(payload.translations, errors)
    if (normalized !== undefined) patch.translations = normalized
  }

  if (errors.length > 0) {
    return { ok: false, errors }
  }

  const hasChanges = Object.keys(patch).length > 0
  if (!hasChanges) {
    return { ok: false, errors: ['at least one field to update is required'] }
  }

  return {
    ok: true,
    value: {
      slug,
      patch,
    },
  }
}
