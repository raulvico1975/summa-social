# Functional Explainers

Canonical product-led video masters live here.

## Role

- This folder is the master-path entrypoint for `functional-explainer` work.
- HyperFrames under `../hyperframes` is the runtime for rendering, previews, and future product-film compositions.
- The reusable production chain is `approved brief -> real capture -> proof-first master -> product film -> delivery cuts`.

## Operational flow

1. Start from the approved brief and storyboard.
2. Use approved real-capture evidence and the capture registry.
3. Build the proof-first master.
4. Render verify before approval.
5. Generate proxy artifacts only as working material for downstream editorial use.
6. Derive product-film and delivery cuts only after the master is approved.

## What belongs here

- Master-path briefs
- Storyboards
- Capture registry references
- Proof-first template contracts
- Approval and verification notes
- Manifest `notes` that keep proof and delivery rules close to the piece

## CLI

- `npm run video:explainers:list`
- `npm run video:explainer:render -- importacio-extracte-conciliacio`
- `npm run video:explainer:render -- importacio-extracte-conciliacio --skip-recording`

`--skip-recording` is the fast path when the base capture already exists and only the postproduction layer changes.
If the manifest declares proxy artifacts, they are treated as working outputs only and stay separate from the approved master.
