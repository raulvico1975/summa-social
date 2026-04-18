# Functional Explainers

Canonical product-led video masters live here.

## Role

- This folder is the master-path entrypoint for `functional-explainer` work.
- HyperFrames under `../hyperframes` is the consumer runtime for rendering, previews, and experimental or derived compositions.
- The reusable production chain is `approved brief -> storyboard -> real capture -> master render -> edit proxy -> explainer-edit`.
- `05-devolucions-estat-real-16x9` stays research-only.

## Operational flow

1. Start from the approved brief and storyboard.
2. Use approved real-capture evidence and the capture registry.
3. Build the master composition contract.
4. Render verify before approval.
5. Generate the edit-ready proxy and edit asset only when a downstream `explainer-edit` cut needs reframing or retiming.
6. Derive any secondary cuts after the master is approved.

## What belongs here

- Master-path briefs
- Storyboards
- Capture registry references
- Master template contracts
- Approval and verification notes
- Manifest `notes` that keep proxy/editorial handoff rules close to the piece

## CLI

- `npm run video:explainers:list`
- `npm run video:explainer:render -- importacio-extracte-conciliacio`
- `npm run video:explainer:render -- importacio-extracte-conciliacio --skip-recording`

`--skip-recording` is the fast path when the base capture already exists and only the postproduction layer changes.
If the manifest declares `editProxyPath` and `editAssetPath`, the render command prepares the explainer-edit proxy automatically and keeps the proxy separate from the approved master render.
