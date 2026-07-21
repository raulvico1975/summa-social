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
  assert.deepEqual(payload.appActions?.map((action) => action.href), [
    '/dashboard',
    '/dashboard/project-module/projects',
  ]);
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

test('runWeeklyProductUpdateJob genera la novetat real de contactes i invitacions de juliol', async () => {
  let publishedPayload: PublishProductUpdateRequest | null = null;

  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-07-13T06:00:00.000Z'),
    listRelevantCommits: async () => [
      buildCommit({
        sha: '698133405',
        message: 'feat(api): actualitza fluxos de dades i validacions [23 fitxers, risc ALT]',
        files: ['src/app/api/contacts/import/route.ts', 'src/app/api/invitations/create/handler.ts'],
        areas: ['integracions'],
      }),
      buildCommit({
        sha: 'cfcabd14b',
        message: 'fix(invitations): endureix validacio i enllacos',
        files: ['src/app/[orgSlug]/login/page.tsx', 'src/app/registre/page.tsx'],
        areas: ['general'],
      }),
      buildCommit({
        sha: '95fd0f89f',
        message: 'fix(contacts): evita errors en guardar contactes',
        files: ['src/app/api/contacts/import/route.ts', 'src/components/supplier-manager.tsx'],
        areas: ['integracions'],
      }),
    ],
    hasExistingExternalId: async () => false,
    publishProductUpdate: async (payload) => {
      publishedPayload = payload;
      return { status: 'success' };
    },
    verifyPublishedProductUpdate: async () => true,
  });

  assert.equal(result.status, 'success');
  assert.ok(publishedPayload);
  assert.equal(
    (publishedPayload as PublishProductUpdateRequest).title,
    'Guarda contactes i convida amb més seguretat'
  );
  assert.match(
    (publishedPayload as PublishProductUpdateRequest).contentLong,
    /guardar contactes amb menys errors/
  );
  assert.match(
    (publishedPayload as PublishProductUpdateRequest).contentLong,
    /Per què és útil:/
  );
  assert.deepEqual(
    (publishedPayload as PublishProductUpdateRequest).appActions?.map((action) => action.href),
    ['/dashboard/configuracion', '/dashboard/proveidors']
  );
});

