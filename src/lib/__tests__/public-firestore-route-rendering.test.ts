import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const FIRESTORE_BACKED_PUBLIC_ROUTES = [
  'src/app/public/[lang]/blog/page.tsx',
  'src/app/public/[lang]/blog/[slug]/page.tsx',
  'src/app/sitemap.ts',
] as const;

const LEGACY_BLOG_REDIRECT_ROUTES = [
  'src/app/blog/page.tsx',
  'src/app/blog/[slug]/page.tsx',
] as const;

test('Firestore-backed public routes do not fetch remote content during builds', () => {
  for (const routePath of FIRESTORE_BACKED_PUBLIC_ROUTES) {
    const source = readFileSync(join(process.cwd(), routePath), 'utf8');

    assert.match(
      source,
      /export const dynamic = ['"]force-dynamic['"]/,
      `${routePath} must render at request time`,
    );
    assert.doesNotMatch(
      source,
      /export const revalidate\s*=/,
      `${routePath} must not advertise static regeneration`,
    );
  }
});

test('legacy blog routes redirect without loading Firestore-backed content', () => {
  for (const routePath of LEGACY_BLOG_REDIRECT_ROUTES) {
    const source = readFileSync(join(process.cwd(), routePath), 'utf8');

    assert.match(source, /permanentRedirect\(/, `${routePath} must keep a permanent redirect`);
    assert.doesNotMatch(
      source,
      /getPublishedBlogPost|getPublishedBlogPosts/,
      `${routePath} must not load blog content before redirecting`,
    );
  }
});
