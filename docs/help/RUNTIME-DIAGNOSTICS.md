# Runtime Diagnostics

## Quina font està servint la KB

- El runtime del bot només carrega:
  - `docs/kb/_fallbacks.json`
  - `docs/kb/cards/**/*.json`
- No hi ha API de diagnòstic KB dedicada ni cap lectura de Storage per aquesta capa.
- Si cal verificar la font activa, revisa el codi de:
  - `src/lib/support/load-kb.ts`
  - `src/lib/support/load-kb-runtime.ts`
  - `src/app/api/support/bot/route.ts`

## Quins fallback top hi ha

- Revisa els logs i comptadors del bot a Firestore.
- Per afegir cobertura nova, crea o ajusta cards a `docs/kb/cards/**/*.json`.

## Quins anchors/manual links estan trencats

- Executa `npm run help:audit`.
- El report queda a `help/audit-report.md`.
- Comprova:
  - `Rutes HelpSheet -> Manual`
  - `Hints de navegació del bot -> Manual`
  - `Referències legacy a guides/hub dins la KB`

## Què mirar quan alguna cosa no quadra

- Si el bot respon però el link no porta enlloc: `help:audit`.
- Si sembla que falta una card, comprova si existeix realment a `docs/kb/cards/**/*.json`.
- Si falten cobertures reals, la correcció és repo-first: afegir o editar KB via Git.
