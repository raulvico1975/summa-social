# Pla de remediacio de seguretat - Summa Social

Data: 2026-05-02

## Objectiu

Resoldre les troballes del fitxer `security_best_practices_report.md` amb PRs petits, verificables i sense canvis destructius. El primer PR ha de tancar els riscos HTTP mes explotables: endpoints d'IA i alerta d'incidents.

Restriccions aplicables:

- No afegir dependencies.
- No refactoritzar fora d'abast.
- No canvis destructius Firestore.
- No escriure `undefined` a Firestore.
- Batches Firestore <= 50 operacions.
- Si un canvi acaba tocant remeses/devolucions/donants/fiscalitat, afegir test o prova minima i mencionar-la.

## Acord de severitats i ordre

L'ordre proposat queda validat:

1. H-001: endpoints d'IA sense autenticacio ni limit server-side.
2. H-002: `incident-alert` public i HTML no escapat.
3. H-003: Storage Rules sense limits de mida/tipus.
4. M-001/M-003/M-004: build hardening, headers i rate limit del formulari de contacte.
5. M-002: invitacions amb token criptografic hashat.
6. L-001: treure hardcodes SuperAdmin del client quan hi hagi estat/endpoint equivalent.

## PR 1 - Tancar H-001 i H-002

### Abast

Incloure nomes:

- Auth, autoritzacio i rate limit minim als endpoints d'IA.
- Auth, autoritzacio, rate limit i escaping HTML a `incident-alert`.
- Adaptacio dels callers client necessaris per passar `Authorization` i `orgId`.
- Tests de helpers i, si encaixa amb patrons existents, tests de ruta.

No incloure:

- Storage Rules.
- Invitacions.
- Security headers globals.
- Contact form.
- Canvis globals de SuperAdmin client.
- Canvis de remeses, fiscalitat, donants, devolucions o Stripe.

### Inventari inicial

Executar abans de tocar codi:

```bash
rg "categorize-transaction|extract-ticket|generate-product-update|incident-alert" src
rg "fileUrl|storagePath|extract-ticket|extractTicket" src
rg "verifyIdToken|validateUserMembership|isSuperAdmin" src/lib src/app/api
```

Callers vistos en la revisio:

- `src/components/transaction-importer.tsx`
- `src/components/transactions/hooks/useTransactionCategorization.ts`
- `src/components/expense-reports/tickets-inbox.tsx`
- `src/components/project-module/quick-expense-screen.tsx`
- `src/lib/pending-documents/extract-image.ts`
- `src/components/admin/product-updates-section.tsx`
- `src/components/admin/system-health.tsx`

### Helpers proposats

#### `src/lib/api/rate-limit.ts`

Sense dependencies. Implementacio inicial in-memory amb `globalThis`, suficient com a proteccio minima pero no distribuida entre instancies.

Signatures:

```ts
export function getClientIp(request: Request): string;

export function checkRateLimit(
  key: string,
  options: { limit: number; windowMs: number; nowMs?: number }
): { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function buildRateLimitHeaders(
  result: { allowed: false; retryAfterSeconds: number }
): HeadersInit;
```

Notes:

- Usar `x-forwarded-for` amb cautela i fallback estable.
- Netejar finestres caducades per evitar creixement infinit.
- No presentar-ho com a rate limit fort distribuït.

#### `src/lib/api/request-guards.ts`

Reutilitzar `src/lib/api/admin-sdk.ts`. No duplicar inicialitzacio Firebase.

Signatures:

```ts
export type ApiGuardResult<T> =
  | { ok: true; value: T }
  | { ok: false; response: Response };

export async function requireAuthenticatedUser(request: NextRequest): Promise<ApiGuardResult<AuthResult>>;

export async function requireOrgMember(
  request: NextRequest,
  orgId: string
): Promise<ApiGuardResult<{ auth: AuthResult; membership: MembershipValidation }>>;

export async function requireSuperAdminRequest(
  request: NextRequest
): Promise<ApiGuardResult<AuthResult>>;

export function jsonError(status: number, code: string, message?: string): NextResponse;
```

Decisio per PR 1:

- `categorize-transaction`: requereix usuari autenticat i membre valid de `orgId`.
- `extract-ticket`: requereix usuari autenticat i membre valid de `orgId`.
- `generate-product-update`: requereix SuperAdmin.
- `incident-alert`: requereix SuperAdmin.

No inventar un sistema nou de capabilities IA en aquest PR. Si cal granularitat fina, sera PR posterior.

#### `src/lib/security/html.ts`

Signatura:

```ts
export function escapeHtml(value: unknown): string;
```

Us inicial:

- `src/app/api/admin/incident-alert/route.ts`

