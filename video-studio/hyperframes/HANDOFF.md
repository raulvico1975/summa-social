# Summa Social HyperFrames — Handoff

## Current studio status
- Renderable HyperFrames runtime without the old short-video scaffold
- Canonical proof path: `video-studio/functional-explainers`
- Current root entry in `index.html`: `07-importacio-extracte-product-film-16x9`
- `07-importacio-extracte-product-film-16x9` is the current premium candidate baseline
- `06-importacio-extracte-editorial-16x9` is a sandbox only, not an approved premium precedent
- Tested with `npx hyperframes lint`, `npx hyperframes validate`, and project renders

## Reusable infrastructure that exists
- temporary runtime creation
- safe per-piece preview and render wrappers
- web delivery profile support
- briefs, captures, and templates registry
- capture-first product-film shot library
- product-film review gate

## What is fixed
- Plain HTML + `data-*` + GSAP structure
- HyperFrames renders and previews the canonical master path; it does not define it
- real capture remains the proof source
- premium visual law now lives in contracts and template docs, not in reusable caption or lower-third blocks

## What may vary
- future product-film composition language
- delivery profiles
- aspect ratio of future approved films
- whether a sandbox composition remains in tree for technical validation

## How to render the studio
- Default root render:
  - `npm run video:render`
- Preview:
  - `npm run video:preview`
- Lint:
  - `npm run video:lint`
- Validate:
  - `npm run video:validate`

## How to render a specific composition
- List available pieces:
  - `npm run video:list`
- Render 07 through a temporary runtime project:
  - `npm run video:render:piece -- 07-importacio-extracte-product-film-16x9 --output renders/07-importacio-extracte-product-film-16x9.mp4`
- Render 07 with the website-facing delivery profile:
  - `npm run video:render:piece -- 07-importacio-extracte-product-film-16x9 --profile web-premium --output renders/07-importacio-extracte-product-film-16x9.web.mp4`
- Preview 07 through the same temporary runtime layer:
  - `npm run video:preview:piece -- 07-importacio-extracte-product-film-16x9`
- This flow does not require editing `index.html` and cleans up the temporary runtime after exit.
- Use this for safe preview and render verification of the current premium candidate without mutating the repo root again.
- `web-premium` is the preferred delivery render when the output is meant for a website or hero embed; it raises encoder quality at source instead of trying to “repair” a compressed draft later.

## Known risks
- `07` is still only a candidate and may still read as under-directed if the motion or copy feel templated
- The sandbox 06 piece can still tempt future work back toward poster-like layout if it is treated as precedent

## Unresolved points
- No intro/outro is required or defined at system level
- No audio track, voiceover track, or sync model is defined
- No transcript ingestion pipeline is wired into captions yet
- The canonical production path still depends on real capture intake for each new feature
- The proxy strategy may need higher-quality settings if future product films reframe more aggressively

## Special dependencies
- Node.js 22+
- FFmpeg
- `npx hyperframes`
- HyperFrames skills are optional but recommended for authoring

## Font criterion
- The repo does not define a video-only type stack
- The studio therefore stays on a neutral UI sans approach to remain aligned with the product and landing pages

## System limitations
- Designed for sober functional demos and product explainers, not motion-heavy launch films
- No current composition in tree should yet be cited as approved premium precedent
