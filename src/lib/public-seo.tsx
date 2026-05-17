import type { PublicLocale } from '@/lib/public-locale';

export const PUBLIC_SITE_URL = 'https://summasocial.app';
export const PUBLIC_CONTACT_EMAIL = 'hola@summasocial.app';

type JsonLdValue = Record<string, unknown> | Record<string, unknown>[];

export function PublicJsonLd({ data }: { data: JsonLdValue }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

export function buildPublicSiteJsonLd(locale: PublicLocale) {
  const organizationId = `${PUBLIC_SITE_URL}/#organization`;
  const websiteId = `${PUBLIC_SITE_URL}/${locale}#website`;
  const softwareId = `${PUBLIC_SITE_URL}/${locale}#software`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: 'Summa Social',
      url: PUBLIC_SITE_URL,
      email: PUBLIC_CONTACT_EMAIL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: PUBLIC_CONTACT_EMAIL,
        availableLanguage: ['ca', 'es'],
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': websiteId,
      name: 'Summa Social',
      url: `${PUBLIC_SITE_URL}/${locale}`,
      inLanguage: locale,
      publisher: {
        '@id': organizationId,
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      '@id': softwareId,
      name: 'Summa Social',
      url: `${PUBLIC_SITE_URL}/${locale}`,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      inLanguage: locale,
      publisher: {
        '@id': organizationId,
      },
      audience: {
        '@type': 'Audience',
        audienceType: locale === 'ca' ? 'Entitats socials, associacions i ONG' : 'Entidades sociales, asociaciones y ONG',
      },
    },
  ];
}

export function buildPublicBreadcrumbJsonLd({
  locale,
  path,
  currentName,
}: {
  locale: PublicLocale;
  path: string;
  currentName: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Summa Social',
        item: `${PUBLIC_SITE_URL}/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: currentName,
        item: `${PUBLIC_SITE_URL}/${locale}${path}`,
      },
    ],
  };
}
