import test from 'node:test';
import assert from 'node:assert/strict';
import { handleProductUpdatesPublish } from '@/app/api/product-updates/publish/handler';

type DocData = Record<string, unknown>;

class FakeDocSnap {
  constructor(
    public readonly exists: boolean,
    private readonly payload: DocData | undefined
  ) {}

  data() {
    return this.payload;
  }
}

class FakeDocRef {
  constructor(
    private readonly store: Map<string, DocData>,
    private readonly path: string
  ) {}

  async get() {
    const data = this.store.get(this.path);
    return new FakeDocSnap(data !== undefined, data);
  }

  async create(payload: DocData) {
    if (this.store.has(this.path)) {
      throw new Error('already-exists');
    }
    this.store.set(this.path, { ...payload });
  }
}

class FakeDb {
  constructor(private readonly store: Map<string, DocData>) {}

  doc(path: string) {
    return new FakeDocRef(this.store, path);
  }

  collection(path: string) {
    assert.equal(path, 'productUpdates');

    return {
      get: async () => ({
        docs: Array.from(this.store.entries())
          .filter(([docPath]) => docPath.startsWith('productUpdates/'))
          .map(([docPath, data]) => ({
            id: docPath.slice('productUpdates/'.length),
            data: () => data,
          })),
      }),
    };
  }
}

function createRequest(body: unknown, token = 'top-secret') {
  return {
    headers: new Headers({
      Authorization: `Bearer ${token}`,
    }),
    json: async () => body,
  } as never;
}

function buildValidPayload() {
  return {
    locale: 'ca',
    externalId: 'novetat-2026-03-26-001',
    title: 'Millora en el detall de cobraments',
    description: 'Ara tens una vista mes clara del detall de cobraments.',
    link: null,
    contentLong: 'Hem simplificat el detall de cobraments per entendre millor cada pas.',
    guideUrl: null,
    videoUrl: null,
    web: {
      enabled: true,
      slug: 'millora-detall-cobraments',
      excerpt: 'Una vista mes clara per entendre cada cobrament.',
      content: 'Hem simplificat les dades visibles i el context de cada cobrament.',
    },
    sourceMeta: {
      system: 'openclaw',
      externalId: 'novetat-2026-03-26-001',
      sourceRefs: ['deploy:2026-03-26'],
      evidenceRefs: ['pr:123'],
      approvedAt: '2026-03-26T10:00:00.000Z',
      approvedBy: 'Raul',
    },
    channels: ['app', 'web'],
  };
}

function buildWeeklySchedulerPayload() {
  return {
    locale: 'ca',
    externalId: 'weekly-product-update-2026-03-30_2026-04-05',
    title: 'Dashboard: resum descarregable per revisar indicadors',
    description: 'Ara pots descarregar el resum del dashboard per revisar indicadors econòmics fora de Summa.',
    link: null,
    contentLong: [
      'Aquesta setmana hem millorat el dashboard amb canvis desplegats entre el 30/03/2026 i el 05/04/2026.',
      '',
      'Què canvia:',
      '- Ara pots descarregar el resum del dashboard en PDF o Excel.',
      '',
      'On ho notaràs:',
      '- Al resum i als indicadors del dashboard.',
      '',
      'Què has de fer:',
      '- Consulta el dashboard i descarrega el resum quan hagis de compartir indicadors.',
      '',
      'Límit:',
      '- No modifica dades ja guardades ni canvia els criteris de càlcul.',
    ].join('\n'),
    guideUrl: null,
    videoUrl: null,
    web: {
      enabled: true,
      slug: 'novetats-setmanals-2026-03-30-2026-04-05',
      excerpt: 'Descàrrega del resum del dashboard per revisar indicadors fora de Summa.',
      content: [
        'Aquesta setmana hem millorat el dashboard amb canvis desplegats entre el 30/03/2026 i el 05/04/2026.',
        '',
        'Què canvia:',
        '- Ara pots descarregar el resum del dashboard en PDF o Excel.',
        '',
        'On ho notaràs:',
        '- Al resum i als indicadors del dashboard.',
        '',
        'Què has de fer:',
        '- Consulta el dashboard i descarrega el resum quan hagis de compartir indicadors.',
        '',
        'Límit:',
        '- No modifica dades ja guardades ni canvia els criteris de càlcul.',
      ].join('\n'),
    },
    locales: buildSpanishLocalization(),
    isActive: false,
  };
}

