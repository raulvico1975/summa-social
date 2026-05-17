import type { MetadataRoute } from 'next';
import { PUBLIC_LOCALES } from '@/lib/public-locale';
import { listBlogPosts } from '@/lib/blog/firestore';
import { listPublicProductUpdates } from '@/lib/product-updates/public';
import { getPublicLandingSitemapEntries } from '@/lib/public-landings';

const BASE_URL = 'https://summasocial.app';
const PUBLIC_BASE_PATHS = ['', '/funcionalitats', '/qui-som', '/contact', '/privacy', '/novetats', '/blog'] as const;

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = PUBLIC_LOCALES.flatMap((locale) =>
    PUBLIC_BASE_PATHS.map((path) => ({
      url: `${BASE_URL}/${locale}${path}`,
      lastModified: now,
      changeFrequency: path === '' ? 'weekly' : path === '/novetats' ? 'daily' : 'monthly',
      priority: path === '' ? 1 : path === '/novetats' ? 0.8 : 0.7,
    }))
  );

  const legacyBlogEntry: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
  ];

  const landingEntries: MetadataRoute.Sitemap = getPublicLandingSitemapEntries().map((entry) => ({
    url: `${BASE_URL}/${entry.locale}/${entry.slug}`,
    lastModified: now,
    changeFrequency: 'monthly',
    priority: entry.locale === 'ca' ? 0.82 : 0.74,
  }));

  let updates: Awaited<ReturnType<typeof listPublicProductUpdates>> = [];
  let blogPosts: Awaited<ReturnType<typeof listBlogPosts>> = [];

  try {
    updates = await listPublicProductUpdates();
  } catch (error) {
    console.warn('[sitemap] product updates unavailable:', error);
  }

  try {
    blogPosts = await listBlogPosts();
  } catch (error) {
    console.warn('[sitemap] blog posts unavailable:', error);
  }

  const updateEntries: MetadataRoute.Sitemap = PUBLIC_LOCALES.flatMap((locale) =>
    updates.map((update) => ({
      url: `${BASE_URL}/${locale}/novetats/${update.slug}`,
      lastModified: update.publishedAt ? new Date(update.publishedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.6,
    }))
  );

  const localizedBlogEntries: MetadataRoute.Sitemap = PUBLIC_LOCALES.flatMap((locale) =>
    blogPosts.map((post) => ({
      url: `${BASE_URL}/${locale}/blog/${post.slug}`,
      lastModified: post.updatedAt ? new Date(post.updatedAt) : post.publishedAt ? new Date(post.publishedAt) : now,
      changeFrequency: 'monthly',
      priority: 0.65,
    }))
  );

  return [...staticEntries, ...landingEntries, ...legacyBlogEntry, ...updateEntries, ...localizedBlogEntries];
}
