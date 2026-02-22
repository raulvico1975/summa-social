# Agent Staging + Bridge (Tècnic)

## Objectiu
Aquest document consolida l'estat tècnic d'operació de l'agent per a Summa Social:
- deploy automàtic només a staging
- separació forta respecte producció
- execució local de comandes via bridge amb control temporal

Data de referència: 2026-02-22.

## Abast
- Inclou: staging Firebase/App Hosting, WIF, guardrails CI, bridge local.
- No inclou: cap deploy automàtic a producció.

## Arquitectura implementada

### 1) Staging aïllat
- Projecte: `summa-social-staging`
- Backend App Hosting: `summa-social-bot`
- Domini: `https://bot.summasocial.app`
- Secrets: Cloud Secret Manager (staging only)
- Autenticació CI: WIF/OIDC (sense claus JSON a GitHub)

Referència detallada: `docs/STAGING.md`.

### 2) Pipeline CI de staging
- Workflow: `.github/workflows/staging-deploy.yml`
- Triggers:
  - `pull_request` cap a `main`
  - `push` a `codex/**`
- Deploy objectiu:
  - només `apphosting`
  - `--project ${STAGING_PROJECT_ID}`
- Smoke tests inclosos:
  - `GET /`
  - `GET /ca`
  - `GET /login` (skip si 404)
  - 60s sense 5xx

### 3) Guardrails anti-prod (CI)
- Falla si `STAGING_PROJECT_ID == "summa-social"`.
- Falla si domini staging no és `bot.summasocial.app`.
- Falla si el service account WIF apunta a `@summa-social.iam.gserviceaccount.com`.
- Job limitat al repo `raulvico1975/summa-social`.

### 4) Least privilege (staging)
- `roles/iam.serviceAccountAdmin` retirat.
- Rol addicional necessari: `roles/serviceusage.serviceUsageConsumer`.
- Validat amb run verd posterior a la retirada del rol admin.

Detall de rols i checklists: `docs/STAGING.md`.

## Bridge local (execució controlada)

### Fitxer
- Script: `scripts/bridge/codex-bridge-local.mjs`
- Doc operatiu: `docs/BRIDGE-CODEX.md`

### Modes
- Execució normal:
  - `node scripts/bridge/codex-bridge-local.mjs "<ordre>"`
- Només cua:
  - `node scripts/bridge/codex-bridge-local.mjs --queue-only "<ordre>"`
- Entrada per `stdin`:
  - `echo "<ordre>" | node scripts/bridge/codex-bridge-local.mjs --stdin`

### Control temporal d'habilitació
- Activar finestra temporal:
  - `node scripts/bridge/codex-bridge-local.mjs --enable-minutes 30`
- Desactivar explícitament:
  - `node scripts/bridge/codex-bridge-local.mjs --disable`

### Semàntica d'estat
- `tmp/bridge/DISABLED` existent:
  - bloqueja execució normal i `--queue-only`
  - `--help` continua disponible
- `tmp/bridge/ENABLED_UNTIL` vigent:
  - permet execució temporal
- `ENABLED_UNTIL` expirat:
  - torna a `BLOCKED_SAFE` i reactiva `DISABLED`

### Guardrails del bridge
- Només funciona des del repo de control correcte.
- Requereix repo de control a `main` i net.
- Requereix worktree `codex/*`.
- Bloqueja ordres sensibles sense keyword:
  - `CEO_OK_ACABAT`
  - `CEO_OK_PUBLICA`
- Escriu traça operativa a `tmp/bridge/last-run.json`.

## Flux operatiu complet
1. Desenvolupament en branca `codex/*`.
2. PR cap a `main`.
3. Deploy automàtic a staging.
4. Validació funcional humana a staging.
5. Producció: decisió i execució manual (fora del circuit automàtic de l'agent).

## Què NO fa aquest sistema
- No desplega automàticament a prod.
- No reutilitza secrets de prod a staging.
- No permet executar `publica/acabat` sense keyword explícita del CEO.

## Mapa de documents
- `docs/STAGING.md` (infra, IAM/WIF, domini, smoke tests, least privilege)
- `docs/BRIDGE-CODEX.md` (ús del bridge i proves ràpides)
- `docs/GOVERN-DE-CODI-I-DEPLOY.md` (marc de govern global)
- `docs/RAUL-RESUM-OPERATIU.md` (resum no tècnic)
