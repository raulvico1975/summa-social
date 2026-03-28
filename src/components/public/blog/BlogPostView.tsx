import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowRight, Clock3 } from 'lucide-react'
import { PublicSiteFooter } from '@/components/public/PublicSiteFooter'
import { PublicSiteHeader } from '@/components/public/PublicSiteHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { getBlogCopy } from '@/lib/blog/copy'
import { formatBlogDate, getLocalizedBlogPostBySlug } from '@/lib/blog/firestore'
import { getBlogCategoryLabel } from '@/lib/blog/presentation'
import type { PublicLocale } from '@/lib/public-locale'
import { getPublicFeaturesHref } from '@/lib/public-site-paths'
import { getPublicTranslations } from '@/i18n/public'

const pageShellClass =
  'min-h-screen bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_32%),linear-gradient(180deg,#f8fbff_0%,#ffffff_26%,#ffffff_100%)]'

function estimateReadingTimeMinutes(contentHtml: string): number {
  const plainText = contentHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const wordCount = plainText ? plainText.split(' ').length : 0

  return Math.max(3, Math.round(wordCount / 180))
}

function formatReadingTime(minutes: number, locale: PublicLocale): string {
  switch (locale) {
    case 'es':
      return `${minutes} min de lectura`
    case 'fr':
      return `${minutes} min de lecture`
    case 'pt':
      return `${minutes} min de leitura`
    case 'ca':
    default:
      return `${minutes} min de lectura`
  }
}

function isBlogConfigured() {
  return Boolean(process.env.BLOG_ORG_ID?.trim())
}

interface BlogPostViewProps {
  locale: PublicLocale
  slug: string
  blogBasePath: string
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

  const copy = getBlogCopy(locale)
  const t = getPublicTranslations(locale)
  const categoryLabel = getBlogCategoryLabel(post.category, locale)
  const featuresHref = getPublicFeaturesHref(locale)
  const readingTime = formatReadingTime(
    estimateReadingTimeMinutes(post.contentHtml),
    locale
  )

  return (
    <main className={pageShellClass}>
      <PublicSiteHeader locale={locale} currentSection="blog" />

      <section className="px-6 pb-12 pt-8 lg:pt-12">
        <div className="mx-auto max-w-6xl">
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

          <div className="relative mt-6 overflow-hidden rounded-[2.5rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.82),rgba(236,247,255,0.94)_58%,rgba(255,255,255,0.96))] shadow-[0_44px_120px_-70px_rgba(15,23,42,0.42)]">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.08),transparent_24%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-200 to-transparent" />

            <div className="relative grid gap-8 px-6 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.82fr)] lg:items-center lg:px-10 lg:py-10">
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="border-sky-200/80 bg-white/92 text-primary shadow-[0_12px_24px_-22px_rgba(14,165,233,0.55)]"
                  >
                    {categoryLabel}
                  </Badge>
                  <span className="inline-flex items-center rounded-full border border-border/60 bg-white/72 px-3 py-1.5">
                    <time dateTime={post.publishedAt}>
                      {formatBlogDate(post.publishedAt, locale)}
                    </time>
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/72 px-3 py-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    {readingTime}
                  </span>
                </div>

                <div className="space-y-4">
                  <p className="text-[0.76rem] font-semibold uppercase tracking-[0.24em] text-primary/80">
                    {copy.editorialLabel}
                  </p>
                  <h1 className="max-w-4xl text-4xl font-semibold leading-[0.95] tracking-[-0.04em] text-foreground sm:text-5xl lg:text-[4.2rem]">
                    {post.title}
                  </h1>
                  <p className="max-w-2xl text-[1.08rem] leading-8 text-foreground/72 sm:text-[1.16rem]">
                    {post.excerpt}
                  </p>
                </div>
              </div>

              {post.coverImageUrl ? (
                <div className="relative overflow-hidden rounded-[2rem] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,250,255,0.88))] p-3 shadow-[0_34px_90px_-62px_rgba(15,23,42,0.45)] sm:p-5">
                  <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.1),transparent_40%)]" />
                  <div className="relative flex min-h-[190px] items-center justify-center rounded-[1.5rem] border border-sky-100/80 bg-white/92 px-3 py-4 sm:min-h-[280px] sm:px-6 sm:py-8">
                    <img
                      src={post.coverImageUrl}
                      alt={post.coverImageAlt || post.title}
                      className="block h-auto max-h-[220px] w-full object-contain object-center sm:max-h-[360px] lg:max-h-[400px]"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-14">
        <article className="mx-auto max-w-[54rem] rounded-[2.3rem] border border-white/70 bg-white/96 px-6 py-8 shadow-[0_36px_110px_-72px_rgba(15,23,42,0.32)] sm:px-10 sm:py-12 lg:px-14">
          <div className="mb-8 flex items-center gap-4 sm:mb-10">
            <span className="h-px flex-1 bg-border/70" />
            <span className="text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {categoryLabel}
            </span>
            <span className="h-px flex-1 bg-border/70" />
          </div>
          <div
            className="blog-rich-text"
            dangerouslySetInnerHTML={{ __html: post.contentHtml }}
          />
        </article>
      </section>

      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl rounded-[2.1rem] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(240,248,255,0.85))] p-6 shadow-[0_32px_100px_-70px_rgba(15,23,42,0.26)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary/82">
            {copy.continueTitle}
          </p>
          <p className="mt-3 max-w-2xl text-base leading-7 text-foreground/70">
            {copy.continueDescription}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="outline">
              <Link href={blogBasePath}>{copy.browseBlog}</Link>
            </Button>
            <Button asChild>
              <Link href={featuresHref}>
                {t.common.features}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <PublicSiteFooter locale={locale} />
    </main>
  )
}
