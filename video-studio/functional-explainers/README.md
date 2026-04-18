# Functional Explainers

Canonical product-led video masters live here.

## Role

- This folder is the master-path entrypoint for `functional-explainer` work.
- HyperFrames under `../hyperframes` is the consumer runtime for rendering, previews, and experimental or derived compositions.
- `05-devolucions-estat-real-16x9` stays research-only.

## Operational flow

1. Start from the approved brief and storyboard.
2. Use approved real-capture evidence and the capture registry.
3. Generate an edit-ready proxy when the downstream cut needs reframing.
4. Build the master composition contract.
5. Render verify before approval.
6. Derive any secondary cuts after the master is approved.

## What belongs here

- Master-path briefs
- Storyboards
- Capture registry references
- Master template contracts
- Approval and verification notes

## CLI

- `npm run video:explainers:list`
- `npm run video:explainer:render -- importacio-extracte-conciliacio`
- `npm run video:explainer:render -- importacio-extracte-conciliacio --skip-recording`

`--skip-recording` is the fast path when the base capture already exists and only the postproduction layer changes.
If the manifest declares `editProxyPath` and `editAssetPath`, the render command also prepares the explainer-edit proxy automatically.