#### `src/lib/security/storage-url.ts`

Nomes si cal compatibilitat temporal amb `fileUrl` a `extract-ticket`.

Signatura:

```ts
export function isAllowedFirebaseStorageUrl(input: string, orgId: string): boolean;
```

Regles:

- Acceptar nomes `https`.
- Acceptar nomes hosts Firebase Storage esperats.
- Rebutjar hosts locals, link-local, metadata i externs.
- Rebutjar paths fora de `organizations/{orgId}/`.
- Preferencia final: migrar callers a `storagePath` i eliminar `fileUrl` arbitrari quan sigui viable.

### Contracte nou per endpoint

#### `POST /api/ai/categorize-transaction`

Nou body:

```ts
{
  orgId: string;
  description: string;
  amount: number;
  expenseOptions: Array<{ id: string; name: string }>;
  incomeOptions: Array<{ id: string; name: string }>;
}
```

Respostes noves:

- `401 UNAUTHORIZED`: no hi ha token.
- `400 INVALID_INPUT`: body invalid o falta `orgId`.
- `403 FORBIDDEN`: usuari no membre de l'org.
- `429 RATE_LIMITED`: massa peticions.

#### `POST /api/ai/extract-ticket`

Nou body:

```ts
{
  orgId: string;
  storagePath?: string;
  fileUrl?: string; // nomes compatibilitat temporal allowlisted, si cal
  docId?: string;
}
```

Decisio segura:

- Preferir `storagePath`.
- Si `fileUrl` queda actiu temporalment, validar amb allowlist estricta.
- Mida maxima abans de passar a IA.

Respostes noves:

- `401`, `400`, `403`, `429`.
- `400 INVALID_FILE_URL` per URL no allowlisted.

#### `POST /api/ai/generate-product-update`

Contracte:

- Mateix body funcional.
- Requereix SuperAdmin.

Respostes noves:

- `401 UNAUTHORIZED`
- `403 SUPERADMIN_REQUIRED`
- `429 RATE_LIMITED`

#### `POST /api/admin/incident-alert`

Contracte:

- Mateix comportament funcional: nomes envia si `impact === "blocker"`.
- Requereix SuperAdmin.
- HTML sempre escapat.
- Schema estricte amb mides maximes.

Respostes noves:

- `401 UNAUTHORIZED`
- `403 SUPERADMIN_REQUIRED`
- `400 INVALID_PAYLOAD`
- `429 RATE_LIMITED`

### Adaptacio de callers

Patro recomanat:

- Obtenir `idToken` amb Firebase Auth al client abans del `fetch`.
- Passar `Authorization: Bearer ${idToken}`.
- Passar `orgId` des del context d'organitzacio ja carregat.
- Mantenir UX actual d'errors: no canviar textos visibles si no cal.

No fer en aquest PR:

- Resoldre org per slug al backend.
- Crear nou context global si ja hi ha `organizationId`.
- Rebaixar `generate-product-update` a admin d'org sense decisio funcional.
- Obrir `incident-alert` public amb captcha o secret public.

### Tests minims PR 1

Ubicacio preferent:

- `src/lib/__tests__/rate-limit.test.ts`
- `src/lib/__tests__/html-security.test.ts`
- `src/lib/__tests__/storage-url-security.test.ts` si es crea helper URL.
- Si hi ha patro facil de mocks: tests de ruta sota `src/lib/__tests__/*route*.test.ts`.

Casos helper:

- Rate limit permet N peticions i bloqueja N+1.
- Rate limit expira finestra.
- `escapeHtml` escapa `<`, `>`, `"`, `'`, `&`.
- Storage URL rebutja `http`, `localhost`, `169.254.169.254`, `metadata.google.internal`, host extern i org diferent.
- Storage URL accepta Firebase Storage esperat amb prefix de la mateixa org.

Casos ruta ideals:

- IA sense `Authorization` retorna `401`.
- IA amb auth pero sense `orgId` retorna `400`.
- IA amb membership fallida retorna `403`.
- IA rate limited retorna `429`.
- `incident-alert` sense auth retorna `401`.
- `incident-alert` amb usuari normal retorna `403`.
- `incident-alert` amb payload HTML usa helper escapat.

No fer tests que cridin Gemini o Resend reals.

### Ordre d'implementacio PR 1

1. Inventari de callers i shape de payloads.
2. Crear helpers (`rate-limit`, `request-guards`, `html`, `storage-url` si cal).
3. Afegir tests dels helpers.
4. Protegir `categorize-transaction`.
5. Protegir `extract-ticket`.
6. Protegir `generate-product-update`.
7. Protegir `incident-alert`.
8. Adaptar callers client.
9. Executar verificacio.

