# Summa Social HyperFrames — Script Base

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

## Objective
Build short operational videos that make the product easier to understand and easier to trust.

## Piece types
- Functional feature demo
- Queue or workflow explainer
- Short teaser derived from the same product language

## Fixed editorial structure
- `hook`
- `problem`
- `solution`
- `outcome`

This structure is fixed because the current reusable system in
`compositions/components/summa-sequence.html` is authored around those four
beats.

## Timing baseline
- Default piece length: `12s`
- `hook`: `0-3s`
- `problem`: `3-6s`
- `solution`: `6-9s`
- `outcome`: `9-12s`

## Density limits
- One main idea per scene
- Maximum one overlay per scene
- Caption and lower third must never compete
- If a scene cannot be read in one pass, rewrite the copy

## Tone
- Sober
- Operational
- Clear
- Mature
- No commercial hype

## Copy rules
- Product-first, not campaign-first
- Show state, action, and outcome in plain language
- Use blue only when the viewer must identify the next action
- Keep captions short enough to read without pausing

## Use with the rest of the studio
- `SCRIPT.md` defines the editorial skeleton
- `STORYBOARD.md` maps that skeleton to concrete compositions
- `transcripts/base-transcript.json` gives a stable structured text source
- `HANDOFF.md` records constraints, risks, and repeatable operating steps
