# Summa Social HyperFrames Design Contract

## Repo documents used
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

## Identity to preserve
- Calm, predictable, trustworthy.
- Dense but serene.
- Product-first, not campaign-first.
- Video should feel like an extension of the product and landings, not a separate promo language.

## Visual system
- Majority surface: light neutral backgrounds and soft gray cards.
- Blue appears only when the viewer must identify the next action.
- Green and amber stay semantic. They are never decorative.
- Typography remains a neutral UI sans because the repo does not lock a video-only font family.

## Reusable structure
- The base sequence is fixed in `compositions/components/summa-sequence.html`.
- Scene order is fixed: `scene-hook` -> `scene-problem` -> `scene-solution` -> `scene-outcome`.
- Timing is fixed at 3 seconds per scene for a 12-second piece.
- Each scene carries one main idea only.
- Each scene may have one overlay at most.

## Reusable overlays
- `compositions/components/summa-caption.html`
  - Discreet caption rail
  - Base-aligned
  - 1 to 2 lines max
  - No heavy box
- `compositions/components/summa-lower-third.html`
  - Operational explanation only
  - Neutral shell
  - Blue reserved for the highlighted action phrase

## Density rule
- If a scene cannot be read in one pass, it is too dense.
- Captions cannot compete with lower thirds.
- The final scene must read faster than it looks.

## Explicitly not defined by the repo
- A mandatory social CTA shell
- A mandatory intro/outro block for every short piece
- A separate motion-brand system for short-form video
