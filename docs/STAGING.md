# STAGING — Summa Social (aïllat)

Lectura ràpida:
- Tècnic consolidat: `docs/AGENT-STAGING-BRIDGE-TECNIC.md`
- No tècnic (Raül): `docs/RAUL-RESUM-OPERATIU.md`

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
- Autenticació CI: Workload Identity Federation (OIDC), sense claus JSON persistents a GitHub.
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
- Desactivar workflow `Deploy Staging` a GitHub Actions o buidar la variable `GCP_WIF_PROVIDER`.

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
- El job falla si falten `GCP_WIF_PROVIDER` o `GCP_WIF_SERVICE_ACCOUNT`.
- El job falla si `GCP_WIF_SERVICE_ACCOUNT` apunta a `summa-social`.
- El deploy CI és només `apphosting` (backend `summa-social-bot`) amb config temporal dedicada.
- No modificar workflows de producció per activar staging.

## Secrets necessaris a GitHub
- Cap (model WIF/OIDC).
- Prohibit guardar claus JSON de service account a GitHub.

## Variables necessàries a GitHub
- `STAGING_PROJECT_ID` = ID real del projecte staging (ex: `summa-social-staging`).
- `STAGING_DOMAIN` = `bot.summasocial.app`.
- `GCP_WIF_PROVIDER` = `projects/<PROJECT_NUMBER>/locations/global/workloadIdentityPools/<POOL_ID>/providers/<PROVIDER_ID>`.
- `GCP_WIF_SERVICE_ACCOUNT` = `github-staging-deploy@<PROJECT_ID>.iam.gserviceaccount.com`.

## Bloqueig IAM detectat (2026-02-21)
- Parent real de prod (`summa-social`): `organization/549497216100`.
- Compte actiu que falla: `raul.vico.ferre@gmail.com`.
- Error reproduït: `PERMISSION_DENIED: resourcemanager.projects.create`.
- Impacte: no es pot crear el projecte staging per CLI amb aquest compte.

## Desbloqueig recomanat (sense tocar prod)
1. Crear el projecte a Google Cloud Console amb un compte que tingui permisos d'org/folder (`Project Creator`).
2. Habilitar Firebase al projecte nou i activar App Hosting, Firestore, Auth i Storage.
3. Si l'ID final no és `summa-social-staging`, actualitzar `STAGING_PROJECT_ID` a GitHub Variables.

## Variables via UI de GitHub (sense `gh auth`)
1. GitHub repo → Settings → Secrets and variables → Actions.
2. Crear variables: `STAGING_PROJECT_ID`, `STAGING_DOMAIN`, `GCP_WIF_PROVIDER`, `GCP_WIF_SERVICE_ACCOUNT`.
3. No crear secrets de deploy a GitHub.

## Secrets a Cloud Secret Manager (projecte staging)
Cal crear, al projecte staging, aquests secrets usats per App Hosting:
- `NEXT_PUBLIC_FIREBASE_API_KEY_STAGING`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN_STAGING`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET_STAGING`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID_STAGING`
- `NEXT_PUBLIC_FIREBASE_APP_ID_STAGING`
- `GOOGLE_API_KEY_STAGING`
- `RESEND_API_KEY_STAGING`

## Configuració WIF (OIDC) resumida
1. Crear SA staging (ex: `github-staging-deploy`) al projecte staging.
2. Assignar rols mínims al projecte staging (`roles/firebase.admin`, `roles/run.admin`, `roles/iam.serviceAccountUser`).
3. Crear Workload Identity Pool + Provider OIDC de GitHub (`token.actions.githubusercontent.com`) restringit al repo `raulvico1975/summa-social`.
4. Donar `roles/iam.workloadIdentityUser` sobre la SA al `principalSet` del repositori.

## Domini `bot.summasocial.app` (operatiu)
1. Crear backend App Hosting `summa-social-bot` al projecte staging.
2. Afegir custom domain `bot.summasocial.app`.
3. Aplicar exactament els registres DNS que indiqui Firebase.
4. Validar amb `curl -I https://bot.summasocial.app`.

## Estat actual d'implementació
- Part de repositori/CI: preparada.
- Banner visual de staging: implementat (detecta `NEXT_PUBLIC_ENV=staging` o `NEXT_PUBLIC_FIREBASE_PROJECT_ID` amb `staging`).
- Part cloud: operativa i validada.

## Estat operatiu (validat)
- Projecte: `summa-social-staging`
- Backend: `summa-social-bot` (`us-central1`)
- Domini: `https://bot.summasocial.app`
- Auth: GitHub OIDC (WIF)
- Secrets: Cloud Secret Manager (7/7)
- Pipeline: `PR codex/* -> staging only`
- Producció: manual, fora de WIF
- Data validació: `2026-02-22`
- Run validat: `22274363002`

## Least privilege final (staging)
- Service account de deploy: `github-staging-deploy@summa-social-staging.iam.gserviceaccount.com`
- Rols finals al projecte `summa-social-staging`:
  - `roles/firebase.admin`
  - `roles/firebaseapphosting.admin`
  - `roles/iam.serviceAccountUser`
  - `roles/resourcemanager.projectIamAdmin`
  - `roles/run.admin`
  - `roles/serviceusage.serviceUsageConsumer`
  - `roles/storage.admin`
- `roles/iam.serviceAccountAdmin` retirat.
- Validació de regressió: run `22274363002` en verd després de retirar `roles/iam.serviceAccountAdmin`.
- `roles/serviceusage.serviceUsageConsumer` és necessari per evitar el 403 de `serviceusage.services.use` durant deploy.

## Checklist operativa ràpida
1. Si falla auth WIF:
   - Revisar variables de repo: `STAGING_PROJECT_ID`, `STAGING_DOMAIN`, `GCP_WIF_PROVIDER`, `GCP_WIF_SERVICE_ACCOUNT`.
   - Verificar `permissions: id-token: write` al workflow.
2. Si falla deploy amb 403:
   - Llegir el permís exacte de l'error.
   - Afegir només el rol/permís mínim al projecte `summa-social-staging` (mai a prod).
3. Si falla runtime (5xx):
   - Verificar secrets a Cloud Secret Manager (noms exactes i versions amb valor).
   - Confirmar que el backend App Hosting té accés de lectura als secrets de staging.
