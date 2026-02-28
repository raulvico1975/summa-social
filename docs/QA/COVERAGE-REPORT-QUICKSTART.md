# Coverage Report Quickstart

## Execucio local

1. Executa cobertura report-only:

```bash
npm run test:coverage
```

2. Artefactes generats:

- `tmp/test-audit/node-test-coverage.txt`: resum complet de tests + taula de cobertura.
- `tmp/test-audit/coverage/`: dades raw de cobertura Node (V8).
- `tmp/test-audit/coverage-surface.txt`: metrica de superficie executada a `src`.

## Com interpretar `coverage-surface.txt`

Format:

```text
executedFiles/src = X/Y (Z%)
```

- `X`: fitxers de `src` executats pels tests.
- `Y`: total de fitxers detectats a `src`.
- `Z%`: percentatge de superficie executada.

Nota: en Fase 1/Fase 2 la cobertura es **report-only**; no hi ha llindars bloquejants.

## Requisits minims per `npm run build` en local

Cal definir al teu entorn:

- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