test('runWeeklyProductUpdateJob genera la novetat real de bot i importacio bancaria de juliol', async () => {
  let publishedPayload: PublishProductUpdateRequest | null = null;

  const result = await runWeeklyProductUpdateJob({
    now: () => new Date('2026-07-20T06:00:00.000Z'),
    listRelevantCommits: async () => [
      buildCommit({
        sha: 'cfa6406c6',
        message: 'feat(core): actualitza logica interna i robustesa [3 fitxers, risc MITJA]',
        files: ['src/i18n/public.ts', 'src/lib/public-landings.ts'],
        areas: ['general'],
      }),
      buildCommit({
        sha: 'bcd79bfc2',
        message: 'fix(support-bot): resol assignació natural de moviments',
        files: ['src/lib/support/bot-retrieval.ts'],
        areas: ['suport'],
      }),
      buildCommit({
        sha: '044b90e36',
        message: 'feat(support-bot): reforça ajuda natural CA ES què canvia: corregeix context d’entitat, idioma, cobertura i accés QA',
        files: ['src/app/api/support/bot/route.ts', 'src/components/help/BotSheet.tsx'],
        areas: ['integracions', 'suport'],
      }),
      buildCommit({
        sha: 'be31d40e3',
        message: 'feat(ui): actualitza comportament visible de l aplicacio [8 fitxers, risc MITJA]',
        files: ['src/components/transaction-importer.tsx', 'src/lib/importers/bank/selectBankStatementSheet.ts'],
        areas: ['moviments'],
      }),
      buildCommit({
        sha: '79464f2c4',
        message: 'feat(ui): actualitza comportament visible de l aplicacio [7 fitxers, risc MITJA]',
        files: ['src/app/public/[lang]/blog/page.tsx'],
        areas: ['general'],
      }),
    ],
    hasExistingExternalId: async () => false,
    publishProductUpdate: async (payload) => {
      publishedPayload = payload;
      return { status: 'success' };
    },
    verifyPublishedProductUpdate: async () => true,
  });

  assert.equal(result.status, 'success');
  assert.ok(publishedPayload);
  assert.equal(
    (publishedPayload as PublishProductUpdateRequest).title,
    'Troba millor ajuda i importa extractes amb menys errors'
  );
  assert.match(
    (publishedPayload as PublishProductUpdateRequest).contentLong,
    /importador bancari selecciona millor el full/
  );
  assert.match(
    (publishedPayload as PublishProductUpdateRequest).contentLong,
    /entén millor l’idioma, l’entitat visible i el context/
  );
  assert.deepEqual(
    (publishedPayload as PublishProductUpdateRequest).appActions?.map((action) => action.href),
    ['/dashboard/manual', '/dashboard/movimientos']
  );
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

test('validateWeeklyProductUpdateEditorial rebutja la novetat generica del 04/05/2026', () => {
  const validation = validateWeeklyProductUpdateEditorial({
    title: 'Millores setmanals a Summa Social',
    description: 'Descobreix les noves millores a Summa Social, dissenyades per fer la teva gestió administrativa més àgil, precisa i segura en el dia a dia.',
    contentLong: [
      "Aquesta setmana hem desplegat millores clau a Summa Social pensades per simplificar les teves tasques administratives habituals.",
      "L'objectiu és reduir friccions i millorar la fiabilitat de la informació que gestiones.",
      '- Hem incorporat la garantia institucional Semilla en els fluxos de treball.',
      '- Hem perfeccionat la validació de dades per assegurar que la teva gestió sigui més exacta.',
      '- El sistema ara identifica millor les teves necessitats per oferir-te respostes més precises.',
    ].join('\n'),
    web: {
      excerpt: 'Descobreix les noves millores a Summa Social, dissenyades per fer la teva gestió administrativa més àgil, precisa i segura en el dia a dia.',
      content: 'No cal que facis cap canvi en la configuració, ja que aquestes millores s’han aplicat automàticament perquè gaudeixis d’una operativa més fluida des d’ara mateix.',
    },
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /weekly title must name the affected area/);
  assert.match(validation.errors.join('\n'), /generic editorial phrase is not allowed: garantia institucional/);
  assert.match(validation.errors.join('\n'), /contentLong must include section "que canvia:"/);
});

test('validateWeeklyProductUpdateEditorial rebutja seccions presents amb contingut buit o generic', () => {
  const validation = validateWeeklyProductUpdateEditorial({
    title: 'Dashboard: millores visibles en el resum',
    description: 'Ara el dashboard mostra millor el resum econòmic de l’entitat.',
    contentLong: [
      'Què canvia:',
      '- Millores internes del funcionament general.',
      '',
      'On ho notaràs:',
      '- Al dashboard.',
      '',
      'Què has de fer:',
      '- Revisa-ho.',
      '',
      'Límit:',
      '- Cap.',
    ].join('\n'),
    web: {
      excerpt: 'Millores internes al dashboard.',
      content: 'Millores internes del funcionament general.',
    },
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /generic editorial phrase is not allowed: millores internes/);
  assert.match(validation.errors.join('\n'), /section "limit:" must state what is not covered/);
});

test('validateWeeklyProductUpdateEditorial exigeix benefici concret al format orientat a resultats', () => {
  const validation = validateWeeklyProductUpdateEditorial({
    title: 'Dashboard: consulta millor els indicadors',
    description: 'Ara pots revisar l’activitat recent des del dashboard.',
    contentLong: [
      'Què pots fer ara:',
      '- Ara pots consultar els indicadors recents del dashboard.',
      '',
      'On ho trobaràs:',
      '- Al resum del dashboard.',
      '',
      'Què has de fer:',
      '- Revisa el dashboard abans de preparar l’informe.',
    ].join('\n'),
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /contentLong must include section "per que es util:"/);
});

test('generateWeeklyProductUpdateContent normalitza permisos a llenguatge d’usuari', () => {
  const window = buildPreviousWeeklyWindow(new Date('2026-05-12T06:00:00.000Z'), 'Europe/Madrid');
  const generated = generateWeeklyProductUpdateContent({
    window,
    commits: [
      buildCommit({
        message: 'fix(api): exigeix permís per arxivar projectes',
        files: ['src/app/api/projects/archive/handler.ts'],
        areas: ['projectes', 'integracions'],
      }),
      buildCommit({
        message: 'fix(api): exigeix permís per arxivar categories',
        files: ['src/app/api/categories/archive/route.ts'],
        areas: ['integracions', 'configuracio'],
      }),
    ],
  });

  assert.equal(generated.title, 'Projectes i categories: arxivament amb permisos més estrictes');
  assert.match(generated.contentLong, /L’arxivament de projectes exigeix el permís corresponent/);
  assert.match(generated.contentLong, /a la configuració de categories/);
  assert.doesNotMatch(generated.description, /veuràs exigeix permís/);
  assert.doesNotMatch(generated.web.excerpt, /a a la/);
});

test('generateWeeklyProductUpdateContent genera ES sense fragments catalans de commit', () => {
  const window = buildPreviousWeeklyWindow(new Date('2026-05-12T06:00:00.000Z'), 'Europe/Madrid');
  const generated = generateWeeklyProductUpdateContent({
    window,
    commits: [
      buildCommit({
        message: 'fix(api): exigeix permís per arxivar projectes',
        files: ['src/app/api/projects/archive/handler.ts'],
        areas: ['projectes', 'integracions'],
      }),
    ],
  });
  const spanishText = [
    generated.locales.es.title,
    generated.locales.es.description,
    generated.locales.es.contentLong,
    generated.locales.es.web.excerpt,
    generated.locales.es.web.content,
  ].join('\n');

  assert.match(spanishText, /El archivado de proyectos exige el permiso correspondiente/);
  assert.doesNotMatch(spanishText, /exigeix|permís|arxivar projectes|llista|detall|Què/u);
});

test('validateWeeklyProductUpdateEditorial rebutja traduccio ES amb català', () => {
  const generated = buildGeneratedContent();
  const validation = validateWeeklyProductUpdateEditorial({
    ...generated,
    locales: {
      es: {
        title: 'Proyectos: exigeix permís per arxivar projectes',
        description: 'Ahora en la llista verás exigeix permís.',
        contentLong: generated.locales.es.contentLong,
        web: {
          title: 'Proyectos: exigeix permís per arxivar projectes',
          excerpt: 'Cambios en la llista.',
          content: generated.locales.es.web.content,
        },
      },
    },
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors.join('\n'), /invalid_spanish_translation/);
});
