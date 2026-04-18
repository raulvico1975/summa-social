# Summa Social HyperFrames — Handoff

## Current studio status
- Renderable HyperFrames studio with a fixed four-scene sequence
- Current root entry in `index.html`: `05-devolucions-estat-real-16x9`
- Tested with `npx hyperframes lint`, `npx hyperframes validate`, and project renders

## Reusable components that exist
- `compositions/components/summa-sequence.html`
- `compositions/components/summa-caption.html`
- `compositions/components/summa-lower-third.html`

## What is fixed
- Plain HTML + `data-*` + GSAP structure
- Scene order: `hook -> problem -> solution -> outcome`
- Default duration: `12s`
- One main idea per scene
- One overlay at most per scene
- Lower third is operational, not branded
- Blue is reserved for action, not decoration

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

## Known risks
- The system assumes short product copy; dense copy can still force rewrites even if the structure is reusable
- Portrait pieces inherit the same sequence system; they are usable, but the system was designed first for calm functional demos rather than aggressive social hooks

## Unresolved points
- No intro/outro is required or defined at system level
- No audio track, voiceover track, or sync model is defined
- No proprietary lower-third system exists beyond the current minimal reusable block
- No transcript ingestion pipeline is wired into captions yet

## Special dependencies
- Node.js 22+
- FFmpeg
- `npx hyperframes`
- HyperFrames skills are optional but recommended for authoring

## Font criterion
- The repo does not define a video-only type stack
- The studio therefore stays on a neutral UI sans approach to remain aligned with the product and landing pages

## System limitations
- Designed for sober functional demos and short product explainers, not motion-heavy launch films
- Captions are intentionally sparse and do not behave like auto-subtitles
- Lower thirds explain an action inside the solution beat; they are not a closing CTA shell
