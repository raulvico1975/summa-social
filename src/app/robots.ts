import type { MetadataRoute } from 'next';
import { PUBLIC_SITE_URL } from '@/lib/public-seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/quick',
          '/redirect-to-org',
          '/*/dashboard/',
          '/*/login',
        ],
      },
    ],
    sitemap: `${PUBLIC_SITE_URL}/sitemap.xml`,
    host: PUBLIC_SITE_URL,
  };
}
