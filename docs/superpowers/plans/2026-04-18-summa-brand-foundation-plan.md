# Summa Brand Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first mergeable brand foundation for Summa Social by canonizing the blog-cover visual system inside this repo, documenting it under docs/brand, and aligning the editorial cover runtime with the approved prompt/reference contract.

**Architecture:** This plan intentionally stops at Phase 1. It creates a docs-first brand layer, ports the current approved blog-cover prompt builder and preset resolver into this repo, and fixes the wrapper/runtime drift around aspect ratio so runtime behavior matches the documented contract. Short-video production is explicitly deferred to a second plan after this foundation is merged and reviewed.

**Tech Stack:** Markdown docs, plain text prompt base, TypeScript with node:test, existing editorial-native runtime, Python wrapper script, existing docs validator.

---

## Scope split

This plan covers:

- brand canon and blog-cover contracts inside docs/brand
- canonical prompt base and approved reference registry
- blog-cover preset resolution and prompt builder
- runtime provider order: Nano Banana -> Gemini -> SVG fallback
- wrapper fix so aspect ratio is forwarded to the final image engine

This plan does not cover:

- importing or building video-studio/hyperframes
- rendering a marketing video pilot
- changing public product UI
- unrelated i18n debt already present on the branch baseline

## File structure

New files in this plan:

- config/blog-image-prompt-base.txt
- docs/brand/brand-canon.md
- docs/brand/contracts/blog-cover.md
- docs/brand/execution/blog-cover.md
- docs/brand/prompts/blog-cover-base.md
- docs/brand/references/approved.md
- docs/brand/references/rejected.md
- docs/brand/memory/brand-memory.json
- docs/brand/memory/brand-memory.md
- scripts/editorial/generate_cover.py
- src/lib/editorial-native/cover-plan.ts
- src/lib/__tests__/editorial-native-cover-plan.test.ts
- src/lib/__tests__/editorial-native-cover-prompt.test.ts

Existing files to modify:

- src/lib/editorial-native/cover.ts

Reasoning:

- docs/brand becomes the single readable source of truth
- config/blog-image-prompt-base.txt becomes the runtime source of truth for the canonical base prompt
- cover-plan.ts holds deterministic preset and reference selection
- cover.ts remains the orchestration entrypoint, but only after pure selection/prompt logic is extracted and tested
- generate_cover.py becomes the explicit execution contract for Nano Banana

### Task 1: Create the brand canon, contract docs, and runtime prompt base

**Files:**

- Create: config/blog-image-prompt-base.txt
- Create: docs/brand/brand-canon.md
- Create: docs/brand/contracts/blog-cover.md
- Create: docs/brand/prompts/blog-cover-base.md
- Create: docs/brand/references/approved.md
- Create: docs/brand/references/rejected.md
- Create: docs/brand/memory/brand-memory.json
- Create: docs/brand/memory/brand-memory.md

- [ ] **Step 1: Write the brand canon markdown**

Create docs/brand/brand-canon.md with this exact skeleton and prose style:

```md
# Summa Social Brand Canon

## Purpose

This document is the canonical visual contract for Summa Social marketing assets.
It governs blog covers first and becomes the upstream source for short-video later.

## Visual language

- Minimalist hand-drawn doodle line art
- Thin, continuous, organic, slightly imperfect line
- Black and white base
- One or two very soft blue accents only
- White or transparent background
- No gradients
- No shadows
- No textures
- No tech effects
- No generic SaaS illustration style
- Not childish
- Not caricatural
- Calm, mature, operational, professional tone

## What images should represent

- Processes and criteria, not literal app screenshots
- Administrative order over time
- Calm operational control
- Real working situations without facial-detail portraiture
- Visuals that can stand alone without a long caption

## What images must avoid

- Real UI screens
- Decorative text
- Loud colors
- Clipart feeling
- Empty compositions that feel unfinished

## Governance

1. The brand is governed by contracts, not taste.
2. Approved reference images are part of the system.
3. Only approved outputs can enter brand memory.
4. Execution behavior must match the documented contract.
```

