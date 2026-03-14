# Runtime Diagnostics

## Quina font està servint la KB

- Consulta `GET /api/support/kb/diagnostics`.
- Camps clau:
  - `kbSource`: `storage` o `filesystem`
  - `version`
  - `storageVersion`
  - `versionMismatch`

Si `versionMismatch=true`, el runtime ha de considerar `filesystem` com a font efectiva.

## Quins fallback top hi ha

- Des de SuperAdmin, el learning manager llegeix `/api/support/bot-questions/candidates`.
- Els camps més útils per prioritzar:
  - `fallbackCount`
  - `helpfulNo`
  - `coveragePressure`

## Quins anchors/manual links estan trencats

- Executa `npm run help:audit`.
- El report queda a `help/audit-report.md`.
- Comprova:
  - `Rutes HelpSheet -> Manual`
  - `Hints de navegació del bot -> Manual`
  - `Referències legacy a guides/hub dins la KB`

## Què mirar quan alguna cosa no quadra

- Si el bot respon però el link no porta enlloc: `help:audit`.
- Si la KB publicada no sembla la que toca: `/api/support/kb/diagnostics`.
- Si falten cobertures reals: learning manager + `coveragePressure`.
