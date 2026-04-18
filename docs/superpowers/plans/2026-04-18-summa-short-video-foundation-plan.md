# Summa Short Video Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import a clean HyperFrames studio into the isolated brand branch, define the canonical `short-video` contract under `docs/brand`, and produce one first pilot piece about receipt returns that can be reviewed as a premium Summa Social marketing video.

**Architecture:** `docs/brand` remains the canonical source of truth. The HyperFrames studio is only a consumer runtime under `video-studio/hyperframes`, with generated artifacts ignored. The first pilot is intentionally narrow: one 16:9 piece, one operational problem, one review gate tied to the Baruma-style client persona feedback already gathered.

**Tech Stack:** Markdown docs, HyperFrames HTML compositions, GSAP, Node.js scripts, existing `video:list` / `video:render:piece` / `video:test` tooling from the local prototype.

---

## Scope split

This plan covers:

- curated import of the HyperFrames studio into the isolated brand worktree
- a canonical `short-video` contract and execution contract in `docs/brand`
- one first pilot composition: `05-devolucions-estat-real-16x9`
- focused render/validation of that pilot

This plan does not cover:

- a 9:16 version of the pilot
- voiceover, soundtrack, or subtitle automation
- publishing the video publicly
- writing an approved `brand-memory` entry before human review

## Client acceptance gate

The pilot should only be considered ready for review if it satisfies all of these:

- it is about one real operational problem only
- it reads as a tool for a Catalan social entity, not generic SaaS
- it keeps the same family as the approved blog-cover references
- it is sober, concrete, and understandable without product jargon
- it explains what gets controlled, simplified, or avoided

Reject the pilot if any of these appear:

- startup-generic visual language
- techy polish disconnected from real administrative work
- vague icons instead of recognizable process clues
- English or non-sector phrasing
- overexplained copy that needs pausing to read

## File structure

New files in this plan:

- docs/brand/contracts/short-video.md
- docs/brand/execution/short-video.md
- docs/brand/prompts/examples/short-video-devolucions-estat-real.md
- video-studio/hyperframes/.gitignore
- video-studio/hyperframes/package.json
- video-studio/hyperframes/hyperframes.json
- video-studio/hyperframes/index.html
- video-studio/hyperframes/README.md
- video-studio/hyperframes/DESIGN.md
- video-studio/hyperframes/HANDOFF.md
- video-studio/hyperframes/SCRIPT.md
- video-studio/hyperframes/STORYBOARD.md
- video-studio/hyperframes/assets/summa-logo-wordmark.png
- video-studio/hyperframes/compositions/components/summa-sequence.html
- video-studio/hyperframes/compositions/components/summa-caption.html
- video-studio/hyperframes/compositions/components/summa-lower-third.html
- video-studio/hyperframes/compositions/05-devolucions-estat-real-16x9.html
- video-studio/hyperframes/prompts/05-devolucions-estat-real-16x9.md
- video-studio/hyperframes/scripts/list-pieces.mjs
- video-studio/hyperframes/scripts/preview-piece.mjs
- video-studio/hyperframes/scripts/project-runtime.mjs
- video-studio/hyperframes/scripts/render-piece.mjs
- video-studio/hyperframes/scripts/__tests__/project-runtime.test.mjs

Existing files to modify:

- docs/brand/memory/brand-memory.md

Reasoning:

- the future docs/brand/contracts/short-video.md defines what the channel is allowed to be
- the future docs/brand/execution/short-video.md explains how the runtime is actually used
- `video-studio/hyperframes/.gitignore` prevents renders and thumbnails from dirtying the branch
- the imported studio remains separated from product code and only consumes the brand canon
- one pilot composition is enough to validate quality before multiplying formats

### Task 1: Import the clean HyperFrames studio source and ignore generated artifacts

**Files:**

