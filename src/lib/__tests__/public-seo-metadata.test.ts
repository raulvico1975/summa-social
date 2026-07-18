import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { generatePublicPageMetadata } from '@/lib/public-locale';
import {
  getPublicLandingBySlug,
  getPublicLandingContent,
  getPublicLandingIndexedLocales,
  getPublicLandingMetadata,
} from '@/lib/public-landings';
import { generateMetadata as generateFloresCaseMetadata } from '@/app/public/[lang]/casos/flores-de-kiskeya/page';
import { generateMetadata as generateTrustMetadata } from '@/app/public/[lang]/confianza/page';

test('public metadata limits hreflang and canonical to publishable locales', () => {
  const metadata = generatePublicPageMetadata('fr', '/model-182', {
    title: 'Modele 182 | Summa Social',
    description: 'Contenu non publie.',
    availableLocales: ['ca', 'es'],
    index: false,
  });

  assert.equal(metadata.alternates?.canonical, 'https://summasocial.app/fr/model-182');
  assert.deepEqual(metadata.alternates?.languages, {
    ca: 'https://summasocial.app/ca/model-182',
    es: 'https://summasocial.app/es/model-182',
    'x-default': 'https://summasocial.app/ca/model-182',
  });
  assert.deepEqual(metadata.robots, { index: false, follow: true });
  assert.equal(metadata.openGraph?.locale, 'fr_FR');
});

for (const slug of ['software-gestion-ong', 'programa-associacions']) {
  test(`${slug} has complete and indexable Spanish content`, () => {
    const landing = getPublicLandingBySlug(slug);
    assert.ok(landing);

    const metadata = getPublicLandingMetadata(landing, 'es');
    const content = getPublicLandingContent(landing, 'es');

    assert.ok(getPublicLandingIndexedLocales(landing).includes('es'));
    assert.match(metadata.title, /gesti[oó]n/i);
    assert.doesNotMatch(metadata.description, /preparaci[oó]n/i);
    assert.doesNotMatch(content.hero.subtitle, /preparaci[oó]n/i);
    assert.ok(content.solution.steps.length >= 5);
    assert.ok(content.includes.items.length >= 4);
    assert.equal(content.finalCta.href, '/es/contact');
  });
}

test('Flores case and trust pages publish only Catalan and Spanish alternates', async () => {
  const floresMetadata = await generateFloresCaseMetadata({
    params: Promise.resolve({ lang: 'ca' }),
  });
  const trustMetadata = await generateTrustMetadata({
    params: Promise.resolve({ lang: 'es' }),
  });

  assert.equal(
    floresMetadata.alternates?.canonical,
    'https://summasocial.app/ca/casos/flores-de-kiskeya'
  );
  assert.deepEqual(floresMetadata.alternates?.languages, {
    ca: 'https://summasocial.app/ca/casos/flores-de-kiskeya',
    es: 'https://summasocial.app/es/casos/flores-de-kiskeya',
    'x-default': 'https://summasocial.app/ca/casos/flores-de-kiskeya',
  });
  assert.equal(trustMetadata.alternates?.canonical, 'https://summasocial.app/es/confianza');
  assert.deepEqual(trustMetadata.alternates?.languages, {
    ca: 'https://summasocial.app/ca/confianza',
    es: 'https://summasocial.app/es/confianza',
    'x-default': 'https://summasocial.app/ca/confianza',
  });
});

test('certificate and Model 182 copy avoids absolute error-free or automatic claims', () => {
  for (const slug of ['certificats-donacio', 'model-182']) {
    const landing = getPublicLandingBySlug(slug);
    assert.ok(landing);

    for (const locale of ['ca', 'es'] as const) {
      const metadata = getPublicLandingMetadata(landing, locale);
      const content = getPublicLandingContent(landing, locale);
      const publicCopy = JSON.stringify({ metadata, content });

      assert.doesNotMatch(publicCopy, /sense errors|sin errores/i);
      assert.doesNotMatch(publicCopy, /pràcticament sol|prácticamente solo/i);
    }
  }
});

test('Catalan and Spanish public marketing sources avoid error-free guarantees', () => {
  const publicMarketingSources = [
    readFileSync('src/lib/public-landings.ts', 'utf8'),
    readFileSync('src/i18n/public.ts', 'utf8'),
  ].join('\n');

  assert.doesNotMatch(
    publicMarketingSources,
    /\b(?:sense|sin)\b[^.!?\n]{0,32}\b(?:errors|errores)\b/i
  );
  assert.doesNotMatch(
    publicMarketingSources,
    /sense esforç|sin esfuerzo|tot validat|todo validado|control absolut|control absoluto/i
  );
});
