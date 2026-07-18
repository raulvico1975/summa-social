import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const CASE_ROUTE = 'src/app/public/[lang]/casos/flores-de-kiskeya/page.tsx';
const TRUST_ROUTE = 'src/app/public/[lang]/confianza/page.tsx';

test('real-use case stays factual and links to the official Flores site', () => {
  const source = readFileSync(join(process.cwd(), CASE_ROUTE), 'utf8');
  const publicCopy = source.slice(source.indexOf('const CASE_COPY'), source.indexOf('function isCaseLocale'));

  assert.match(source, /https:\/\/floresdekiskeya\.org\//);
  assert.match(source, /entitat usuària real/);
  assert.match(source, /entidad usuaria real/);
  assert.match(source, /no publiquem dades operatives/);
  assert.match(source, /no publicamos datos operativos/);
  assert.doesNotMatch(publicCopy, /estalvi (?:de|d['’])?\s*\d|ahorro de\s*\d/i);
  assert.doesNotMatch(publicCopy, /\d+\s*%/);
});

test('proof pages are linked from the footer and sitemap in CA and ES', () => {
  const footer = readFileSync(join(process.cwd(), 'src/components/public/PublicSiteFooter.tsx'), 'utf8');
  const sitemap = readFileSync(join(process.cwd(), 'src/app/sitemap.ts'), 'utf8');
  const llms = readFileSync(join(process.cwd(), 'src/app/llms.txt/route.ts'), 'utf8');

  for (const route of ['/casos/flores-de-kiskeya', '/confianza']) {
    assert.match(footer, new RegExp(route.replaceAll('/', '\\/')));
    assert.match(sitemap, new RegExp(route.replaceAll('/', '\\/')));
    assert.match(llms, new RegExp(route.replaceAll('/', '\\/')));
  }
  assert.match(sitemap, /locales: CONTENT_LOCALES/);
});

test('trust page keeps claims within documented product scope', () => {
  const source = readFileSync(join(process.cwd(), TRUST_ROUTE), 'utf8');

  assert.match(source, /format JSON/);
  assert.match(source, /permisos granulars/);
  assert.match(source, /permisos granulares/);
  assert.match(source, /No presentem certificacions/);
  assert.match(source, /No presentamos certificaciones/);
  assert.doesNotMatch(source, /ISO\s*27001|SOC\s*2|auditat externament|auditado externamente/i);
});