- [ ] **Step 2: Write the runtime prompt base file**

Create config/blog-image-prompt-base.txt with the approved canonical base prompt, copied verbatim from the validated editorial flow:

```txt
Rol

Ets el dissenyador visual oficial de Summa Social, una aplicacio de gestio economica per a ONGs i entitats socials.

La teva tasca es generar il·lustracions coherents entre si, que formin una biblioteca visual estable per a:

- web public
- xarxes socials
- materials de marca
- ocasionalment, producte

No estas creant imatges aillades, sino peces d'un llenguatge visual continu.

Estil visual obligatori

- Minimalist hand-drawn doodle line art
- Trac fi, continu, organic i lleugerament imperfecte, amb aspecte dibuixat a ma
- Blanc i negre com a base
- Nomes 1 o 2 accents molt subtils en blau suau
- Fons blanc o transparent
- Sense gradients
- Sense ombres
- Sense textures
- Sense efectes tech
- Sense estetica SaaS generica
- No infantil, no caricaturesc
- To visual: professional, tranquil, madur, de criteri

Contingut de les imatges

- No mostris pantalles, interficies ni botons reals
- Representa processos, maneres de treballar, ordre al llarg del temps, criteri, calma, preparacio i continuitat
- Si hi ha persones, que siguin reals i treballant amb informacio, sense detalls facials
- Les imatges han de funcionar soles, sense necessitat d'explicacio llarga

Text dins la imatge

- Evita text sempre que sigui possible
- Si hi ha text, ha de ser molt breu
- El text, si n'hi ha, ha d'estar en espanol
- Tipografia manuscrita o neutra
- Mai decoratiu

Nom del fitxer

- Has de proposar explicitament un nom final de fitxer
- Prefix segons us: web_, social_, brand_, app_
- Format: [prefix]_[idea_clara_en_castella_sense_accents].png
- No utilitzis noms generics com image1.png o illustration.png

Resultat esperat

- Cada imatge ha de ser coherent amb totes les anteriors
- Ha de poder-se reutilitzar en diferents contextos
- No ha de caducar rapidament
- Ha de transmetre confianca, ordre i criteri sense dir-ho explicitament

Us

Quan rebis una peticio concreta, interpreta-la dins d'aquest marc, sense reinventar estil ni to.
```

- [ ] **Step 3: Mirror the prompt base and contract rules into docs**

Create docs/brand/prompts/blog-cover-base.md and docs/brand/contracts/blog-cover.md:

```md
# Blog Cover Base Prompt

Runtime source: config/blog-image-prompt-base.txt

This document mirrors the canonical prompt base in readable form.
If this file and the runtime text file ever diverge, the text file wins until the mismatch is corrected in the same change.
```

```md
# Blog Cover Contract

## Mandatory inputs

- canonical prompt base
- thematic preset
- post title, excerpt, and support content
- approved reference images
- exact aspect ratio
- target resolution

## Mandatory output qualities

- panoramic composition
- continuity with the approved reference library
- restrained blue accents only
- no literal UI
- premium cover quality, reusable, stable

## Premium review gate

Reject the output if any of these appear:

- clipart feel
- generic SaaS look
- overfilled composition
- empty unfinished composition
- text-heavy image
- interface-like framing
```

- [ ] **Step 4: Register the approved references and initialize brand memory**

Create docs/brand/references/approved.md, docs/brand/references/rejected.md, docs/brand/memory/brand-memory.json, and docs/brand/memory/brand-memory.md:

```md
# Approved Reference Images

## Initial approved set

1. public/visuals/web/web_divideix_remeses_ca.webp
   Reason: stable horizontal composition, process visibility, restrained blue accents.

2. public/visuals/web/web_concilia_bancaria_ca.webp
   Reason: stable operational calm, strong left-to-right reading, good spatial air.
```

```md
# Rejected References

No rejected references registered yet.
Add an entry here only after review and include the exact rejection reason.
```

```json
{
  "version": 1,
  "entries": []
}
```

```md
# Brand Memory

This file explains the machine-readable memory in brand-memory.json.
Only approved outputs may be recorded there.
```

