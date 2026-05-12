import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runWeeklyProductUpdateJob,
  type PublishProductUpdateRequest,
} from '@/lib/product-updates/weekly-product-update-runner';
import { generateWeeklyProductUpdateContent } from '@/lib/product-updates/weekly-generator';
import { buildPreviousWeeklyWindow } from '@/lib/product-updates/weekly-window';
import { validateWeeklyProductUpdateEditorial } from '@/lib/product-updates/editorial-policy';

function buildCommit(overrides: Partial<{
  sha: string;
  message: string;
  committedAt: string;
  files: string[];
  url: string;
  areas: string[];
}> = {}) {
  return {
    sha: overrides.sha ?? 'abc123',
    message: overrides.message ?? 'feat: nou resum del dashboard',
    committedAt: overrides.committedAt ?? '2026-04-01T10:00:00.000Z',
    files: overrides.files ?? ['src/app/[orgSlug]/dashboard/page.tsx'],
    url: overrides.url ?? 'https://github.com/raulvico1975/summa-social/commit/abc123',
    areas: overrides.areas ?? ['dashboard'],
  };
}

function buildLogger() {
  const infoEvents: Array<{ event: string; payload: Record<string, unknown> }> = [];
  const errorEvents: Array<{ event: string; payload: Record<string, unknown> }> = [];

  return {
    infoEvents,
    errorEvents,
    logger: {
      info: (event: string, payload: Record<string, unknown>) => {
        infoEvents.push({ event, payload });
      },
      error: (event: string, payload: Record<string, unknown>) => {
        errorEvents.push({ event, payload });
      },
    },
  };
}

function buildGeneratedContent() {
  const window = buildPreviousWeeklyWindow(new Date('2026-04-06T06:00:00.000Z'), 'Europe/Madrid');
  return generateWeeklyProductUpdateContent({
    window,
    commits: [
      buildCommit(),
      buildCommit({
        sha: 'def456',
        message: 'fix: millor context en projectes',
        files: ['src/app/[orgSlug]/dashboard/projectes/page.tsx'],
        areas: ['projectes'],
      }),
    ],
  });
}

test('runWeeklyProductUpdateJob fa no-op si no hi ha commits rellevants', async () => {
  let generateCalled = false;
  let publishCalled = false;

  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-04-06T06:00:00.000Z'),
    listRelevantCommits: async () => [],
    hasExistingExternalId: async () => false,
    generateContent: async () => {
      generateCalled = true;
      throw new Error('should not generate');
    },
    publishProductUpdate: async () => {
      publishCalled = true;
      return { status: 'success' };
    },
  });

  assert.deepEqual(result, {
    status: 'no_changes',
    externalId: 'weekly-product-update-2026-03-30_2026-04-05',
    relevantCommitCount: 0,
  });
  assert.equal(generateCalled, false);
  assert.equal(publishCalled, false);
});

test('runWeeklyProductUpdateJob publica una sola peça setmanal quan hi ha canvis', async () => {
  let publishedPayload: PublishProductUpdateRequest | null = null;

  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-04-06T06:00:00.000Z'),
    listRelevantCommits: async () => [
      buildCommit(),
      buildCommit({
        sha: 'def456',
        message: 'fix: millor context en projectes',
        files: ['src/app/[orgSlug]/dashboard/projectes/page.tsx'],
        areas: ['projectes'],
      }),
    ],
    hasExistingExternalId: async () => false,
    generateContent: async () => buildGeneratedContent(),
    publishProductUpdate: async (payload) => {
      publishedPayload = payload;
      return { status: 'success' };
    },
  });

  assert.equal(result.status, 'success');
  assert.equal(result.relevantCommitCount, 2);
  assert.ok(publishedPayload);
  const payload = publishedPayload as PublishProductUpdateRequest;
  assert.equal(payload.externalId, 'weekly-product-update-2026-03-30_2026-04-05');
  assert.equal(payload.locale, 'ca');
  assert.equal(payload.web?.enabled, true);
  assert.equal(payload.isActive, true);
});

test('runWeeklyProductUpdateJob pot generar contingut setmanal sense cridar endpoint IA', async () => {
  let publishedPayload: PublishProductUpdateRequest | null = null;

  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-04-06T06:00:00.000Z'),
    listRelevantCommits: async () => [buildCommit()],
    hasExistingExternalId: async () => false,
    publishProductUpdate: async (payload) => {
      publishedPayload = payload;
      return { status: 'success' };
    },
    verifyPublishedProductUpdate: async () => true,
  });

  assert.equal(result.status, 'success');
  assert.ok(publishedPayload);
  assert.equal((publishedPayload as PublishProductUpdateRequest).title.startsWith('Dashboard:'), true);
});

test('runWeeklyProductUpdateJob tracta com a duplicat una setmana ja publicada', async () => {
  let publishCalled = false;

  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-04-06T06:00:00.000Z'),
    listRelevantCommits: async () => [buildCommit()],
    hasExistingExternalId: async () => true,
    generateContent: async () => {
      throw new Error('should not generate');
    },
    publishProductUpdate: async () => {
      publishCalled = true;
      return { status: 'success' };
    },
  });

  assert.deepEqual(result, {
    status: 'duplicate',
    externalId: 'weekly-product-update-2026-03-30_2026-04-05',
    relevantCommitCount: 1,
  });
  assert.equal(publishCalled, false);
});

