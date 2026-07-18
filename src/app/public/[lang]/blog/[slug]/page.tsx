import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { BlogPostView } from '@/components/public/blog/BlogPostView'
import { getBlogCopy } from '@/lib/blog/copy'
import { getLocalizedBlogPostBySlug } from '@/lib/blog/firestore'
import {
  generatePublicPageMetadata,
  isValidPublicLocale,
  type PublicLocale,
} from '@/lib/public-locale'

// Blog content is runtime data. Keep the production build independent from
// Firestore availability and render the article on request.
export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ lang: string; slug: string }>
}

function isBlogConfigured() {
  return Boolean(process.env.BLOG_ORG_ID?.trim())
}

export function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isValidPublicLocale(lang)) return {}

  const locale = lang as PublicLocale
  const copy = getBlogCopy(locale)

  if (!isBlogConfigured()) {
    const seoMeta = generatePublicPageMetadata(locale, `/blog/${slug}`, {
      title: copy.metaTitle,
      description: copy.metaDescription,
      availableLocales: ['ca', 'es'],
      canonicalLocale: locale === 'ca' ? 'ca' : 'es',
      index: false,
      follow: false,
    })

    return {
      title: copy.metaTitle,
      description: copy.metaDescription,
      ...seoMeta,
    }
  }

  const post = await getLocalizedBlogPostBySlug(slug, locale)
  if (!post) return {}
  const isIndexable = !post.isFallback && post.availableLocales.some((candidate) => candidate === locale)
  const seoMeta = generatePublicPageMetadata(locale, `/blog/${slug}`, {
    title: post.seoTitle,
    description: post.metaDescription,
    availableLocales: post.availableLocales,
    canonicalLocale: post.resolvedLocale,
    index: isIndexable,
    openGraphType: 'article',
  })

  return {
    title: post.seoTitle,
    description: post.metaDescription,
    ...seoMeta,
  }
}

export default async function PublicBlogPostPage({ params }: PageProps) {
  const { lang, slug } = await params

  if (!isValidPublicLocale(lang)) {
    notFound()
  }

  const locale = lang as PublicLocale
  const post = await getLocalizedBlogPostBySlug(slug, locale)

  if (!post) {
    redirect(`/${locale}/blog`)
  }

  return (
    <BlogPostView
      locale={locale}
      slug={slug}
      blogBasePath={`/${locale}/blog`}
    />
  )
}