- [ ] **Step 5: Run docs validation on the new brand layer**

Run:

```bash
node scripts/validate-docs.mjs \
  docs/brand/brand-canon.md \
  docs/brand/contracts/blog-cover.md \
  docs/brand/prompts/blog-cover-base.md \
  docs/brand/references/approved.md \
  docs/brand/references/rejected.md \
  docs/brand/memory/brand-memory.md
```

Expected: `DOCS_CHECK_OK`

- [ ] **Step 6: Commit the docs foundation**

Run:

```bash
git add config/blog-image-prompt-base.txt docs/brand
git commit -m "docs(brand): canonitza blog-cover i referencies" -m "que canvia: afegeix el canon de marca, el contracte de blog cover i la memoria inicial de referencies aprovades."
```

### Task 2: Port deterministic blog-cover preset resolution

**Files:**

- Create: src/lib/editorial-native/cover-plan.ts
- Test: src/lib/__tests__/editorial-native-cover-plan.test.ts

- [ ] **Step 1: Write the failing preset-resolution test**

Create src/lib/__tests__/editorial-native-cover-plan.test.ts:

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveNativeBlogCoverPlan } from '@/lib/editorial-native/cover-plan'
import type { NativeBlogPost } from '@/lib/editorial-native/types'

function buildPost(overrides: Partial<NativeBlogPost['draft']> = {}): NativeBlogPost {
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
      ...overrides,
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

test('resolveNativeBlogCoverPlan picks the receipt_returns preset and approved references', () => {
  const plan = resolveNativeBlogCoverPlan(buildPost())

  assert.equal(plan.preset.id, 'receipt_returns')
  assert.equal(plan.filename, 'web_devolucion_recibos_estado_real.png')
  assert.deepEqual(plan.referenceNames, ['web_divideix_remeses_ca.webp', 'web_concilia_bancaria_ca.webp'])
  assert.ok(plan.referencePaths.some((value) => value.endsWith('web_divideix_remeses_ca.webp')))
  assert.ok(plan.referencePaths.some((value) => value.endsWith('web_concilia_bancaria_ca.webp')))
})

test('resolveNativeBlogCoverPlan falls back to a generic operational filename when no preset matches', () => {
  const plan = resolveNativeBlogCoverPlan(
    buildPost({
      title: 'Ordenar processos interns',
      excerpt: 'Calma operativa i criteri compartit.',
      contentMarkdown: 'Treball intern sense paraules clau fiscals o de remeses.',
    })
  )

  assert.equal(plan.preset.id, 'generic_operational')
  assert.equal(plan.filename.startsWith('web_'), true)
})
```

- [ ] **Step 2: Run the isolated test and confirm it fails**

Run:

```bash
node --import tsx --test src/lib/__tests__/editorial-native-cover-plan.test.ts
```

Expected: FAIL because src/lib/editorial-native/cover-plan.ts does not exist yet.

- [ ] **Step 3: Implement the preset resolver**

Create src/lib/editorial-native/cover-plan.ts by porting the validated preset logic from the editorial precedent. Keep this public surface:

```ts
export type NativeBlogCoverPreset = {
  id:
    | 'stripe_identification'
    | 'receipt_returns'
    | 'remittances_split'
    | 'bank_reconciliation'
    | 'certificates_182'
    | 'fiscal_closure'
    | 'operational_criteria'
    | 'generic_operational'
  filename: string
  sceneDirection: string
  referenceNames: string[]
}

export type NativeBlogCoverPlan = {
  preset: NativeBlogCoverPreset
  filename: string
  sceneDirection: string
  referenceNames: string[]
  referencePaths: string[]
}

export function resolveNativeBlogCoverPlan(
  post: NativeBlogPost,
  env: NodeJS.ProcessEnv = process.env,
): NativeBlogCoverPlan
```

Implementation requirements:

- use public/visuals/web as the default reference library
- preserve the approved preset IDs, filenames, sceneDirection values, and referenceNames from the validated editorial branch
- use keyword-weight ranking, then fallback to generic_operational
- sanitize fallback filenames to web_<slug-like>.png
- filter reference paths to existing files only

- [ ] **Step 4: Run the isolated test and confirm it passes**

Run:

```bash
node --import tsx --test src/lib/__tests__/editorial-native-cover-plan.test.ts
```

Expected: PASS

- [ ] **Step 5: Commit the preset resolver**

Run:

```bash
git add src/lib/editorial-native/cover-plan.ts src/lib/__tests__/editorial-native-cover-plan.test.ts
git commit -m "feat(brand): afegeix cover-plan deterministic" -m "que canvia: porta la resolucio de presets i referencies aprovades per a portades de blog."
```

### Task 3: Port the prompt builder and provider selection into the editorial runtime

**Files:**

- Modify: src/lib/editorial-native/cover.ts
- Test: src/lib/__tests__/editorial-native-cover-prompt.test.ts

- [ ] **Step 1: Write the failing prompt-builder test**

Create src/lib/__tests__/editorial-native-cover-prompt.test.ts:

```ts
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
  assert.match(prompt, /web_devolucion_recibos_estado_real\\.png/)
  assert.match(prompt, /Format final desitjat: 16:9/)
  assert.match(prompt, /Resolucio objectiu: 2K/)
})