function buildBadWeeklyPublicPayload() {
  return {
    locale: 'ca',
    externalId: 'weekly-product-update-2026-04-27_2026-05-03',
    title: 'Millores setmanals a Summa Social',
    description: 'Descobreix les noves millores a Summa Social, dissenyades per fer la teva gestió administrativa més àgil, precisa i segura en el dia a dia.',
    link: null,
    contentLong: [
      "Aquesta setmana hem desplegat millores clau a Summa Social pensades per simplificar les teves tasques administratives habituals.",
      "L'objectiu és reduir friccions i millorar la fiabilitat de la informació que gestiones.",
      "- Hem incorporat la garantia institucional Semilla en els fluxos de treball.",
      "- Hem perfeccionat la validació de dades per assegurar que la teva gestió sigui més exacta.",
      "- El sistema ara identifica millor les teves necessitats per oferir-te respostes més precises.",
    ].join('\n'),
    guideUrl: null,
    videoUrl: null,
    web: {
      enabled: true,
      slug: 'novetats-setmanals-2026-04-27-2026-05-03',
      excerpt: 'Descobreix les noves millores a Summa Social, dissenyades per fer la teva gestió administrativa més àgil, precisa i segura en el dia a dia.',
      content: 'No cal que facis cap canvi en la configuració, ja que aquestes millores s’han aplicat automàticament perquè gaudeixis d’una operativa més fluida des d’ara mateix.',
    },
    isActive: true,
  };
}

function buildSpanishLocalization() {
  return {
    es: {
      title: 'Mejora en el detalle de cobros',
      description: 'Ahora tienes una vista más clara del detalle de cobros.',
      contentLong: 'Hemos simplificado el detalle de cobros para entender mejor cada paso.',
      web: {
        title: 'Mejora en el detalle de cobros',
        excerpt: 'Una vista más clara para entender cada cobro.',
        content: 'Hemos simplificado los datos visibles y el contexto de cada cobro.',
      },
    },
  };
}

test('handleProductUpdatesPublish rejects unauthorized requests', async () => {
  const response = await handleProductUpdatesPublish(
    createRequest(buildValidPayload(), 'wrong-token'),
    {
      getAdminDbFn: () => new FakeDb(new Map()) as never,
      nowTimestampFn: () => 'now',
      getPublishSecretFn: () => 'top-secret',
      getPublicBaseUrlFn: () => 'https://summasocial.app',
      getPublicLocalesFn: () => ['ca', 'es'],
      localizeProductUpdateFn: async () => buildSpanishLocalization(),
      revalidatePathsFn: async () => {},
    }
  );

  assert.equal(response.status, 401);
});

test('handleProductUpdatesPublish validates payload and rejects html', async () => {
  const payload = buildValidPayload();
  payload.description = '<b>No valid</b>';

  const response = await handleProductUpdatesPublish(
    createRequest(payload),
    {
      getAdminDbFn: () => new FakeDb(new Map()) as never,
      nowTimestampFn: () => 'now',
      getPublishSecretFn: () => 'top-secret',
      getPublicBaseUrlFn: () => 'https://summasocial.app',
      getPublicLocalesFn: () => ['ca'],
      localizeProductUpdateFn: async () => buildSpanishLocalization(),
      revalidatePathsFn: async () => {},
    }
  );

  assert.equal(response.status, 400);
  const body = await response.json() as { success: boolean; details?: string[] };
  assert.equal(body.success, false);
  assert.ok(body.details?.includes('description must be plain text'));
});

