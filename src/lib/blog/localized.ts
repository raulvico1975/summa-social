import type { PublicLocale } from '@/lib/public-locale'
import type {
  BlogContentLocale,
  BlogPost,
  BlogPostTranslation,
} from '@/lib/blog/types'

export interface LocalizedBlogPost extends Omit<BlogPost, 'translations'> {
  resolvedLocale: BlogContentLocale
  requestedLocale: PublicLocale
  availableLocales: BlogContentLocale[]
  isFallback: boolean
}

function getTranslation(
  post: BlogPost,
  locale: BlogContentLocale
): BlogPostTranslation | null {
  if (locale !== 'es') return null
  return post.translations?.es ?? null
}

export function getEffectiveBlogLocale(
  locale?: string | null
): BlogContentLocale {
  return locale === 'ca' ? 'ca' : 'es'
}

export function getBaseBlogLocale(
  locale?: string | null
): BlogContentLocale {
  return locale === 'es' ? 'es' : 'ca'
}

export function resolveLocalizedBlogPost(
  post: BlogPost,
  locale: PublicLocale = 'ca'
): LocalizedBlogPost {
  const baseLocale = getBaseBlogLocale(post.baseLocale)
  const effectiveLocale = getEffectiveBlogLocale(locale)
  const translation = getTranslation(post, effectiveLocale)
  const useTranslation = effectiveLocale !== baseLocale && Boolean(translation)
  const resolvedLocale = useTranslation ? effectiveLocale : baseLocale
  const availableLocales: BlogContentLocale[] =
    baseLocale === 'es'
      ? ['es']
      : post.translations?.es
        ? ['ca', 'es']
        : ['ca']

  return {
    ...post,
    baseLocale,
    title: translation?.title ?? post.title,
    seoTitle: translation?.seoTitle ?? post.seoTitle,
    metaDescription: translation?.metaDescription ?? post.metaDescription,
    excerpt: translation?.excerpt ?? post.excerpt,
    contentHtml: translation?.contentHtml ?? post.contentHtml,
    coverImageAlt: translation?.coverImageAlt ?? post.coverImageAlt ?? null,
    resolvedLocale,
    requestedLocale: locale,
    availableLocales,
    isFallback: locale !== resolvedLocale,
  }
}

export function resolveLocalizedBlogPosts(
  posts: BlogPost[],
  locale: PublicLocale = 'ca'
): LocalizedBlogPost[] {
  return posts.map((post) => resolveLocalizedBlogPost(post, locale))
}
