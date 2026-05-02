# Security Best Practices Report - Summa Social

Data de revisio: 2026-05-02

## Resum executiu

Summa Social es una aplicacio TypeScript amb Next.js/React, Firebase Auth/Firestore/Storage, Firebase App Hosting i Cloud Functions. La postura general de Firestore es millor del que es veu habitualment: hi ha `deny` per defecte, controls per organitzacio i diverses rutes sensibles validen `Authorization: Bearer <idToken>` abans d'usar Admin SDK.

Les troballes prioritaries son a la capa HTTP de Next.js: hi ha endpoints d'IA i d'alerta d'incidents que accepten peticions sense autenticacio visible. Aixo permet consum de quota/costos, abus de serveis externs i, en un cas, fetch server-side d'URLs arbitraries. Tambe cal tancar controls de pujada a Storage, desactivar source maps publics i deixar de saltar-se TypeScript/ESLint en build.

Guia consultada:

- Skill local `security-best-practices`: Next.js, React i frontend web general.
- Next.js Security Advisory CVE-2025-66478: https://nextjs.org/blog/CVE-2025-66478
- Next.js headers config: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- Next.js environment variables: https://nextjs.org/docs/app/guides/environment-variables

Limitacio: no he pogut executar `npm audit` perque en aquest entorn no hi ha binari `npm`; si es fa la correccio, cal executar-lo en un entorn amb Node/npm complet.

## Evidencia de stack

- Next.js/React: `package.json` declara `next`, `react`, `react-dom` i App Router sota `src/app`.
- Firebase client/admin: `package.json` declara `firebase` i `firebase-admin`; hi ha `firestore.rules`, `storage.rules`, rutes API i `functions/`.
- Versio instal·lada al lockfile: `next` 15.5.7 i `react` 18.3.1. Segons l'advisory oficial de Next.js, 15.5.7 es versio corregida per CVE-2025-66478.

## Troballes altes

### H-001 - Endpoints d'IA sense autenticacio ni limitacio server-side

**Severitat:** Alta

**Ubicacio:**

- `src/app/api/ai/categorize-transaction/route.ts:64`
- `src/app/api/ai/extract-ticket/route.ts:111`
- `src/app/api/ai/generate-product-update/route.ts:11`

**Evidencia:**

- `categorize-transaction` entra directament a `POST`, llegeix JSON i crida el prompt d'IA sense validar usuari ni organitzacio.
- `extract-ticket` accepta `fileUrl`, fa `fetch(downloadUrl)` al servidor i despres crida IA.
- `generate-product-update` genera contingut editorial amb una simple lectura del body.

**Impacte:** un atacant pot consumir quota d'IA i recursos del backend sense ser usuari. A `extract-ticket`, a mes, `fileUrl` permet que el servidor faci peticions HTTP a URLs triades per l'atacant, amb risc de SSRF, filtracio parcial per codis d'estat i amplificacio de costos.

**Fix recomanat:**

- Exigir `verifyIdToken` a tots tres endpoints.
- A `categorize-transaction` i `extract-ticket`, validar membership i una capability operativa de l'organitzacio.
- A `generate-product-update`, exigir `isSuperAdmin`.
- A `extract-ticket`, eliminar `fileUrl` arbitrari o limitar-lo a Storage propi; si es mantingues, allowlist d'host, protocol `https`, timeout curt, mida maxima i bloqueig de rangs privats/link-local.
- Afegir rate limiting per UID/org i logs d'auditoria sense payload sensible.

**Mitigacio temporal:** bloquejar aquestes rutes a App Hosting/CDN excepte usuaris autenticats o afegir un secret intern fins que hi hagi auth per UID/org.

### H-002 - Endpoint d'alertes d'incidents public i HTML no escapat

**Severitat:** Alta

**Ubicacio:** `src/app/api/admin/incident-alert/route.ts:19`

**Evidencia:**

- El handler `POST` no valida cap token abans de llegir `incidentId`, `title`, `type`, `severity`, `impact`, `route`, `message` i `count`.
- Si `impact === 'blocker'`, usa `RESEND_API_KEY` per enviar email.
- El HTML interpola `type`, `severity`, `route`, `count` i `message` directament dins la plantilla.

