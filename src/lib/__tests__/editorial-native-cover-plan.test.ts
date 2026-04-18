import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveNativeBlogCoverPlan } from '@/lib/editorial-native/cover-plan'
import type { NativeBlogPost } from '@/lib/editorial-native/types'

function buildPost(overrides: Partial<NativeBlogPost> = {}): NativeBlogPost {
  return {
    id: 'blogdraft-returns',
    source: 'manual',
    status: 'approved',
    idea: {
      prompt: 'Devolucions de rebuts',
      audience: 'ONGs',
      problem: 'manca de control',
      objective: 'fer visible l estat real',
    },
    draft: {
      title: 'Devolucions de rebuts: criteri i estat real',
      slug: 'devolucions-rebuts-criteri-estat-real',
      seoTitle: null,
      metaDescription: null,
      excerpt: 'Quan un rebut torna, el valor és saber què ha passat.',
      contentMarkdown: 'Una devolucio no es una incidencia menor.',
      contentHtml: null,
      tags: [],
      category: 'operacions',
      coverImageUrl: null,
      coverImageAlt: null,
      imagePrompt: null,
      translations: null,
    },
    context: {
      kbPath: null,
      kbAvailable: false,
      kbRefs: [],
      kbSnippets: [],
      model: null,
      llmApplied: null,
      validationStatus: null,
      validationVerdict: null,
      reviewNotes: [],
      generatedAt: null,
      translatedAt: null,
    },
    review: {
      approvedAt: null,
      approvedBy: null,
      publishedAt: null,
      publishedUrl: null,
      localizedUrls: null,
      lastError: null,
    },
    createdAt: '2026-04-18T00:00:00.000Z',
    updatedAt: '2026-04-18T00:00:00.000Z',
    ...overrides,
  }
}

test('resolveNativeBlogCoverPlan picks the receipt_returns preset and approved references', () => {
  const plan = resolveNativeBlogCoverPlan(buildPost())

  assert.equal(plan.preset.id, 'receipt_returns')
  assert.equal(plan.preset.filename, 'web_devolucion_recibos_estado_real.png')
  assert.equal(
    plan.preset.sceneDirection,
    'Composicion horizontal. A la izquierda, un grupo de recibos o cargos. En el centro, un punto de revision sereno. A la derecha, 2 o 3 documentos o fichas de estado que muestran que cada recibo acaba en una situacion clara. Debe transmitir que el valor no esta en volver a cobrar, sino en saber que ha pasado.'
  )
  assert.deepEqual(plan.preset.referenceNames, ['web_divideix_remeses_ca.webp', 'web_concilia_bancaria_ca.webp'])
  assert.equal(plan.filename, 'web_devolucion_recibos_estado_real.png')
  assert.equal(plan.sceneDirection, plan.preset.sceneDirection)
  assert.deepEqual(plan.referenceNames, plan.preset.referenceNames)
  assert.ok(plan.referencePaths.some((value) => value.endsWith('web_divideix_remeses_ca.webp')))
  assert.ok(plan.referencePaths.some((value) => value.endsWith('web_concilia_bancaria_ca.webp')))
})

test('resolveNativeBlogCoverPlan filters missing references from the selected preset', async () => {
  const libraryDir = await mkdtemp(path.join(os.tmpdir(), 'summa-cover-library-'))
  await writeFile(path.join(libraryDir, 'web_divideix_remeses_ca.webp'), 'stub')

  const plan = resolveNativeBlogCoverPlan(buildPost(), {
    ...process.env,
    BLOG_IMAGE_REFERENCE_LIBRARY_DIR: libraryDir,
  })

  assert.deepEqual(plan.referenceNames, ['web_divideix_remeses_ca.webp', 'web_concilia_bancaria_ca.webp'])
  assert.deepEqual(plan.referencePaths, [path.join(libraryDir, 'web_divideix_remeses_ca.webp')])
})

test('resolveNativeBlogCoverPlan falls back to a generic operational filename when no preset matches', () => {
  const post = buildPost()
  post.idea = {
    prompt: 'Il·lustració sobre formes i ritme',
    audience: 'equips',
    problem: 'imatge abstracta sense semàntica específica',
    objective: 'biblioteca gràfica estable',
  }
  post.draft = {
    ...post.draft,
    title: 'Una escena abstracta i atemporal',
    excerpt: 'Composició sense marcadors administratius ni financers.',
    contentMarkdown: 'Traç i calma sense mencions de cap procés concret.',
  }

  const plan = resolveNativeBlogCoverPlan(post)

  assert.equal(plan.preset.id, 'generic_operational')
  assert.ok(plan.filename.startsWith('web_'))
  assert.equal(plan.sceneDirection, plan.preset.sceneDirection)
})
