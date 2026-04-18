import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {
  buildNativeBlogImagePrompt,
  resolveNativeBlogCoverProviders,
  resolveNativeBlogImageReferences,
} from '@/lib/editorial-native/cover'
import type { NativeBlogPost } from '@/lib/editorial-native/types'

function buildPost(): NativeBlogPost {
  return {
    id: 'blogdraft-returns',
    source: 'manual',
    status: 'approved',
    idea: {
      prompt: 'Devolucions de rebuts',
      audience: 'ONGs',
      problem: 'manca de control',
      objective: 'estat real',
    },
    draft: {
      title: 'Devolucions de rebuts: si no pots explicar què ha passat, no tens res controlat',
      slug: 'devolucions-de-rebuts',
      seoTitle: null,
      metaDescription: null,
      excerpt: 'El valor no es tornar a cobrar. Es saber què ha passat.',
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
  }
}

test('buildNativeBlogImagePrompt composes the canonical base, preset, and post context', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'summa-brand-prompt-'))
  const promptBaseFile = path.join(tempDir, 'prompt-base.txt')
  await writeFile(promptBaseFile, 'CANON BASE')

  const prompt = buildNativeBlogImagePrompt(buildPost(), {
    ...process.env,
    BLOG_IMAGE_PROMPT_BASE_PATH: promptBaseFile,
    BLOG_IMAGE_ASPECT_RATIO: '16:9',
    BLOG_IMAGE_SIZE: '2K',
  })

  assert.match(prompt, /CANON BASE/)
  assert.match(prompt, /Composicio especifica d'aquesta generacio/)
  assert.match(prompt, /web_devolucion_recibos_estado_real\.png/)
  assert.match(prompt, /Format final desitjat: 16:9/)
  assert.match(prompt, /Resolucio objectiu: 2K/)
})

test('resolveNativeBlogCoverProviders prefers nano banana when the wrapper exists', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'summa-brand-wrapper-'))
  const wrapperFile = path.join(tempDir, 'generate_cover.py')
  await writeFile(wrapperFile, '#!/usr/bin/env python3\n')

  const providers = resolveNativeBlogCoverProviders({
    ...process.env,
    BLOG_IMAGE_NANO_BANANA_WRAPPER: wrapperFile,
  })

  assert.deepEqual(providers, ['nano_banana', 'fallback'])
})

test('resolveNativeBlogImageReferences returns the approved existing reference paths', () => {
  const references = resolveNativeBlogImageReferences(buildPost())

  assert.ok(references.some((value) => value.endsWith('web_divideix_remeses_ca.webp')))
  assert.ok(references.some((value) => value.endsWith('web_concilia_bancaria_ca.webp')))
})