**Impacte:** qualsevol client que conegui la ruta pot generar correus a l'administrador amb contingut triat, consumint quota de Resend i degradant la resposta operativa. La interpolacio HTML directa tambe permet injeccio de markup dins el correu.

**Fix recomanat:**

- Requerir SuperAdmin via `verifyIdToken` + `isSuperAdmin`, o convertir-ho en endpoint intern amb secret de servei rotat a Secret Manager.
- Escapar tots els camps interpolats al HTML.
- Validar schema amb `zod`: mida maxima, enums per `severity/impact`, `count` numeric limitat.
- Afegir rate limit i idempotencia per `incidentId`.

### H-003 - Storage Rules permeten pujades operatives sense limits de mida ni tipus

**Severitat:** Alta

**Ubicacio:** `storage.rules:71`

**Evidencia:**

Les regles permeten `write` a prefixes com:

- `organizations/{orgId}/pendingDocuments/{allPaths=**}`
- `organizations/{orgId}/documents/{allPaths=**}`
- `organizations/{orgId}/transactions/{allPaths=**}`
- `organizations/{orgId}/expenseReports/{allPaths=**}`
- `organizations/{orgId}/prebankRemittances/{allPaths=**}`

La condicio es nomes `isSuperAdmin() || hasOperationalOrgAccess(orgId)`, sense `request.resource.size`, `request.resource.contentType` ni restriccions de path/nom.

**Impacte:** qualsevol membre `admin` o `user` d'una organitzacio pot pujar fitxers de mida o tipus no controlats als prefixes operatius. Aixo pot provocar costos, denegacio de servei per volum, emmagatzematge de fitxers no esperats o contingut actiu que altres fluxos podrien exposar.

**Fix recomanat:**

- Afegir helpers de Storage: mida maxima per categoria, content types acceptats i noms/path esperats.
- Separar permisos per capability: no tots els `user` haurien d'escriure en tots els prefixes.
- Exigir metadades coherents quan el flux ho permeti (`orgId`, `uploadedBy`, `source`).

## Troballes mitjanes

### M-001 - Build de produccio permet source maps publics i ignora TypeScript/ESLint

**Severitat:** Mitjana

**Ubicacio:** `next.config.ts:11`, `next.config.ts:28`, `next.config.ts:31`

**Evidencia:**

- `productionBrowserSourceMaps: true`
- `typescript.ignoreBuildErrors: true`
- `eslint.ignoreDuringBuilds: true`

**Impacte:** els source maps publics faciliten inspeccio de codi client i endpoints interns. Ignorar TypeScript i ESLint durant el build pot deixar entrar canvis amb errors de tipus o avisos de seguretat que haurien de bloquejar release.

**Fix recomanat:**

- Posar `productionBrowserSourceMaps: false`, o publicar source maps nomes a un servei privat d'errors.
- Treure `ignoreBuildErrors` i `ignoreDuringBuilds`.
- Si hi ha blockers legacy, crear una llista curta de deute amb data de tancament, no un bypass global.

### M-002 - Tokens d'invitacio generats amb `Math.random` i guardats en clar

**Severitat:** Mitjana

**Ubicacio:**

- `src/lib/invitations/utils.ts:3`
- `src/app/api/invitations/create/handler.ts:136`
- `src/app/api/invitations/resolve/route.ts:31`
- `src/lib/members-import.ts:347`

**Evidencia:**

`generateInvitationToken()` i `generateInviteToken()` creen tokens amb `Math.random()`. La invitacio guarda `token` en clar i `resolve` consulta `.where('token', '==', token)`.

**Impacte:** `Math.random` no es un generador criptografic. Tot i que l'acceptacio comprova que l'email autenticat coincideix, un token filtrat permet resoldre dades de la invitacio i augmenta el risc si en el futur es relaxa el flux.

**Fix recomanat:**

- Generar tokens amb `randomBytes(32).toString('base64url')`.
- Guardar nomes `tokenHash`, igual que el patro existent d'integracions privades.
- Fer `resolve` contra hash i afegir rate limiting per IP/token prefix.
- Considerar que `accept` requereixi token o hash, no nomes `invitationId`.

### M-003 - Falta baseline visible de security headers a Next.js

**Severitat:** Mitjana

**Ubicacio:** `next.config.ts:9`

**Evidencia:**

