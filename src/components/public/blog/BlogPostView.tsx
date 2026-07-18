import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { PUBLIC_SHELL_X } from '@/components/public/public-shell'
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter'
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader'
import { Button } from '@/components/ui/button'
import { getBlogCopy } from '@/lib/blog/copy'
import { formatBlogDate, getLocalizedBlogPostBySlug } from '@/lib/blog/firestore'
import {
  estimateBlogReadingTimeMinutes,
  formatBlogReadingTime,
} from '@/lib/blog/reading-time'
import type { LocalizedBlogPost } from '@/lib/blog/localized'
import type { PublicLocale } from '@/lib/public-locale'
import { PublicJsonLd, buildPublicBlogPostingJsonLd } from '@/lib/public-seo'
import { getPublicTranslations } from '@/i18n/public'

const pageShellClass =
  'min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#ffffff_34%,#f8fbff_100%)]'

function isBlogConfigured() {
  return Boolean(process.env.BLOG_ORG_ID?.trim())
}

function buildArticleMeta(
  publishedAt: string,
  readingTime: string,
  locale: PublicLocale
) {
  return [formatBlogDate(publishedAt, locale), readingTime].join(' · ')
}

interface BlogPostViewProps {
  locale: PublicLocale
  slug: string
  blogBasePath: string
}

interface BlogPostArticleViewProps {
  locale: PublicLocale
  blogBasePath: string
  post: LocalizedBlogPost
}

export function BlogPostArticleView({
  locale,
  blogBasePath,
  post,
}: BlogPostArticleViewProps) {
  const copy = getBlogCopy(locale)
  const t = getPublicTranslations(locale)
  const featuresHref = `/${locale}#capabilities`
  const readingTime = formatBlogReadingTime(
    estimateBlogReadingTimeMinutes(post.contentHtml),
    locale
  )
  const articleMeta = buildArticleMeta(
    post.publishedAt,
    readingTime,
    locale
  )

  return (
    <>
      <PublicJsonLd
        data={buildPublicBlogPostingJsonLd({
          locale: post.resolvedLocale,
          slug: post.slug,
          title: post.title,
          description: post.metaDescription || post.excerpt,
          publishedAt: post.publishedAt,
          updatedAt: post.updatedAt,
          imageUrl: post.coverImageUrl,
        })}
      />
      <main className={pageShellClass}>
        <PublicSiteHeader locale={locale} currentSection="blog" />

        <section className={`pb-8 pt-9 lg:pt-12 ${PUBLIC_SHELL_X}`}>
        <div className="mx-auto max-w-[46rem]">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="rounded-full px-4 text-muted-foreground hover:text-foreground"
          >
            <Link href={blogBasePath}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {copy.browseBlog}
            </Link>
          </Button>

          <div className="mt-8 space-y-5">
            <p className="text-sm font-medium text-foreground/50">
              {articleMeta}
            </p>
            <h1 className="max-w-[15ch] text-[2.1rem] font-semibold leading-[1.08] tracking-[-0.035em] text-foreground sm:text-[2.75rem] lg:text-[3.15rem]">
              {post.title}
            </h1>
            <p className="max-w-2xl text-[1.06rem] leading-[1.68] text-foreground/68 sm:text-[1.1rem]">
              {post.excerpt}
            </p>
          </div>
        </div>

        <figure className="mx-auto mt-8 max-w-5xl">
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-100 shadow-[0_24px_80px_-58px_rgba(15,23,42,0.28)]">
            {post.coverImageUrl ? (
              <div className="relative aspect-[16/9]">
                <Image
                  src={post.coverImageUrl}
                  alt={post.coverImageAlt || post.title}
                  fill
                  unoptimized
                  sizes="(min-width: 1024px) 960px, 100vw"
                  className="object-cover"
                  priority
                />
              </div>
            ) : (
              <div className="relative aspect-[16/9] bg-[linear-gradient(135deg,#f8fafc,#eaf6fd)]">
                <div className="absolute inset-x-8 bottom-8 space-y-3 sm:inset-x-12 sm:bottom-12">
                  <div className="h-3 rounded-full bg-slate-300/60" />
                  <div className="h-3 w-3/4 rounded-full bg-slate-300/50" />
                  <div className="h-3 w-1/2 rounded-full bg-slate-300/40" />
                </div>
              </div>
            )}
          </div>
        </figure>
        </section>

        <section className={`pb-14 pt-2 ${PUBLIC_SHELL_X}`}>
          <article className="mx-auto max-w-[46rem] border-t border-slate-200/70 px-1 pt-8 sm:pt-10">
            <div
              className="blog-rich-text"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />
          </article>
        </section>

        <section className={`pb-20 ${PUBLIC_SHELL_X}`}>
          <div className="mx-auto flex max-w-[46rem] flex-wrap items-center justify-between gap-4 border-t border-slate-200/70 pt-5">
            <Button asChild variant="outline" className="rounded-full">
              <Link href={blogBasePath}>{copy.browseBlog}</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link href={featuresHref}>
                {t.common.features}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <PublicSiteFooter locale={locale} />
      </main>
    </>
  )
}

export async function BlogPostView({
  locale,
  slug,
  blogBasePath,
}: BlogPostViewProps) {
  if (!isBlogConfigured()) {
    notFound()
  }

  const post = await getLocalizedBlogPostBySlug(slug, locale)

  if (!post) {
    notFound()
  }

  return <BlogPostArticleView locale={locale} blogBasePath={blogBasePath} post={post} />
}
