import type { Metadata } from 'next'
import { BlogIndexView } from '@/components/public/blog/BlogIndexView'
import { getBlogCopy } from '@/lib/blog/copy'

// This legacy entry point uses the same Firestore-backed view as the localized
// blog, so it must not fetch remote content while Next.js is building the app.
export const dynamic = 'force-dynamic'

const locale = 'ca' as const

function isBlogConfigured() {
  return Boolean(process.env.BLOG_ORG_ID?.trim())
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = getBlogCopy(locale)

  if (!isBlogConfigured()) {
    return {
      title: copy.metaTitle,
      description: copy.metaDescription,
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  return {
    title: copy.metaTitle,
    description: copy.metaDescription,
  }
}

export default async function BlogPage() {
  return <BlogIndexView locale={locale} blogBasePath="/blog" />
}