No hi ha `headers()` a `next.config.ts` ni cap configuracio equivalent visible al repo. Next.js documenta que `headers` permet establir capcaleres HTTP i inclou exemples per `X-Frame-Options`, `Permissions-Policy`, `X-Content-Type-Options`, `Referrer-Policy` i CSP.

**Impacte:** sense headers visibles o verificats a runtime, l'app depen de la plataforma/edge per proteccions de defensa en profunditat contra clickjacking, MIME sniffing, filtracio de referrer i XSS.

**Fix recomanat:**

- Afegir `headers()` global amb:
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: origin-when-cross-origin` o mes restrictiu si no trenca fluxos
  - `Permissions-Policy` restrictiva
  - `X-Frame-Options: SAMEORIGIN` o, preferentment, CSP `frame-ancestors`
  - CSP inicial compatible amb Next.js i els dominis reals de Firebase/Google/Resend nomes on calgui
- Verificar a produccio amb una peticio real, perque App Hosting/CDN pot afegir o sobreescriure headers.

### M-004 - Formulari de contacte public sense rate limit visible

**Severitat:** Mitjana

**Ubicacio:** `src/app/api/contact/route.ts:60`

**Evidencia:**

El formulari valida schema i te honeypot `website`, pero no hi ha limitacio per IP, email, finestra temporal o captcha abans d'enviar via Resend.

**Impacte:** pot ser usat per spam operatiu i consum de quota. No he vist injeccio HTML en aquest endpoint perque el contingut es passa per `escapeHtml`.

**Fix recomanat:**

- Afegir rate limit server-side per IP/email i finestra temporal.
- Mantenir honeypot, pero no fer-lo l'unic control.
- Registrar intents amb dades minimes i sense PII excessiva.

## Troballes baixes

### L-001 - Dades de SuperAdmin exposades al client com a UI gating

**Severitat:** Baixa

**Ubicacio:**

- `src/lib/data.ts:645`
- `src/hooks/use-organization.ts:28`
- `src/components/dashboard-sidebar-content.tsx:48`
- `src/lib/admin/superadmin-allowlist.ts:13`

**Evidencia:**

El UID i emails SuperAdmin apareixen en codi client o compartit. Les rutes backend sensibles revisades tendeixen a usar `systemSuperAdmins/{uid}`, cosa que es correcte, pero hi ha UI gating hardcoded.

**Impacte:** no es una escalada directa si el backend continua validant amb Firestore/Auth, pero exposa identificadors interns i pot donar una falsa sensacio que la UI es una frontera de seguretat.

**Fix recomanat:**

- Centralitzar el criteri SuperAdmin en backend/Firestore i exposar al client nomes flags derivats, no la llista canonica.
- Evitar crear noves decisions d'autoritzacio basades en constants client-side.

## Controls positius verificats

- `firestore.rules` te denegacio per defecte i nombrosos controls per organitzacio/capability.
- Rutes sensibles com backup local i remeses IN fan verificacio de token i rol abans d'usar Admin SDK.
- Les integracions privades fan servir tokens llargs, hash SHA-256, comparacio segura i scopes.
- `apphosting.yaml` referencia secrets sensibles via Secret Manager per `GOOGLE_API_KEY`, `RESEND_API_KEY`, `BLOG_PUBLISH_SECRET`, `PRODUCT_UPDATES_PUBLISH_SECRET` i `STRIPE_SECRET_KEY`.
- Les variables `NEXT_PUBLIC_FIREBASE_*` son publiques per disseny; no les marco com secret compromes.

## Ordre recomanat de correccio

1. Tancar auth i rate limit als endpoints d'IA.
2. Tancar `/api/admin/incident-alert` amb auth/secret intern i escaping HTML.
3. Afegir limits de mida/tipus a `storage.rules` i tests de regles.
4. Desactivar source maps publics i fer que build falli amb errors de TypeScript/ESLint.
5. Migrar invitacions a token criptografic hashat.
6. Afegir security headers i verificar-los contra l'entorn desplegat.

## Verificacio pendent

- Executar `npm audit --omit=dev` i `npm --prefix functions audit --omit=dev` en un entorn amb `npm`.
- Provar headers reals de produccio amb `curl -I https://summasocial.app`.
- Afegir tests minims abans de tocar Storage rules, invitacions o remeses.