- Create: video-studio/hyperframes/.gitignore
- Create: video-studio/hyperframes/package.json
- Create: video-studio/hyperframes/hyperframes.json
- Create: video-studio/hyperframes/index.html
- Create: video-studio/hyperframes/README.md
- Create: video-studio/hyperframes/DESIGN.md
- Create: video-studio/hyperframes/HANDOFF.md
- Create: video-studio/hyperframes/SCRIPT.md
- Create: video-studio/hyperframes/STORYBOARD.md
- Create: video-studio/hyperframes/assets/summa-logo-wordmark.png
- Create: video-studio/hyperframes/compositions/components/summa-sequence.html
- Create: video-studio/hyperframes/compositions/components/summa-caption.html
- Create: video-studio/hyperframes/compositions/components/summa-lower-third.html
- Create: video-studio/hyperframes/scripts/list-pieces.mjs
- Create: video-studio/hyperframes/scripts/preview-piece.mjs
- Create: video-studio/hyperframes/scripts/project-runtime.mjs
- Create: video-studio/hyperframes/scripts/render-piece.mjs
- Create: video-studio/hyperframes/scripts/__tests__/project-runtime.test.mjs

- [ ] **Step 1: Create the target directories and the local ignore file**

Create video-studio/hyperframes/.gitignore with this exact content:

```gitignore
.DS_Store
.thumbnails/
output.mp4
renders/
snapshots/
transcripts/
```

Create the directory tree:

```bash
mkdir -p \
  video-studio/hyperframes/assets \
  video-studio/hyperframes/compositions/components \
  video-studio/hyperframes/prompts \
  video-studio/hyperframes/scripts/__tests__
```

- [ ] **Step 2: Copy only the clean source files from the existing local prototype**

Run these exact copy commands from the isolated worktree:

```bash
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/package.json video-studio/hyperframes/package.json
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/hyperframes.json video-studio/hyperframes/hyperframes.json
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/index.html video-studio/hyperframes/index.html
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/README.md video-studio/hyperframes/README.md
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/DESIGN.md video-studio/hyperframes/DESIGN.md
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/HANDOFF.md video-studio/hyperframes/HANDOFF.md
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/SCRIPT.md video-studio/hyperframes/SCRIPT.md
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/STORYBOARD.md video-studio/hyperframes/STORYBOARD.md
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/assets/summa-logo-wordmark.png video-studio/hyperframes/assets/summa-logo-wordmark.png
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/compositions/components/summa-sequence.html video-studio/hyperframes/compositions/components/summa-sequence.html
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/compositions/components/summa-caption.html video-studio/hyperframes/compositions/components/summa-caption.html
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/compositions/components/summa-lower-third.html video-studio/hyperframes/compositions/components/summa-lower-third.html
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/scripts/list-pieces.mjs video-studio/hyperframes/scripts/list-pieces.mjs
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/scripts/preview-piece.mjs video-studio/hyperframes/scripts/preview-piece.mjs
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/scripts/project-runtime.mjs video-studio/hyperframes/scripts/project-runtime.mjs
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/scripts/render-piece.mjs video-studio/hyperframes/scripts/render-piece.mjs
cp /Users/raulvico/Documents/summa-social/video-studio/hyperframes/scripts/__tests__/project-runtime.test.mjs video-studio/hyperframes/scripts/__tests__/project-runtime.test.mjs
```

Do not copy any of these:

- `.thumbnails/`
- `renders/`
- `snapshots/`
- `output.mp4`
- `transcripts/`
- `.DS_Store`

- [ ] **Step 3: Run the imported studio verification**

Run:

```bash
npm --prefix video-studio/hyperframes run video:list
npm --prefix video-studio/hyperframes run video:test
```

Expected:

- `video:list` prints the imported compositions if any are present
- `video:test` passes for the imported runtime utilities

- [ ] **Step 4: Commit the studio import**

Run:

```bash
git add video-studio/hyperframes
git commit -m "feat(brand): importa estudi hyperframes" -m "que canvia: incorpora l'estudi de video amb fonts netes i ignora els artefactes generats."
```

### Task 2: Define the canonical short-video contract and execution contract

**Files:**

- Create: docs/brand/contracts/short-video.md
- Create: docs/brand/execution/short-video.md
- Modify: docs/brand/memory/brand-memory.md

- [ ] **Step 1: Write the short-video contract**

Create docs/brand/contracts/short-video.md with this exact structure:

```md
# Short Video Contract

## Channel purpose

Short video exists to explain one operational problem in a calm, premium, trustworthy way.
It is not a launch trailer, trend template, or generic SaaS ad.

## Mandatory inheritance from the brand canon

- same restrained black, white, and soft-blue logic
- same calm and mature operational tone
- no literal product UI dependency unless the contract is explicitly updated later
- no motion-first spectacle

## Mandatory structure

- one problem only
- one main idea per scene
- one clear reading path
- one reviewable promise: what gets controlled, simplified, or avoided

## First-format constraint

- first approved pilot must be 16:9
- duration target: 12 seconds
- scene order: hook -> problem -> solution -> outcome

## Rejection triggers

- generic SaaS look
- abstract icons without process meaning
- text density that requires pausing
- English or non-sector phrasing
- animation louder than the message
```

- [ ] **Step 2: Write the short-video execution contract**

Create docs/brand/execution/short-video.md:

```md
# Short Video Execution Contract

## Runtime

- HyperFrames HTML studio under video-studio/hyperframes
- render entrypoints through npm scripts only

## Allowed commands

- npm --prefix video-studio/hyperframes run video:list
- npm --prefix video-studio/hyperframes run video:test
- npm --prefix video-studio/hyperframes run video:lint
- npm --prefix video-studio/hyperframes run video:validate
- npm --prefix video-studio/hyperframes run video:render:piece -- <piece-id> --output <target>

## Artifact policy

- generated mp4 files must stay untracked
- thumbnails and snapshots must stay untracked
- only source html, scripts, prompts, and docs are committed

## Approval gate

The first reviewer is functional, not aesthetic:
the video must make sense to a person handling accounting and member management in a Catalan social entity.
```

- [ ] **Step 3: Record the short-video approval rule in brand memory docs**

Append this exact section to docs/brand/memory/brand-memory.md:

```md
## Short-video approval rule

A short-video candidate does not enter memory until a human review confirms:

- the problem is recognizable for a social entity
- the copy is understandable without product jargon
- the visual language remains within the approved Summa family
- the piece feels sober and credible, not promotional for its own sake
```

- [ ] **Step 4: Run docs validation**

Run:

```bash
node scripts/validate-docs.mjs \
  docs/brand/contracts/short-video.md \
  docs/brand/execution/short-video.md \
  docs/brand/memory/brand-memory.md
```

Expected: `DOCS_CHECK_OK`

- [ ] **Step 5: Commit the short-video docs**

Run:

```bash
git add docs/brand/contracts/short-video.md docs/brand/execution/short-video.md docs/brand/memory/brand-memory.md
git commit -m "docs(brand): defineix contracte short-video" -m "que canvia: afegeix el contracte de canal i el contracte d'execucio per a video curt."
```

### Task 3: Create the first pilot prompt and composition for receipt returns

**Files:**

- Create: video-studio/hyperframes/prompts/05-devolucions-estat-real-16x9.md
- Create: video-studio/hyperframes/compositions/05-devolucions-estat-real-16x9.html

- [ ] **Step 1: Write the pilot prompt file**

Create video-studio/hyperframes/prompts/05-devolucions-estat-real-16x9.md:

```md
# 05 — Devolucions Estat Real

## Problem to explain

When a receipt returns, the real problem is not retrying the charge first.
The real problem is not knowing what happened, which fee it belongs to, and what state it has now.

## Audience

Administrative and financial staff at social entities in Catalonia.

## Acceptance target

The piece must feel like:

- operational calm
- clear control
- credible administrative work

The piece must not feel like:

- startup promotion
- dashboard demo hype
- abstract management jargon
```

- [ ] **Step 2: Create the first pilot composition**

Create video-studio/hyperframes/compositions/05-devolucions-estat-real-16x9.html using the existing studio pattern. Reuse the same structure as the imported 16:9 pieces and set these key data attributes:

```html
data-hook-kicker="REBUTS TORNATS"
data-hook-title="Tornar no és el problema."
data-hook-body="El risc comença quan ningú sap a quina quota correspon ni quin estat té ara."
data-hook-chip="estat opac"
data-hook-tone="warning"

data-problem-kicker="PROBLEMA"
data-problem-title="Sense traçabilitat, tot acaba en intuïció."
data-problem-body="Banc, Excel i memòria humana competeixen si la devolució no tanca amb estat real."
data-problem-chip="massa context dispers"
data-problem-tone="warning"

data-solution-kicker="SOLUCIÓ"
data-solution-title="Cada devolució queda llegible."
data-solution-body="La revisió acaba amb quota, motiu i estat actual en una sola seqüència de treball."
data-solution-chip="criteri compartit"
data-solution-tone="action"

data-outcome-kicker="RESULTAT"
data-outcome-title="L'equip decideix, no interpreta."
data-outcome-body="La incidència deixa de ser soroll i passa a ser seguiment operatiu."
data-outcome-chip="llest per resoldre"
data-outcome-tone="success"
```

Use these overlay texts:

```html
data-hook-text="Una devolució ha de acabar amb estat real."
data-problem-text="Si ningú sap què ha passat, no hi ha control."
data-outcome-text="Serenitat també és control operatiu."
```

Use this lower-third content:

```html
data-label="Acció"
data-highlight="Tancar"
data-copy="cada devolució amb quota, motiu i estat abans de reintentar res."
```

- [ ] **Step 3: Run piece discovery and validation**

Run:

```bash
npm --prefix video-studio/hyperframes run video:list
npm --prefix video-studio/hyperframes run video:lint
npm --prefix video-studio/hyperframes run video:validate
```

Expected:

- the new `05-devolucions-estat-real-16x9` piece appears
- lint passes
- validate passes

- [ ] **Step 4: Commit the pilot source**

Run:

```bash
git add video-studio/hyperframes/compositions/05-devolucions-estat-real-16x9.html video-studio/hyperframes/prompts/05-devolucions-estat-real-16x9.md
git commit -m "feat(brand): afegeix pilot de devolucions" -m "que canvia: crea la primera peça de video curt centrada en devolucions amb criteri operatiu."
```

### Task 4: Render and prepare the first review package

**Files:**

- Create: docs/brand/prompts/examples/short-video-devolucions-estat-real.md

- [ ] **Step 1: Document the exact pilot brief for review**

Create docs/brand/prompts/examples/short-video-devolucions-estat-real.md:

```md
# Short Video Example — Devolucions Estat Real

## Piece id

05-devolucions-estat-real-16x9

## Channel

short-video

## Review question

Would a person carrying accounting and member management in a Catalan social entity understand this immediately and trust it?

## Expected yes/no logic

Yes if the piece reads as operational control.
No if the piece feels like generic software promotion.
```

- [ ] **Step 2: Render the pilot into an untracked output path**

Run:

```bash
mkdir -p video-studio/hyperframes/renders
npm --prefix video-studio/hyperframes run video:render:piece -- 05-devolucions-estat-real-16x9 --output video-studio/hyperframes/renders/05-devolucions-estat-real-16x9.mp4
```

Expected:

- render exits successfully
- the mp4 exists under an ignored path

- [ ] **Step 3: Verify the branch remains source-only**

Run:

```bash
git status --short
```

Expected:

- source files are tracked
- rendered mp4 stays untracked because of video-studio/hyperframes/.gitignore

- [ ] **Step 4: Commit the review package source**

Run:

```bash
git add docs/brand/prompts/examples/short-video-devolucions-estat-real.md video-studio/hyperframes/.gitignore
git commit -m "docs(brand): prepara paquet de review del pilot" -m "que canvia: documenta el brief del primer pilot i blinda els artefactes generats fora del control de versions."
```

## Spec coverage check

- import and isolate the HyperFrames studio: covered by Task 1
- define the short-video channel contract: covered by Task 2
- tie video to the same visual family as blog cover: covered by Task 2 and Task 3
- use one real operational problem only: covered by Task 3
- use a review gate compatible with a Baruma-style financial admin persona: covered by Client acceptance gate and Task 4

## Deferred follow-up plan

After this plan lands and the pilot is reviewed:

- derive a 9:16 version only if the 16:9 piece is approved
- add one second pilot on bank reconciliation
- write the first approved short-video entry into brand memory