test('handleProductUpdatesPublish creates product update, avoids undefined and revalidates real locales', async () => {
  const store = new Map<string, DocData>();
  const revalidatedPaths: string[] = [];

  const response = await handleProductUpdatesPublish(
    createRequest(buildValidPayload()),
    {
      getAdminDbFn: () => new FakeDb(store) as never,
      nowTimestampFn: () => ({
        toDate: () => new Date('2026-03-26T12:00:00.000Z'),
      }),
      getPublishSecretFn: () => 'top-secret',
      getPublicBaseUrlFn: () => 'https://summasocial.app',
      getPublicLocalesFn: () => ['ca', 'es'],
      localizeProductUpdateFn: async () => buildSpanishLocalization(),
      revalidatePathsFn: async (paths) => {
        revalidatedPaths.push(...paths);
      },
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json() as {
    success: boolean;
    id?: string;
    url?: string | null;
    created?: boolean;
    alreadyExists?: boolean;
  };
  assert.equal(body.success, true);
  assert.equal(body.id, 'novetat-2026-03-26-001');
  assert.equal(body.url, 'https://summasocial.app/ca/novetats/millora-detall-cobraments');
  assert.equal(body.created, true);
  assert.equal(body.alreadyExists, false);

  const stored = store.get('productUpdates/novetat-2026-03-26-001');
  assert.ok(stored);
  assert.equal(stored?.locale, 'ca');
  assert.equal(stored?.link, 'https://summasocial.app/ca/novetats/millora-detall-cobraments');
  assert.equal(stored?.social, null);
  assert.equal((stored?.web as { title?: string }).title, 'Millora en el detall de cobraments');
  assert.deepEqual(stored?.locales, buildSpanishLocalization());
  assert.deepEqual((stored?.web as { locales?: unknown }).locales, {
    es: buildSpanishLocalization().es.web,
  });
  assert.equal('videoUrl' in (stored ?? {}), true);
  assert.equal(Object.values(stored ?? {}).includes(undefined), false);
  assert.deepEqual(revalidatedPaths, [
    '/ca',
    '/ca/novetats',
    '/ca/novetats/millora-detall-cobraments',
    '/es',
    '/es/novetats',
    '/es/novetats/millora-detall-cobraments',
  ]);
});

test('handleProductUpdatesPublish is idempotent for existing externalId', async () => {
  const store = new Map<string, DocData>();
  store.set('productUpdates/novetat-2026-03-26-001', {
    id: 'novetat-2026-03-26-001',
    link: 'https://summasocial.app/ca/novetats/millora-detall-cobraments',
  });

  const response = await handleProductUpdatesPublish(
    createRequest(buildValidPayload()),
    {
      getAdminDbFn: () => new FakeDb(store) as never,
      nowTimestampFn: () => 'now',
      getPublishSecretFn: () => 'top-secret',
      getPublicBaseUrlFn: () => 'https://summasocial.app',
      getPublicLocalesFn: () => ['ca'],
      localizeProductUpdateFn: async () => buildSpanishLocalization(),
      revalidatePathsFn: async () => {},
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json() as {
    success: boolean;
    url?: string | null;
    created?: boolean;
    alreadyExists?: boolean;
  };
  assert.equal(body.success, true);
  assert.equal(body.url, 'https://summasocial.app/ca/novetats/millora-detall-cobraments');
  assert.equal(body.created, false);
  assert.equal(body.alreadyExists, true);
});

test('handleProductUpdatesPublish rejects duplicate slug from another doc', async () => {
  const store = new Map<string, DocData>();
  store.set('productUpdates/another-id', {
    title: 'Altre update',
    web: {
      enabled: true,
      slug: 'millora-detall-cobraments',
    },
  });

  const response = await handleProductUpdatesPublish(
    createRequest(buildValidPayload()),
    {
      getAdminDbFn: () => new FakeDb(store) as never,
      nowTimestampFn: () => 'now',
      getPublishSecretFn: () => 'top-secret',
      getPublicBaseUrlFn: () => 'https://summasocial.app',
      getPublicLocalesFn: () => ['ca'],
      localizeProductUpdateFn: async () => buildSpanishLocalization(),
      revalidatePathsFn: async () => {},
    }
  );

  assert.equal(response.status, 409);
  const body = await response.json() as { success: boolean; error?: string };
  assert.equal(body.success, false);
  assert.equal(body.error, 'duplicate_slug');
});

test('handleProductUpdatesPublish accepta payload mínim del scheduler sense sourceMeta ni channels', async () => {
  const store = new Map<string, DocData>();

  const response = await handleProductUpdatesPublish(
    createRequest(buildWeeklySchedulerPayload()),
    {
      getAdminDbFn: () => new FakeDb(store) as never,
      nowTimestampFn: () => 'now',
      getPublishSecretFn: () => 'top-secret',
      getPublicBaseUrlFn: () => 'https://summasocial.app',
      getPublicLocalesFn: () => ['ca', 'es'],
      localizeProductUpdateFn: async (payload) => payload.locales ?? null,
      revalidatePathsFn: async () => {},
    }
  );

  assert.equal(response.status, 200);
  const body = await response.json() as { success: boolean; id?: string };
  assert.equal(body.success, true);
  assert.equal(body.id, 'weekly-product-update-2026-03-30_2026-04-05');

  const stored = store.get('productUpdates/weekly-product-update-2026-03-30_2026-04-05');
  assert.ok(stored);
  assert.equal(stored?.isActive, false);
  assert.equal((stored?.web as { slug?: string } | null)?.slug, 'novetats-setmanals-2026-03-30-2026-04-05');
  assert.equal('sourceMeta' in (stored ?? {}), false);
});

test('handleProductUpdatesPublish rebutja novetat setmanal publica sense qualitat editorial', async () => {
  const response = await handleProductUpdatesPublish(
    createRequest(buildBadWeeklyPublicPayload()),
    {
      getAdminDbFn: () => new FakeDb(new Map()) as never,
      nowTimestampFn: () => 'now',
      getPublishSecretFn: () => 'top-secret',
      getPublicBaseUrlFn: () => 'https://summasocial.app',
      getPublicLocalesFn: () => ['ca'],
      localizeProductUpdateFn: async () => null,
      revalidatePathsFn: async () => {},
    }
  );

  assert.equal(response.status, 400);
  const body = await response.json() as { success: boolean; error?: string; details?: string[] };
  assert.equal(body.success, false);
  assert.equal(body.error, 'invalid_editorial_policy');
  assert.match(body.details?.join('\n') ?? '', /weekly title must name the affected area/);
  assert.match(body.details?.join('\n') ?? '', /generic editorial phrase is not allowed/);
});