test('resolveNativeBlogCoverProviders prefers nano banana when the wrapper exists', async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'summa-brand-wrapper-'))
  const wrapperFile = path.join(tempDir, 'generate_cover.py')
  await writeFile(wrapperFile, '#!/usr/bin/env python3\\n')

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
```

- [ ] **Step 2: Run the isolated test and confirm it fails**

Run:

```bash
node --import tsx --test src/lib/__tests__/editorial-native-cover-prompt.test.ts
```

Expected: FAIL because cover.ts does not expose the tested contract yet.

- [ ] **Step 3: Update cover.ts to port the approved prompt-builder contract**

Modify src/lib/editorial-native/cover.ts so it exports these pure helpers:

```ts
export type NativeBlogCoverProvider = 'nano_banana' | 'gemini' | 'fallback'

export function buildNativeBlogImagePrompt(
  post: NativeBlogPost,
  env: NodeJS.ProcessEnv = process.env,
): string

export function resolveNativeBlogCoverProviders(
  env: NodeJS.ProcessEnv = process.env,
): NativeBlogCoverProvider[]

export function resolveNativeBlogImageReferences(
  post: NativeBlogPost,
  env: NodeJS.ProcessEnv = process.env,
): string[]
```

Implementation requirements:

- keep the existing fallback SVG path untouched
- load the prompt base from config/blog-image-prompt-base.txt by default
- use the plan from resolveNativeBlogCoverPlan(post)
- include exact sections:
  - Composicio especifica d'aquesta generacio
  - Direccio d'art
  - Context del post
  - Sortida
- keep Nano Banana first when the wrapper path exists
- keep Gemini second only when an API key exists
- always keep fallback last

- [ ] **Step 4: Update runtime generation flow to use provider order**

Still inside src/lib/editorial-native/cover.ts, refactor generateNativeBlogCover so the runtime order becomes:

1. Nano Banana wrapper, if present
2. existing Gemini interactions API
3. existing SVG fallback

Use this orchestration shape:

```ts
for (const provider of resolveNativeBlogCoverProviders()) {
  if (provider === 'nano_banana') {
    // call wrapper, upload result, return generated
  }
  if (provider === 'gemini') {
    // keep current interactions API path
  }
}

// final fallback svg
```

Do not change public return shape or upload behavior.

- [ ] **Step 5: Run the isolated prompt/provider test**

Run:

```bash
node --import tsx --test src/lib/__tests__/editorial-native-cover-prompt.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit the prompt-builder and provider runtime**

Run:

```bash
git add src/lib/editorial-native/cover.ts src/lib/__tests__/editorial-native-cover-prompt.test.ts
git commit -m "feat(brand): integra prompt builder de blog cover" -m "que canvia: porta el canon de prompt i l'ordre de proveidors al runtime editorial."
```

### Task 4: Add the Nano Banana wrapper and fix the aspect-ratio drift