test('runWeeklyProductUpdateJob no publica si els commits son interns', async () => {
  let publishCalled = false;

  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-04-06T06:00:00.000Z'),
    listRelevantCommits: async () => [
      buildCommit({
        message: 'refactor(product-updates): mou helpers interns',
        files: ['src/lib/product-updates/weekly-product-update-runner.ts'],
      }),
      buildCommit({
        message: 'fix: update deploy logs',
        files: ['docs/DEPLOY-LOG.md'],
      }),
    ],
    hasExistingExternalId: async () => false,
    publishProductUpdate: async () => {
      publishCalled = true;
      return { status: 'success' };
    },
  });

  assert.deepEqual(result, {
    status: 'no_visible_product_changes',
    externalId: 'weekly-product-update-2026-03-30_2026-04-05',
    relevantCommitCount: 2,
  });
  assert.equal(publishCalled, false);
});

test('runWeeklyProductUpdateJob tracta com a segur un duplicate retornat per publish', async () => {
  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-04-06T06:00:00.000Z'),
    listRelevantCommits: async () => [buildCommit()],
    hasExistingExternalId: async () => false,
    generateContent: async () => buildGeneratedContent(),
    publishProductUpdate: async () => ({ status: 'duplicate' }),
  });

  assert.equal(result.status, 'duplicate');
});

test('runWeeklyProductUpdateJob registra error controlat si GitHub falla', async () => {
  const { errorEvents, logger } = buildLogger();

  await assert.rejects(
    () =>
      runWeeklyProductUpdateJob({
        now: () => new Date('2026-04-06T06:00:00.000Z'),
        listRelevantCommits: async () => {
          throw new Error('GitHub request failed');
        },
        hasExistingExternalId: async () => false,
        generateContent: async () => buildGeneratedContent(),
        publishProductUpdate: async () => ({ status: 'success' }),
        logger,
      }),
    /GitHub request failed/
  );

  assert.equal(errorEvents.at(-1)?.event, 'weekly_product_updates.error');
  assert.equal(errorEvents.at(-1)?.payload.errorMessage, 'GitHub request failed');
});

test('runWeeklyProductUpdateJob registra error controlat si la IA falla', async () => {
  const { errorEvents, logger } = buildLogger();

  await assert.rejects(
    () =>
      runWeeklyProductUpdateJob({
        now: () => new Date('2026-04-06T06:00:00.000Z'),
        listRelevantCommits: async () => [buildCommit()],
        hasExistingExternalId: async () => false,
        generateContent: async () => {
          throw new Error('AI route failed');
        },
        publishProductUpdate: async () => ({ status: 'success' }),
        logger,
      }),
    /AI route failed/
  );

  assert.equal(errorEvents.at(-1)?.event, 'weekly_product_updates.error');
  assert.equal(errorEvents.at(-1)?.payload.errorMessage, 'AI route failed');
});

test('runWeeklyProductUpdateJob registra error controlat si publish falla', async () => {
  const { errorEvents, logger } = buildLogger();

  await assert.rejects(
    () =>
      runWeeklyProductUpdateJob({
        now: () => new Date('2026-04-06T06:00:00.000Z'),
        listRelevantCommits: async () => [buildCommit()],
        hasExistingExternalId: async () => false,
        generateContent: async () => buildGeneratedContent(),
        publishProductUpdate: async () => ({
          status: 'error',
          errorMessage: 'publish failed',
        }),
        logger,
      }),
    /publish failed/
  );

  assert.equal(errorEvents.at(-1)?.event, 'weekly_product_updates.error');
  assert.equal(errorEvents.at(-1)?.payload.errorMessage, 'publish failed');
});

test('runWeeklyProductUpdateJob falla si la publicacio no queda activa i visible', async () => {
  const { errorEvents, logger } = buildLogger();

  await assert.rejects(
    () =>
      runWeeklyProductUpdateJob({
        now: () => new Date('2026-04-06T06:00:00.000Z'),
        listRelevantCommits: async () => [buildCommit()],
        hasExistingExternalId: async () => false,
        publishProductUpdate: async () => ({ status: 'success' }),
        verifyPublishedProductUpdate: async () => false,
        logger,
      }),
    /published product update was not active/
  );

  assert.equal(errorEvents.at(-1)?.event, 'weekly_product_updates.error');
});

test('runWeeklyProductUpdateJob bloqueja contingut setmanal massa generic', async () => {
  const { errorEvents, logger } = buildLogger();
  let publishCalled = false;

  await assert.rejects(
    () =>
      runWeeklyProductUpdateJob({
        now: () => new Date('2026-04-06T06:00:00.000Z'),
        listRelevantCommits: async () => [buildCommit()],
        hasExistingExternalId: async () => false,
        generateContent: async () => ({
          title: 'Millores setmanals a Summa Social',
          description: 'Gestió més àgil, precisa i segura.',
          contentLong: 'Hem fet millores internes del funcionament general.',
          web: {
            excerpt: 'Millores internes.',
            content: 'Millores internes del funcionament general.',
          },
        }),
        publishProductUpdate: async () => {
          publishCalled = true;
          return { status: 'success' };
        },
        logger,
      }),
    /weekly editorial policy failed/
  );

  assert.equal(publishCalled, false);
  assert.equal(errorEvents.at(-1)?.event, 'weekly_product_updates.error');
});

test('validateWeeklyProductUpdateEditorial accepta el generador determinista', () => {
  const generated = buildGeneratedContent();
  const validation = validateWeeklyProductUpdateEditorial(generated);
  assert.deepEqual(validation, { ok: true });
});
