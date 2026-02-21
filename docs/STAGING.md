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
- Projecte Firebase: `summa-social-staging` (diferent de `summa-social`).
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
1. Home respon HTTP 200.
2. Ruta `/ca` respon HTTP 200.
3. Monitorització de 60s sense cap 5xx.
4. Report al PR amb estat PASS/FAIL i enllaç a logs.

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
- `STAGING_PROJECT_ID` fixat a `summa-social-staging`.
- El job falla si detecta `summa-social` com a target.
- El job falla si `NEXT_PUBLIC_FIREBASE_PROJECT_ID` no coincideix amb `summa-social-staging`.
- No modificar workflows de producció per activar staging.

## Secrets necessaris a GitHub
- `FIREBASE_SERVICE_ACCOUNT_STAGING` (JSON de service account de staging)
- `STAGING_NEXT_PUBLIC_FIREBASE_API_KEY`
- `STAGING_NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `STAGING_NEXT_PUBLIC_FIREBASE_PROJECT_ID` (`summa-social-staging`)
- `STAGING_NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `STAGING_NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `STAGING_NEXT_PUBLIC_FIREBASE_APP_ID`

## Estat actual d'implementació
La part de repositori/CI està preparada.
La provisió cloud (crear projecte `summa-social-staging`, backend App Hosting i domini `bot.summasocial.app`) depèn de permisos IAM de creació de projectes GCP i d'accés GitHub per carregar secrets.