**Files:**

- Create: scripts/editorial/generate_cover.py
- Modify: src/lib/editorial-native/cover.ts

- [ ] **Step 1: Write a manual smoke harness that proves the current drift**

In a temp directory, create this fake downstream script and prompt file:

```python
#!/usr/bin/env python3
import json
import sys
from pathlib import Path

Path(sys.argv[sys.argv.index("--filename") + 1]).write_text(json.dumps(sys.argv), encoding="utf-8")
```

Run this smoke command against the wrapper after it exists:

```bash
tmpdir="$(mktemp -d)"
cat > "$tmpdir/fake_nano.py" <<'PY'
#!/usr/bin/env python3
import json
import sys
from pathlib import Path

Path(sys.argv[sys.argv.index("--filename") + 1]).write_text(json.dumps(sys.argv), encoding="utf-8")
PY
chmod +x "$tmpdir/fake_nano.py"
cat > "$tmpdir/prompt.txt" <<'EOF'
PROMPT TEST
EOF

BLOG_IMAGE_NANO_BANANA_SCRIPT="$tmpdir/fake_nano.py" \
python3 scripts/editorial/generate_cover.py \
  --prompt-file "$tmpdir/prompt.txt" \
  --filename "$tmpdir/out.json" \
  --aspect-ratio 16:9 \
  --resolution 2K \
  --input-image public/visuals/web/web_divideix_remeses_ca.webp

cat "$tmpdir/out.json"
```

Expected before the fix: output does not contain `--aspect-ratio`.

- [ ] **Step 2: Create the wrapper script**

Create scripts/editorial/generate_cover.py from the validated precedent, but include the missing aspect-ratio forwarding:

```python
#!/usr/bin/env python3
import argparse
import os
import shutil
import subprocess
import sys


def resolve_nano_banana() -> str:
    from_env = os.environ.get("BLOG_IMAGE_NANO_BANANA_SCRIPT", "").strip()
    if from_env and os.path.exists(from_env):
        return from_env
    return os.path.expanduser(
        "~/.openclaw/lib/node_modules/openclaw/skills/nano-banana-pro/scripts/generate_image.py"
    )


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt-file", required=True)
    parser.add_argument("--filename", required=True)
    parser.add_argument("--aspect-ratio", "-a", default="16:9")
    parser.add_argument("--resolution", default="2K")
    parser.add_argument("--api-key", default=None)
    parser.add_argument("--input-image", action="append", dest="input_images", default=[])
    args = parser.parse_args()

    with open(args.prompt_file, "r", encoding="utf-8") as handle:
        prompt = handle.read().strip()

    runner = ["uv", "run"] if shutil.which("uv") else [sys.executable or "python3"]
    cmd = runner + [
        resolve_nano_banana(),
        "--prompt",
        prompt,
        "--filename",
        args.filename,
        "--aspect-ratio",
        args.aspect_ratio,
        "--resolution",
        args.resolution,
    ]
    if args.api_key:
      cmd += ["--api-key", args.api_key]
    for input_image in args.input_images:
      cmd += ["--input-image", input_image]

    result = subprocess.run(cmd, env=os.environ)
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 3: Teach cover.ts to call the wrapper safely**

In src/lib/editorial-native/cover.ts, add a Nano Banana execution path with these rules:

```ts
const DEFAULT_NANO_BANANA_WRAPPER = path.join(process.cwd(), 'scripts', 'editorial', 'generate_cover.py')

