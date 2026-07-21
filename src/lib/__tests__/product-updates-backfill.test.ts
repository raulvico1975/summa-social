import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  validateWeeklyProductUpdateEditorial,
  type ProductUpdateEditorialPayload,
} from '@/lib/product-updates/editorial-policy';

const BACKFILL_FILES = [
  'weekly-product-update-2026-07-06_2026-07-12.json',
  'weekly-product-update-2026-07-13_2026-07-19.json',
];

test('els payloads de backfill de juliol són vàlids, bilingües i publicables', () => {
  const externalIds = new Set<string>();

  for (const file of BACKFILL_FILES) {
    const path = join(process.cwd(), 'docs', 'product-updates', 'backfill', file);
    const payload = JSON.parse(readFileSync(path, 'utf8')) as ProductUpdateEditorialPayload & {
      externalId: string;
      locale: string;
      isActive: boolean;
    };
    const locales = payload.locales as {
      es?: {
        title?: string;
        contentLong?: string;
        web?: { title?: string };
      };
    } | undefined;
    const web = payload.web as { enabled?: boolean; slug?: string } | undefined;

    assert.equal(typeof payload.externalId, 'string');
    assert.equal(externalIds.has(String(payload.externalId)), false);
    externalIds.add(String(payload.externalId));
    assert.equal(payload.locale, 'ca');
    assert.equal(payload.isActive, true);
    assert.equal(web?.enabled, true);
    assert.match(web?.slug ?? '', /^novetats-setmanals-2026-07-/);
    assert.equal(typeof locales?.es?.title, 'string');
    assert.equal(typeof locales?.es?.contentLong, 'string');
    assert.ok((payload.title?.length ?? 0) <= 60);
    assert.ok((locales?.es?.title?.length ?? 0) <= 60);
    assert.ok((locales?.es?.web?.title?.length ?? 0) <= 60);
    assert.deepEqual(validateWeeklyProductUpdateEditorial(payload), { ok: true });
    assert.doesNotMatch(JSON.stringify(payload), /undefined/);
  }
});
