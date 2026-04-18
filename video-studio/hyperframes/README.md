# Summa Social HyperFrames

## Source docs used from this repo
- `docs/design/00-design-contract.md`
- `docs/design/01-color-system.md`
- `docs/design/03-data-interfaces.md`
- `docs/design/04-ui-readiness.md`
- `docs/EDITORIAL-STYLE-SUMMA.md`
- `docs/operations/DEMO-GRAVACIONS-PLAYBOOK.md`
- `docs/operations/VIDEO-FIRST-BATCH-REVIEW-2026-03-28.md`
- `docs/operations/demo-storyboards/bank-reconciliation-landing.md`
- `docs/operations/demo-storyboards/donations-control-landing.md`
- `scripts/demo/video-storyboards/bank-reconciliation-landing.mjs`
- `scripts/demo/video-storyboards/donations-control-landing.mjs`
- `src/app/globals.css`
- `public/brand/video/README.md`
- `public/brand/summa-logo-full-transparent-inter.png`

## Prerequisites
- Node.js 22+
- FFmpeg on `PATH`
- `npx hyperframes`
- HyperFrames skills available to the agent

## Skills
- Global agent install verified during setup
- Check with `npx skills list -g --json`
- Prompt agents with `/hyperframes`

## Preview
- `npm run video:preview`
- Specific piece without editing `index.html`:
  - `npm run video:preview:piece -- 05-devolucions-estat-real-16x9`

## Render
- Default render: `npm run video:render`
- The repo keeps only the official CLI path: `npx hyperframes render --output output.mp4`
- Specific piece to a custom output without mutating the studio root:
  - `npm run video:render:piece -- 05-devolucions-estat-real-16x9 --output /tmp/summa-05.mp4`

## Piece discovery and tests
- List renderable pieces:
  - `npm run video:list`
- Runtime helper tests:
  - `npm run video:test`

## Lint and validate
- `npm run video:lint`
- `npm run video:validate`

## Fixed system
- Every piece uses the same four-scene order: hook, problem, solution, outcome.
- Only one main idea enters each scene.
- Only one overlay may sit on top of a scene.
- `compositions/components/summa-sequence.html` is the reusable scene skeleton.
- `compositions/components/summa-caption.html` is the reusable caption system.
- `compositions/components/summa-lower-third.html` is the reusable lower-third system.
- Caption components expose `data-timeline-role="captions"` and `data-caption-root="true"` for caption discovery.
- Lower thirds explain action only. They do not carry branding.
- Blue is reserved for action. Semantic states stay neutral, amber, or green.
- No intro/outro block is added unless the repo defines one for the piece.

## What may vary
- Copy inside each scene
- Which state chip appears in each scene
- Whether the layout is `landscape` or `portrait`
- The action sentence inside the lower third
- The short caption lines, as long as they stay 1 to 2 lines and readable without pause

## Composition rules that must not be broken
- Keep the video product-led, sober, and light.
- Do not add decorative motion.
- Do not turn captions into auto-subtitle styling.
- Do not add more than one overlay per scene.
- Do not introduce extra accent colors outside the semantic system.

## Assets
- Studio-local assets live in `assets/`
- The current starter wordmark comes from the approved repo asset copied from `public/brand/`
- Brand intro/outro videos remain in `../../public/brand/video/`

## Current pilot
- `compositions/05-devolucions-estat-real-16x9.html`

## Prompt examples
- `prompts/05-devolucions-estat-real-16x9.md`

## Documents de producció
- `SCRIPT.md`
  - Editorial base for the studio: objective, piece types, fixed sequence, tone, and density rules
- `STORYBOARD.md`
  - Scene-by-scene working map for the active compositions, including overlays and operational action copy
- `HANDOFF.md`
  - Current state, reusable pieces, risks, limitations, and repeatable operating steps for another agent
Use these documents together with:
- `compositions/`
  - Source of truth for timing and visuals
- `prompts/`
  - Agent entrypoint for generating or revising compositions under the current system
- `npm run video:render`
  - Final check that the documented production layer has not changed the renderable studio
- `npm run video:render:piece -- <composition-id> --output <file>`
  - Safe per-piece render flow without editing the committed root entry