Verificacio:

```bash
npm run typecheck
npm test
npm run build
```

Si i18n queda afectat, que no hauria:

```bash
npm run i18n:check
npm run i18n:check-tr-keys
```

### Riscos PR 1

| Risc | Mitigacio |
| --- | --- |
| El client no te `orgId` disponible en algun caller | Passar-lo des del context existent; no crear resolucio backend nova en aquest PR. |
| `extract-ticket` depen de URL signada arbitraria | Compatibilitat temporal amb allowlist Firebase Storage o migrar caller a `storagePath`. |
| Rate limit in-memory no es distribuit | Acceptar-lo com a millora minima sense deps; documentar risc residual. |
| `generate-product-update` podria estar cridat per admin no SuperAdmin | Si passa, documentar-ho i no rebaixar la seguretat sense decisio de producte. |
| `incident-alert` podria ser usat per clients no autenticats | No mantenir endpoint public; un reporting public segur seria PR separat. |
| Tests de ruta amb Admin SDK poden ser costosos | Prioritzar tests de helpers i smoke manual si no hi ha patro net. |

## PR 2 - Storage Rules

Objectiu: tancar H-003.

Fitxers probables:

- `storage.rules`
- `src/lib/__tests__/storage-rules-write-perimeter.test.ts`

Canvis:

- Afegir helpers de mida maxima per tipus de prefix.
- Afegir content types permesos.
- Rebutjar `text/html`, JS, SVG i `application/octet-stream` en prefixes sensibles si no hi ha cas valid documentat.
- Separar permisos per capability quan el model actual ho permeti sense trencar fluxos.

Tests:

- PDF/imatge valida acceptada al prefix correcte.
- HTML/JS/SVG rebutjat.
- Fitxer massa gran rebutjat.
- Usuari d'org A no pot escriure a org B.
- Viewer no pot escriure.

## PR 3 - Build hardening, headers i contacte

Objectiu: M-001, M-003 i M-004.

Fitxers probables:

- `next.config.ts`
- `src/app/api/contact/route.ts`
- `src/lib/api/rate-limit.ts`
- `src/lib/__tests__/rate-limit.test.ts`

Canvis:

- Desactivar `productionBrowserSourceMaps`.
- Treure `typescript.ignoreBuildErrors` i `eslint.ignoreDuringBuilds` si el build ho permet.
- Afegir headers base compatibles.
- Afegir rate limit al formulari de contacte.

Risc:

- Headers massa estrictes poden trencar recursos externs. Fer smoke de pagina publica i app privada.
- Treure ignores pot descobrir deute de build. Si bloqueja, documentar i separar en PR tecnic curt.

## PR 4 - Invitacions i SuperAdmin client

Objectiu: M-002 i L-001.

Fitxers probables:

- `src/lib/invitations/utils.ts`
- `src/app/api/invitations/create/handler.ts`
- `src/app/api/invitations/resolve/route.ts`
- `src/app/api/invitations/accept/handler.ts`
- `src/lib/members-import.ts`
- Components/hooks que fan gating SuperAdmin client.

Canvis invitacions:

- Generar token amb `randomBytes(32).toString('base64url')` o hex equivalent.
- Guardar `tokenHash`, no token en clar, per invitacions noves.
- Acceptar legacy temporal per invitacions vives amb `token` antic.
- No migracio destructiva.

Tests:

- Token nou no predictible.
- Payload nou no conte token clar.
- Token correcte accepta.
- Token incorrecte/caducat/usat falla.
- Email binding es mante.
- Legacy vigent continua acceptable durant transicio.

Canvis SuperAdmin:

- Garantir que endpoints sensibles nomes usen `systemSuperAdmins/{uid}` o helper backend equivalent.
- Reduir constants client a UI visual o substituir-les per estat derivat segur.

## Criteris generals de merge

No mergejar si:

- Una ruta critica continua executant IA/email sense auth.
- `extract-ticket` pot fer `fetch()` a URL arbitraria no allowlisted.
- Storage accepta HTML/JS/SVG en prefixes sensibles.
- Build continua ignorant TypeScript/ESLint sense justificacio temporal.
- Invitacions noves continuen guardant token clar.
- Un hardcode client de SuperAdmin es usa com a decisio de seguretat.

## Retorn esperat de cada PR

Cada PR ha de reportar:

- Fitxers tocats i motiu.
- Contracte nou dels endpoints o regles afectades.
- Tests executats.
- Callers adaptats.
- Riscos residuals.
- Confirmacions:
  - No deps noves.
  - No canvis destructius Firestore.
  - No `undefined` a Firestore.
  - Batches Firestore <= 50 si aplica.
