# Summa Social HyperFrames — Handoff

## Current studio status
- Renderable HyperFrames studio with a fixed four-scene sequence
- Canonical explainer path: `functional-explainer` built from real captures
- Current root entry in `index.html`: `05-devolucions-estat-real-16x9`
- `05-devolucions-estat-real-16x9` is research-only and must not be treated as the approved master template
- Tested with `npx hyperframes lint`, `npx hyperframes validate`, and project renders

## Reusable components that exist
- `compositions/components/summa-sequence.html`
- `compositions/components/summa-caption.html`
- `compositions/components/summa-lower-third.html`
- `shots/` and `templates/` now hold the reusable explainer registry layer

## What is fixed
- Plain HTML + `data-*` + GSAP structure
- The current research scaffold uses scene order `hook -> problem -> solution -> outcome`
- The canonical system requires one main idea per scene
- The canonical system requires one proof layer at a time
- Lower thirds are operational, not branded, when they are used
- Blue is reserved for action, not decoration
- The canonical visual proof layer comes from real captures, not from research drafts

## What may vary
- Composition copy
- Whether the piece is `16:9` or `9:16`
- Caption lines
- Lower-third action sentence
- State chip text and semantic tone

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
- Render one composition through a temporary runtime project:
  - `npm run video:render:piece -- 05-devolucions-estat-real-16x9 --output renders/05-devolucions-estat-real-16x9.mp4`
- Preview one composition through the same temporary runtime layer:
  - `npm run video:preview:piece -- 05-devolucions-estat-real-16x9`
- This flow does not require editing `index.html` and cleans up the temporary runtime after exit.
- Use this only for study or verification of the research piece; do not copy it forward as the canonical explainer shape.

## Known risks
- The current runtime still contains research-era components that can tempt future work back toward abstract explainers if briefs and capture sets are ignored
- Portrait pieces are not yet the focus of the canonical path; the first approved master should solve `16:9` cleanly before derivative formats multiply

## Unresolved points
- No intro/outro is required or defined at system level
- No audio track, voiceover track, or sync model is defined
- No proprietary lower-third system exists beyond the current minimal reusable block
- No transcript ingestion pipeline is wired into captions yet
- The canonical `functional-explainer` production path still depends on real capture intake for each new feature

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
- Captions and lower thirds exist in the runtime, but the new canon does not require them by default
- Lower thirds explain an action inside the solution beat when justified; they are not a closing CTA shell
- `05` remains a research artifact and should not be cited as approved precedent when briefing new explainers