function getNanoBananaWrapperPath(env: NodeJS.ProcessEnv = process.env): string {
  return env.BLOG_IMAGE_NANO_BANANA_WRAPPER?.trim() || DEFAULT_NANO_BANANA_WRAPPER
}
```

Execution requirements:

- write the built prompt to a temp file
- call python3 or uv run on scripts/editorial/generate_cover.py
- pass prompt-file, filename, aspect-ratio, resolution, api-key, and one flag per input image
- read the generated image file, then upload through handleBlogCoverUpload
- clean temp files in finally blocks
- if the wrapper path is missing or the subprocess fails, fall through to Gemini or fallback instead of crashing the publish flow

- [ ] **Step 4: Re-run the smoke harness and verify the fix**

Run the same smoke command from Step 1.

Expected after the fix: output contains both `--aspect-ratio` and `16:9`.

- [ ] **Step 5: Commit the wrapper contract fix**

Run:

```bash
git add scripts/editorial/generate_cover.py src/lib/editorial-native/cover.ts
git commit -m "fix(brand): alinea wrapper i runtime de cover" -m "que canvia: afegeix el wrapper nano banana i reenvia l'aspect-ratio fins al motor final."
```

### Task 5: Final verification, docs sync, and clean handoff

**Files:**

- Modify as needed: docs/brand/execution/blog-cover.md
- Modify as needed: docs/brand/memory/brand-memory.md

- [ ] **Step 1: Write the execution contract document**

Create docs/brand/execution/blog-cover.md:

```md
# Blog Cover Execution Contract

## Runtime order

1. Nano Banana wrapper
2. Gemini image API
3. SVG fallback

## Wrapper CLI contract

Required flag order:

1. --prompt-file
2. --filename
3. --aspect-ratio
4. --resolution
5. --api-key
6. --input-image (repeatable)

## Final engine contract

The wrapper must forward:

- --prompt
- --filename
- --aspect-ratio
- --resolution
- --api-key when present
- every --input-image

## Failure policy

- Wrapper failure must not break the editorial flow.
- Runtime falls back to Gemini, then SVG fallback.
```

- [ ] **Step 2: Record the empty-but-valid memory policy**

Append this section to docs/brand/memory/brand-memory.md:

```md
## Entry policy

Each approved entry must include:

- asset id
- channel
- final prompt
- reference images used
- output path or URL
- approval rationale
- inheritance notes for future pieces
```

- [ ] **Step 3: Run focused verification**

Run:

```bash
node --import tsx --test \
  src/lib/__tests__/editorial-native-cover-plan.test.ts \
  src/lib/__tests__/editorial-native-cover-prompt.test.ts

node scripts/validate-docs.mjs \
  docs/brand/brand-canon.md \
  docs/brand/contracts/blog-cover.md \
  docs/brand/execution/blog-cover.md \
  docs/brand/prompts/blog-cover-base.md \
  docs/brand/references/approved.md \
  docs/brand/references/rejected.md \
  docs/brand/memory/brand-memory.md \
  docs/superpowers/plans/2026-04-18-summa-brand-foundation-plan.md
```

Expected:

- all focused editorial-brand tests pass
- `DOCS_CHECK_OK`

- [ ] **Step 4: Run the branch baseline that is relevant and record the known external blocker**

Run:

```bash
npm run test:node
npm run i18n:check
```

Expected:

- `npm run test:node` passes
- `npm run i18n:check` may still fail on the already-known missing dialogs.stripeImputation.* keys in ES/FR/PT, which is baseline debt outside this brand scope

- [ ] **Step 5: Commit the handoff docs**

Run:

```bash
git add docs/brand/execution/blog-cover.md docs/brand/memory/brand-memory.md docs/superpowers/plans/2026-04-18-summa-brand-foundation-plan.md
git commit -m "docs(brand): tanca contracte d'execucio de blog cover" -m "que canvia: documenta el runtime real, la politica de memoria i el pla d'implementacio de la fase 1."
```

## Spec coverage check

- Brand canon: covered by Task 1
- Blog-cover contract and approved references: covered by Task 1 and Task 5
- Prompt registry and canonical base: covered by Task 1 and Task 3
- Deterministic preset selection: covered by Task 2
- Execution contract and aspect-ratio drift fix: covered by Task 4 and Task 5
- Approval memory policy: covered by Task 1 and Task 5
- Isolation from core: enforced by file scope throughout the plan

## Deferred follow-up plan

After this plan lands and is reviewed, create a second plan for:

- importing or stabilizing video-studio/hyperframes
- defining docs/brand/contracts/short-video.md
- defining docs/brand/execution/short-video.md
- producing one approved short-video pilot
- recording the pilot in brand memory
