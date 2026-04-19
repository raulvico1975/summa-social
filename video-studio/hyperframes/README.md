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

## Canonical video path
- `video-studio/functional-explainers` is the canonical proof-first master path.
- HyperFrames is the runtime for previews, renders, and future product-film compositions.
- The canonical flow is `brief -> capture set -> proof-first master -> product film -> delivery cuts`.
- There is still no approved premium film in this folder.
- `07-importacio-extracte-product-film-16x9` is the current premium candidate baseline.
- `06-importacio-extracte-editorial-16x9` remains only as a technical sandbox for real capture + proxy + reframing.

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
  - `npm run video:preview:piece -- 07-importacio-extracte-product-film-16x9`

## Render
- Default render: `npm run video:render`
- The repo keeps only the official CLI path: `npx hyperframes render --output output.mp4`
- Specific piece to a custom output without mutating the studio root:
  - `npm run video:render:piece -- 07-importacio-extracte-product-film-16x9 --output /tmp/summa-07.mp4`
- Specific piece with web delivery quality from source:
  - `npm run video:render:piece -- 07-importacio-extracte-product-film-16x9 --profile web-premium --output /tmp/summa-07.web.mp4`
- Safe preview uses the same temporary runtime and cleans it up on exit:
  - `npm run video:preview:piece -- 07-importacio-extracte-product-film-16x9`
- `web-premium` expands to a stable encoder profile for UI-heavy videos and should be the default for website-facing delivery renders.

## Piece discovery and tests
- List renderable pieces:
  - `npm run video:list`
- Runtime helper tests:
  - `npm run video:test`

## Lint and validate
- `npm run video:lint`
- `npm run video:validate`

## What the studio still owns
- safe runtime isolation through temporary render projects
- per-piece preview and render wrappers
- delivery profiles such as `web-premium`
- lint and validate checks for authored compositions

## What the studio no longer owns
- the upstream proof contract
- a fixed short-video grammar
- captions or lower-thirds as a mandatory system
- a poster-like product video layout

## Assets
- Studio-local assets live in `assets/`
- The current starter wordmark comes from the approved repo asset copied from `public/brand/`
- Brand intro/outro videos remain in `../../public/brand/video/`

## Current direction
- `07-importacio-extracte-product-film-16x9` is the current candidate for the first approved premium product film.
- `06` should not be continued as public film language.
- Briefs and capture registries remain upstream truth.
- HyperFrames should only consume that truth.

## Prompt examples
- `prompts/06-importacio-extracte-editorial-16x9.md`
- `prompts/07-importacio-extracte-product-film-16x9.md`

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
  - Product-film template contracts, shot language, and review gate
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
