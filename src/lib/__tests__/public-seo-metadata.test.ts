import test from 'node:test';
import assert from 'node:assert/strict';
import { generatePublicPageMetadata } from '@/lib/public-locale';
import {
  getPublicLandingBySlug,
  getPublicLandingContent,
  getPublicLandingIndexedLocales,
  getPublicLandingMetadata,
} from '@/lib/public-landings';

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
