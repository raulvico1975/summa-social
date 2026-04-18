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

## Canonical explainer path
- `video-studio/functional-explainers` is the canonical master path for feature explainers.
- HyperFrames is the consumer runtime for previews, renders, derived cuts, and experimental compositions.
- The canonical flow is `brief -> storyboard -> real captures -> master contract -> render verification -> derived composition`.
- `05-devolucions-estat-real-16x9` stays available as research, but it is not the approved template source.
- If a future explainer needs different proof, the right fix is to add captures, not to normalize a research draft.

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
- The current research scaffold uses a four-scene order: hook, problem, solution, outcome.
- The canonical explainer system keeps one main idea per scene and one proof layer at a time.
- `compositions/components/summa-sequence.html` is a reusable scene skeleton for research and early master work, not a canonical source of truth.
- `compositions/components/summa-caption.html` and `compositions/components/summa-lower-third.html` remain available, but they are optional tools, not mandatory layers.
- Blue is reserved for action. Semantic states stay neutral, amber, or green.
- No intro/outro block is added unless the brief or template explicitly defines one.

## What may vary
- Copy inside each scene
- Which state chip appears in each scene
- Whether the layout is `landscape` or `portrait`
- Whether the piece uses captions or lower thirds at all
- The action sentence inside the lower third when that layer is explicitly justified

## Composition rules that must not be broken
- Keep the video product-led, sober, and light.
- Do not add decorative motion.
- Do not turn captions into auto-subtitle styling.
- Do not add more than one competing overlay per scene.
- Do not introduce extra accent colors outside the semantic system.

## Assets
- Studio-local assets live in `assets/`
- The current starter wordmark comes from the approved repo asset copied from `public/brand/`
- Brand intro/outro videos remain in `../../public/brand/video/`

## Current pilot
- `compositions/05-devolucions-estat-real-16x9.html`
- Research-only. This piece is useful for study, but it is not the canonical explainer pattern.

## Current master direction
- The first canonical master should be authored through `video-studio/functional-explainers` from `briefs/importacio-extracte-conciliacio.md` plus the matching capture registry.
- HyperFrames should treat that path as upstream once the first approved master composition exists.

## Prompt examples
- `prompts/05-devolucions-estat-real-16x9.md`

## Documents de producció
- `../functional-explainers/`
  - Canonical master-path entrypoint for briefs, storyboards, capture references, and approval notes
- `briefs/`
  - Working briefs for canonical explainers
- `captures-registry/`
  - Real capture metadata used as proof in explainers
- `shots/`
  - Reusable shot-level building blocks
- `templates/`
  - Master and derived template contracts
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
