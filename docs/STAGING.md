# STAGING — Summa Social (aïllat)

## Què és
Aquest entorn és un staging separat per validar canvis abans de publicar a producció.
Objectiu: provar funcionalitats a `https://bot.summasocial.app` sense risc sobre dades ni serveis reals.

## Què NO és
- No és producció.
- No usa el projecte Firebase de prod (`summa-social`).
- No reutilitza secrets de prod.
- No és un entorn per operar amb dades reals d'entitats.

## Aïllament obligatori
- Projecte Firebase: `summa-social-staging` (o `summa-social-staging-<suffix>` si cal per disponibilitat d'ID), diferent de `summa-social`.
- Backend App Hosting: `summa-social-bot` (staging).
- Domini de staging: `bot.summasocial.app`.
- Service account per deploy: exclusiva de staging.
- Secrets App Hosting: `GOOGLE_API_KEY_STAGING`, `RESEND_API_KEY_STAGING` (staging only).

## Fitxers de suport
- `.env.staging.example` (plantilla sense valors reals)
- `.github/workflows/staging-deploy.yml` (deploy automàtic només a staging)
- `apphosting.staging.template.yaml` (referència de configuració de staging)

## Com provar staging
1. Obrir una PR cap a `main` des d'una branca `codex/*`.
2. Esperar el workflow **Deploy Staging**.
3. Validar:
   - `https://bot.summasocial.app`
   - `https://bot.summasocial.app/ca`
4. Revisar el comentari automàtic de la PR (URL + PASS/FAIL smoke tests + logs).

## Smoke tests automàtics
El workflow comprova:
1. GET `/`.
2. GET `/ca`.
3. GET `/login` (si existeix; si és 404 es marca SKIP).
4. 60 segons sense 5xx a `/ca`.
5. Report al PR i a `GITHUB_STEP_SUMMARY` amb PASS/FAIL i enllaç de logs.

## Com apagar o eliminar staging
### Apagar temporalment
- Desactivar workflow `Deploy Staging` a GitHub Actions o bloquejar secret `FIREBASE_SERVICE_ACCOUNT_STAGING`.

### Eliminar completament
1. Eliminar backend App Hosting `summa-social-bot` del projecte staging.
2. Eliminar domini personalitzat `bot.summasocial.app` del backend staging.
3. Eliminar service account de deploy staging.
4. Eliminar secrets staging de GitHub i Cloud Secret Manager.
5. (Opcional) eliminar el projecte `summa-social-staging`.

## Guardrails (no negociables)
- No deploy a prod des d'aquest workflow.
- `STAGING_PROJECT_ID` es llegeix de GitHub Actions Variables (`vars.STAGING_PROJECT_ID`).
- El job falla si detecta `summa-social` com a target.
- El job falla si el domini staging no és `bot.summasocial.app`.
- El job falla si `NEXT_PUBLIC_FIREBASE_PROJECT_ID` no coincideix amb `STAGING_PROJECT_ID`.
- No modificar workflows de producció per activar staging.

## Secrets necessaris a GitHub
- `FIREBASE_SERVICE_ACCOUNT_STAGING` (JSON de service account de staging)
- `STAGING_NEXT_PUBLIC_FIREBASE_API_KEY`
- `STAGING_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `STAGING_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `STAGING_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `STAGING_NEXT_PUBLIC_FIREBASE_APP_ID`

## Variables necessàries a GitHub
- `STAGING_PROJECT_ID` = ID real del projecte staging (ex: `summa-social-staging`).
- `STAGING_DOMAIN` = `bot.summasocial.app`.

## Bloqueig IAM detectat (2026-02-21)
- Parent real de prod (`summa-social`): `organization/549497216100`.
- Compte actiu que falla: `raul.vico.ferre@gmail.com`.
- Error reproduït: `PERMISSION_DENIED: resourcemanager.projects.create`.
- Impacte: no es pot crear el projecte staging per CLI amb aquest compte.

## Desbloqueig recomanat (sense tocar prod)
1. Crear el projecte a Google Cloud Console amb un compte que tingui permisos d'org/folder (`Project Creator`).
2. Habilitar Firebase al projecte nou i activar App Hosting, Firestore, Auth i Storage.
3. Si l'ID final no és `summa-social-staging`, actualitzar `STAGING_PROJECT_ID` a GitHub Variables.

## Secrets via UI de GitHub (sense `gh auth`)
1. GitHub repo → Settings → Secrets and variables → Actions.
2. Crear secret `FIREBASE_SERVICE_ACCOUNT_STAGING` amb el JSON sencer de la service account de staging.
3. Crear els secrets `STAGING_NEXT_PUBLIC_FIREBASE_*`.
4. Crear les variables `STAGING_PROJECT_ID` i `STAGING_DOMAIN`.

## Domini `bot.summasocial.app` (operatiu)
1. Crear backend App Hosting `summa-social-bot` al projecte staging.
2. Afegir custom domain `bot.summasocial.app`.
3. Aplicar exactament els registres DNS que indiqui Firebase.
4. Validar amb `curl -I https://bot.summasocial.app`.

## Estat actual d'implementació
- Part de repositori/CI: preparada.
- Banner visual de staging: implementat (detecta `NEXT_PUBLIC_ENV=staging` o `NEXT_PUBLIC_FIREBASE_PROJECT_ID` amb `staging`).
- Part cloud: pendent de permisos IAM per crear projecte i de configuració manual de secrets/domini.
