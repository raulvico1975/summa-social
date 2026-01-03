# DEV SOLO MANUAL — SUMMA SOCIAL

> Manual operatiu per al mantenidor únic del projecte.
> Objectiu: tornar a entendre el projecte en 10 minuts després de mesos sense tocar-lo.

---

## 0. Com usar aquest document (30 segons)

1. **Estàs perdut?** Comença per la secció 2 (Mapa d'eines)
2. **Tens un problema d'usuari?** Secció 3 (Fluxos de suport)
3. **Has de tocar codi?** Secció 4.1 (Checklist abans de producció)
4. **No recordes on és algo?** Secció 6 (Estructures del codi)

No llegeixis tot. Consulta el que necessitis.

---

## 1. Mapa del sistema (què és i què NO és Summa Social)

### Què FA Summa Social

- **Conciliació bancària real**: Importació de moviments bancaris (Norma 43, CSV)
- **Control de saldos**: Seguiment de balanç operatiu per període
- **Classificació determinista**: Categories, projectes, donants
- **Fiscalitat espanyola**: Model 182, Model 347, certificats de donació
- **Exports per a gestories**: Excel, CSV, formats estàndard

### Què NO és Summa Social

- ❌ **NO és un ERP genèric** — No gestiona inventari, nòmines, facturació completa
- ❌ **NO és un gestor de projectes** — El mòdul projectes és només per justificació econòmica
- ❌ **NO és comptabilitat formal** — És pre-comptabilitat per entitats petites
- ❌ **NO és multi-país** — Només Espanya (fiscalitat, formats bancaris)

### Stack tecnològic

| Capa | Tecnologia |
|------|------------|
| Frontend | Next.js 14 (App Router), React 18, TypeScript |
| Estils | Tailwind CSS, shadcn/ui |
| Backend | Firebase (Firestore, Auth, Storage, Functions) |
| Hosting | Firebase Hosting / App Hosting |
| Idiomes | Català (principal), Castellà, Francès |

---

## 2. Mapa d'eines (on mirar segons el problema)

| Eina | Per a què | Quan s'hi entra |
|------|-----------|-----------------|
| **Firebase Console** | Veure dades, usuaris, logs | Diagnòstic de producció, veure errors |
| **Cloud Logging** | Logs detallats de Cloud Functions | Errors de remeses, importacions, emails |
| **GitHub** | Codi font, PRs, historial | Canvis de codi, revisar versions |
| **VS Code + Claude Code** | Desenvolupament local | Fer canvis, debugging |
| **`/docs`** | Documentació del projecte | Entendre decisions, especificacions |
| **`/admin`** | Panell SuperAdmin | Gestió d'organitzacions, reset passwords |

### Enllaços ràpids

- Firebase Console: `console.firebase.google.com` → projecte `summa-social`
- Cloud Logging: Firebase Console → Build → Functions → Logs
- GitHub: (afegir URL del repositori)

---

## 3. Fluxos de suport habituals

### 3.1 Usuari no pot iniciar sessió

**Flux correcte (l'usuari ho fa sol):**
1. Pantalla login → "Has oblidat la contrasenya?"
2. Introdueix email
3. Rep correu de Firebase Auth
4. Restableix contrasenya

**Rol del SuperAdmin:**
- **Pot fer:** Enviar correu de reset des de `/admin` → Usuaris → "Enviar reset"
- **NO pot fer:** Veure ni canviar contrasenyes manualment
- **NO ha de fer:** Crear contrasenyes noves per l'usuari

**Si el correu no arriba:**
1. Verificar que l'email és correcte
2. Mirar carpeta spam
3. Comprovar a Firebase Console → Authentication si l'usuari existeix

---

### 3.2 Problemes d'importació

(pendent d'omplir)

---

### 3.3 Desquadraments i saldos

(pendent d'omplir)

---

### 3.4 Errors amb remeses / splits

(pendent d'omplir)

---

## 4. Checklists "no pensar"

### 4.1 Abans de tocar producció

```
□ git status → branca neta, sense canvis pendents
□ git pull → tinc l'última versió
□ npm run build → compila sense errors
□ Estic a la branca correcta (master o feature branch)
□ He llegit el que vaig a tocar (no codi a cegues)
□ Tinc backup mental del que faré (puc desfer-ho)
```

**Regla d'or:** Si no pots explicar el canvi en una frase, no el facis.

---

### 4.2 Desplegament

(pendent d'omplir)

---

### 4.3 Incidències

Consulta la secció 9 (Salut del sistema).

---

## 5. Glossari mínim del sistema

| Terme | Significat |
|-------|------------|
| **Transacció** | Moviment bancari (positiu = ingrés, negatiu = despesa) |
| **Contacte** | Donant, proveïdor, soci... qualsevol entitat externa |
| **Remesa** | Agrupació de transaccions (donacions domiciliades, pagaments SEPA) |
| **Split** | Divisió d'una transacció en parts assignades a projectes |
| **Projecte** | Eix d'actuació per justificació (subvencions, programes) |
| **Partida** | Línia de pressupost dins d'un projecte |
| **Categoria** | Classificació comptable (nòmines, subministraments, donacions...) |

---

## 6. Estructures del codi que sempre s'obliden

### Carpetes clau

```
src/
├── app/                    # Pàgines (Next.js App Router)
│   ├── [orgSlug]/         # Rutes per organització (multi-tenant)
│   │   └── dashboard/     # Tot el dashboard
│   └── admin/             # Panell SuperAdmin
├── components/            # Components React reutilitzables
├── lib/                   # Lògica de negoci pura (NO React)
│   └── data.ts           # TIPUS PRINCIPALS (Transaction, Contact, Organization...)
├── hooks/                 # Custom hooks
├── firebase/              # Configuració i helpers Firebase
└── i18n/                  # Traduccions (ca.ts, es.ts, fr.ts)
```

### Fitxers "punt d'entrada"

| Fitxer | Conté |
|--------|-------|
| `src/lib/data.ts` | Tots els tipus TypeScript del sistema |
| `src/lib/normalize.ts` | Funcions de format (moneda, dates, NIF) |
| `src/firebase/index.tsx` | Hooks Firebase (`useCollection`, `useDocument`) |
| `src/hooks/organization-provider.tsx` | Context de l'organització actual |
| `src/i18n/index.tsx` | Hook `useTranslations()` |

### Patrons que si es trenquen fan mal

1. **Multi-tenant via `[orgSlug]`**: Tota dada viu sota `/organizations/{orgId}/...`
2. **Firestore Rules**: Defineixen qui pot llegir/escriure — no tocar sense revisar
3. **Tipus a `data.ts`**: Si canvies un tipus, pot trencar moltes coses
4. **Cloud Functions**: Són backend real — errors aquí no es veuen a la UI

---

## 7. SuperAdmin global: què pot fer i què NO

### Pot fer (des de `/admin`)

- Llistar totes les organitzacions
- Crear noves organitzacions
- Suspendre/reactivar organitzacions
- Entrar a qualsevol organització (mode admin)
- Enviar correus de reset de contrasenya

### NO pot fer (i no ha de poder)

- Veure contrasenyes d'usuaris
- Editar dades internes d'organitzacions (moviments, contactes...)
- Esborrar organitzacions de forma permanent
- Modificar Firestore Rules o Cloud Functions des de la UI

### Detecció de SuperAdmin

```typescript
// src/lib/data.ts
export const SUPER_ADMIN_UID = 'f2AHJqjXiOZkYajwkOnZ8RY6h2k2';

// Ús típic
const isSuperAdmin = user?.uid === SUPER_ADMIN_UID;
```

---

## 8. Històric i punts sensibles del projecte

(pendent d'omplir — afegir aquí decisions importants, canvis que van costar, coses que no tocar)

---

## 9. Salut del sistema (Sentinelles)

El panell `/admin` inclou un bloc **"Salut del sistema"** que detecta problemes automàticament.

### Què mirar diàriament

1. Entra a `/admin` i mira el bloc de sentinelles
2. Si tot és 🟢, no cal fer res
3. Si hi ha 🔴 vermell, obre "Veure incidents" i actua

### Què mirar setmanalment

1. S6 Encallaments: transaccions > 30 dies sense classificar
2. S7 Fiscal 182: donants sense dades fiscals completes
3. S8 Activitat: organitzacions inactives > 60 dies

Aquestes són consultes, no generen alertes automàtiques.

### Sentinelles (S1–S8)

| ID | Nom | Tipus | Què detecta |
|----|-----|-------|-------------|
| S1 | Permisos | CRITICAL | Errors "Missing or insufficient permissions" |
| S2 | Moviments | CRITICAL | Errors a la pantalla de moviments |
| S3 | Importadors | CRITICAL | Errors d'importació (banc, CSV, Stripe) |
| S4 | Exports | CRITICAL | Errors d'exportació (Excel, PDF, SEPA) |
| S5 | Remeses OUT | CRITICAL | Invariants violades (deltaCents≠0, isValid=false) |
| S6 | Encallaments | CONSULTA | Transaccions sense classificar > 30 dies |
| S7 | Fiscal 182 | CONSULTA | Donants sense dades fiscals |
| S8 | Activitat | CONSULTA | Organitzacions inactives > 60 dies |

### Com actuar davant un incident

1. **Clica l'icona ❓** per veure:
   - Què passa (descripció)
   - Impacte (per què és important)
   - Primers passos (1-2 accions concretes)

2. **Opcions d'acció:**
   - **ACK**: Silencia l'incident temporalment (l'has vist però encara no l'has resolt)
   - **Resolt**: Tanca l'incident (el problema s'ha corregit)

3. **Si es repeteix el mateix error:** L'incident es reobre automàticament amb comptador incrementat.

### Errors ignorats (anti-soroll)

Aquests errors NO generen incidents:
- `ERR_BLOCKED_BY_CLIENT` — Adblockers o extensions
- `ResizeObserver loop` — Error benigne de layout
- `ChunkLoadError` / `Loading chunk` — Problemes de xarxa
- `Network request failed` / `Failed to fetch` — Xarxa temporal
- `Script error.` — Errors cross-origin sense info útil
- `AbortError` — Requests cancel·lats intencionalment

### Test manual de verificació

Per validar que el sistema funciona:

1. **Test CLIENT_CRASH:**
   - Afegeix `throw new Error('Test incident')` a qualsevol component
   - Recarrega la pàgina
   - Verifica que apareix incident a `/admin`

2. **Test PERMISSIONS:**
   - Intenta accedir a dades d'una altra org sense permisos
   - Verifica que apareix incident tipus PERMISSIONS

3. **Test anti-soroll:**
   - Els errors `ERR_BLOCKED_BY_CLIENT` (adblockers) NO han de crear incidents

### Què fer quan rebo un email d'alerta (v1.1)

1. **Obre el link** `/admin` de l'email i localitza l'incident
2. **Copia el prompt** clicant el botó 📋 o "Copiar prompt de reparació"
3. **Enganxa a Claude Code** i deixa que proposi el fix mínim + QA

**Opcions després de copiar:**
- Si vas a treballar-hi ara: deixa l'incident OPEN
- Si l'has vist però no pots ara: fes **ACK** (silencia 24h)
- Si l'has resolt: fes **Resolt**

**Per desactivar alertes email ràpidament (kill switch):**
```bash
firebase functions:config:set alerts.enabled=false
firebase deploy --only functions
```

### Checklist QA pre-prod (alertes email v1.1)

Abans d'activar `ALERTS_ENABLED=true` en producció:

```
□ 1. Config dev OFF
   - Confirmar alerts.enabled=false a dev
   - Verificar que no s'envia cap email encara que hi hagi incidents

□ 2. Config prod
   - firebase functions:config:set resend.api_key="re_xxx"
   - firebase functions:config:set alert.email="raul.vico.ferre@gmail.com"
   - firebase functions:config:set alerts.enabled=true
   - firebase deploy --only functions

□ 3. Test crash ruta core
   - Injectar throw new Error("TEST_CORE_CRASH") a Moviments
   - Recarregar 2 cops → incident OPEN amb count>=2 → 1 email
   - Verificar que el cos inclou link a /admin + prompt

□ 4. Test ACK
   - Marcar l'incident com ACK
   - Recarregar 5 cops → count puja però 0 emails nous

□ 5. Test RESOLVED + reaparició
   - Posar RESOLVED
   - Reproduir de nou → ha de reobrir a OPEN
   - No email si dins del cooldown 24h

□ 6. Test soroll filtrat
   - Reproduir ERR_BLOCKED_BY_CLIENT → no incident

□ 7. Test sanitització
   - Verificar que prompt i email no contenen emails d'usuaris, IBANs ni tokens

□ 8. Test idempotència
   - Recàrregues ràpides al mateix incident → 1 sol email
```

---

## 10. Novetats del producte — Ritual de publicació

Quan publiques una novetat nova des de SuperAdmin (`/admin` → Novetats):

### Flux complet

```
1. Publicar ─────────────────────────────────────────────────────
   □ Crear novetat a SuperAdmin (omplir camps o usar "Generar amb IA")
   □ Revisar preview (App / Web / X / LinkedIn)
   □ Clicar "Publicar"
   → La campaneta de les instàncies mostrarà la novetat immediatament

2. Exportar JSON (si web.enabled = true) ────────────────────────
   □ Clicar "Exportar web JSON" al SuperAdmin
   □ Es descarrega novetats-data.json

3. Commit ───────────────────────────────────────────────────────
   □ Substituir public/novetats-data.json amb el fitxer descarregat
   □ git add public/novetats-data.json
   □ git commit -m "docs(novetats): actualitzar web JSON - [títol breu]"

4. Deploy ───────────────────────────────────────────────────────
   □ git push (App Hosting desplega automàticament)
   □ Verificar que /ca/novetats mostra la nova entrada
```

### Checklist ràpid

```
□ Campaneta funciona? → No cal deploy
□ Web públic necessita actualització? → Exportar + Commit + Deploy
□ Social? → Copiar textos des de preview, publicar manualment
```

### Guardrails (no negociables)

- **NO HTML** a Firestore — sempre text pla estructurat
- **NO `dangerouslySetInnerHTML`** — render segur via `renderStructuredText()`
- **NO Firestore públic** — web llegeix JSON estàtic
- **NO deps noves** — tot funciona amb stack existent

---

## 11. Entorn DEMO

### 1. Propòsit

- **Què és**: Instància completament separada de producció amb Firebase project propi (`summa-social-demo`)
- **Per a què serveix**: Demos comercials, captures de pantalla, tests visuals, formació
- **Per a què NO serveix**: Producció, dades reals, tests d'integració amb serveis externs

### 2. Principis clau

| Principi | Descripció |
|----------|------------|
| Firebase project separat | `summa-social-demo` — zero risc per a prod |
| Dades 100% sintètiques | Noms, IBANs, imports... tot és fals |
| Regenerable | Botó a `/admin` per tornar a l'estat inicial |
| Sense serviceAccountKey | Usa ADC (Application Default Credentials) |
| Bypass de rols UI | Qualsevol usuari autenticat pot navegar |

### 3. Requisits previs (locals)

```bash
# Node.js (versió del projecte)
node -v

# gcloud CLI instal·lat
gcloud --version

# Autenticar ADC (només primer cop o quan expira)
gcloud auth application-default login

# Accés al projecte Firebase demo
# (has de tenir permisos a summa-social-demo)
```

### 4. Arrencada DEMO

```bash
npm run dev:demo
```

**Què ha d'aparèixer:**
- Terminal: `[DEMO] Projecte: summa-social-demo`
- Browser: http://localhost:9002
- Badge "DEMO" visible a navbar i `/admin`

**Fitxers clau:**

| Fitxer | Funció |
|--------|--------|
| `.env.demo` | Config Firebase demo + `SUPERADMIN_EMAIL` + `SUPER_ADMIN_UID` |
| `scripts/run-demo-dev.mjs` | Runner que carrega env i neteja credencials |
| `src/lib/demo/isDemoOrg.ts` | `isDemoEnv()` client+server |

### 5. Regenerar dades (DemoMode dual)

#### Modes disponibles

| Mode | Descripció | Ús típic |
|------|------------|----------|
| **Short** | Dades netes, sense anomalies | Vídeos, pitch, captures |
| **Work** | Dades amb "fang" controlat | Validar workflows reals |

#### Regenerar

1. Ves a http://localhost:9002/admin
2. Secció "Entorn DEMO" (només visible en demo)
3. **Selecciona mode**: Short o Work
4. Clica "Regenerar demo" → confirmació obligatòria
5. Espera ~10-30s

**Qui pot fer-ho**: Usuari amb email a `SUPERADMIN_EMAIL` o UID a `SUPER_ADMIN_UID` de `.env.demo`

**Què fa el seed**:
- Purga totes les dades demo existents (`isDemoData: true`)
- Crea org `demo-org` amb slug `demo`
- Genera contactes, categories, transaccions, projectes, partides, despeses
- Puja PDFs dummy a Storage
- **Mode work**: Afegeix anomalies controlades

#### Volums (base)

| Entitat | Quantitat |
|---------|-----------|
| Donants | 50 |
| Proveïdors | 20 |
| Treballadors | 8 |
| Categories | 16 |
| Transaccions bank | 100 |
| Projectes | 4 |
| Partides | 40 |
| Off-bank expenses | 30 (10 XOF + 10 HNL + 10 DOP) |
| ExpenseLinks | 20 (10 full + 10 mixed) |
| PDFs | 20 |

#### Anomalies (només mode Work)

| Anomalia | Quantitat | Descripció |
|----------|-----------|------------|
| Duplicats | 3 parells | Concepte similar, mateixa data, import ±1% |
| Mal categoritzat | 1 | Ingrés amb categoria de despesa |
| Pendents | 5 | Moviments sense categoria ni contacte |
| Traçabilitat | 1 factura | 3 moviments compartint 1 PDF |

#### Microcopy a la UI

Quan `isDemoEnv() === true`:
- Badge "DEMO" al header amb tooltip: "Dades sintètiques de demo"
- Secció "Entorn DEMO" visible a `/admin`
- Selector de mode (Short/Work) abans de regenerar

#### Validació ràpida

```bash
# Smoke test (sense autenticació)
npm run demo:smoke

# Validació completa
# 1. Arrenca la demo
npm run dev:demo

# 2. Login a /admin, regenera Short
# 3. Comprova: /demo/dashboard net, 100 tx, 20–30 recents

# 4. Regenera Work
# 5. Comprova: duplicats visibles, pendents sense categoria
```

#### Guardrails

- ❌ **NO editar dades manualment** a Firestore/Storage en demo — sempre usar seed
- ❌ **NO relaxar Firestore rules** — les mateixes que prod
- ✅ El seed valida invariants automàticament (throw si falla)

### 6. Autenticació i permisos

**En DEMO:**
- `isDemoEnv()` retorna `true` (client i server)
- Bypass de rols a UI: qualsevol usuari autenticat pot veure tot
- El seed valida SuperAdmin via Firebase ID Token (no headers falsificables)
- ADC substitueix serviceAccountKey per Admin SDK

**Diferència amb prod:**
- En prod, `isDemoEnv()` retorna `false`
- Els rols i permisos funcionen normalment
- Usa serviceAccountKey (no ADC)

**⚠️ NO copiar patrons DEMO a prod** — el bypass de rols és només per UX de demo

### 7. Problemes coneguts i solucions

| Problema | Causa | Solució |
|----------|-------|---------|
| No puc descarregar serviceAccountKey | Google Workspace bloqueja claus privades | Usar ADC: `gcloud auth application-default login` |
| "Could not load default credentials" | ADC no configurat o expirat | Executar `gcloud auth application-default login` |
| "Cannot use undefined as Firestore value" | Camp `projectId` buit en algunes despeses | Sanejador a `writeBatch()` filtra camps undefined |
| "No tens accés a aquesta organització" | UID no és membre ni SuperAdmin hardcodejat | `isDemoEnv()` fa bypass a `organization-provider.tsx` |
| "Slug demo no té organització associada" | Mapping `slugs/demo` tenia camp incorrecte | Seed escriu `orgId` (no `organizationId`) |
| "Firestore has already been initialized" | `db.settings()` cridat després d'altres operacions | Eliminat `db.settings()`, inicialització cached |

### 8. Què NO s'ha de fer

- ❌ **No fer seed des del client/browser** — sempre via API route amb Admin SDK
- ❌ **No relaxar Firestore rules globals** — les rules són les mateixes que prod
- ❌ **No reutilitzar DEMO per producció** — projectes Firebase separats
- ❌ **No confiar en headers manuals per auth** — usar Firebase ID Token verificat
- ❌ **No cridar `db.settings()` en runtime** — provoca crash en hot reload

### Fitxers modificats per DEMO

| Fitxer | Canvi |
|--------|-------|
| `src/lib/demo/isDemoOrg.ts` | `isDemoEnv()` mira `NEXT_PUBLIC_APP_ENV` + `APP_ENV` |
| `src/lib/admin/superadmin-allowlist.ts` | Accepta `SUPERADMIN_EMAIL` de env |
| `src/app/api/internal/demo/seed/route.ts` | Auth via ID Token, ADC, demoMode param |
| `src/scripts/demo/seed-demo.ts` | `runDemoSeed(db, bucket, demoMode)`, anomalies work |
| `src/scripts/demo/demo-generators.ts` | Generadors deterministes amb volums actualitzats |
| `src/hooks/organization-provider.tsx` | Bypass accés si `isDemoEnv()` |
| `src/components/dashboard-header.tsx` | Badge DEMO amb tooltip microcopy |
| `src/app/admin/page.tsx` | Selector Short/Work, diàleg confirmació |
| `scripts/run-demo-dev.mjs` | Neteja `GOOGLE_APPLICATION_CREDENTIALS` |

---

## 12. Mode Rescat (admin)

El **Mode Rescat** és un bypass temporal per recuperar accés a `/admin` quan el sistema de SuperAdmin via Firestore no funciona.

### Quan usar-lo

- No pots accedir a `/admin` tot i estar autenticat
- El document `systemSuperAdmins/{uid}` no existeix o hi ha problemes de permisos
- Necessites accés urgent per administrar organitzacions

### Com activar-lo

1. Obrir `src/app/admin/page.tsx`
2. Canviar `const RESCUE_MODE = false;` → `const RESCUE_MODE = true;`
3. Deploy o `npm run dev`

### Què passa en Mode Rescat

| Aspecte | Comportament |
|---------|--------------|
| **Accés** | Qualsevol usuari autenticat pot entrar |
| **Banner** | Taronja indicant "Mode rescat activat" |
| **Crear org** | ❌ Desactivat |
| **Migrar slugs** | ❌ Desactivat |
| **Suspendre/Reactivar** | ❌ Desactivat |
| **I18n Manager** | ❌ Desactivat |
| **SuperAdmins Manager** | ❌ Desactivat |
| **Veure orgs** | ✅ Funciona |
| **Entrar a org** | ✅ Funciona |

### Com desactivar-lo

1. Assegurar que el teu UID existeix a `systemSuperAdmins/{uid}` a Firestore
2. Canviar `const RESCUE_MODE = true;` → `const RESCUE_MODE = false;`
3. Deploy

### ⚠️ Advertència

El Mode Rescat elimina tota seguretat d'accés a `/admin`. Només usar-lo temporalment per recuperar control i desactivar-lo immediatament després.

---

## 13. Hub de Guies (v1.27)

### Què és

Centre d'autoajuda per usuaris a `/dashboard/guides`. Permet trobar guies procedimentals sense contactar suport.

### Cercador natural

El cercador usa **scoring determinista** (sense IA):

| Match | Punts |
|-------|-------|
| Títol | +50 |
| Resum | +20 |
| Text card | +10 |
| Sinònim | +5 a +45 |

**Sinònims**: L'usuari escriu "no veig moviments" → el sistema troba guies de "moviments" gràcies al diccionari de sinònims a `guides.search.syn.*`.

### Fitxers clau

| Fitxer | Funció |
|--------|--------|
| `src/app/[orgSlug]/dashboard/guides/page.tsx` | Pàgina principal amb cercador |
| `src/i18n/locales/*.json` | Claus `guides.search.*` (stopwords, synonyms, suggestions) |
| `scripts/i18n/validate-guides-translations.ts` | Validador de claus de cerca |

### Afegir sinònims nous

1. Edita `src/i18n/locales/ca.json` (i es/fr/pt):
```json
"guides.search.syn.nou_terme.0": "variant1",
"guides.search.syn.nou_terme.1": "variant2"
```

2. Afegeix el canònic al validador (`SEARCH_SYNONYM_CANONICALS`)

3. Executa `npm run i18n:validate-guides`

---

## 14. Patrons de Layout (v1.27)

### Problema: icones del header desapareixen

**Símptoma**: En pantalles estretes (o amb taules amples), les icones d'ajuda i notificacions del header desapareixen.

**Causa**: Contingut amb `min-width` fixa (ex: `TransactionsTable` amb `min-w-[600px]`) expandeix el contenidor més enllà del viewport.

**Solució aplicada a `layout.tsx`**:

```tsx
<SidebarInset className="flex min-w-0 flex-1 flex-col overflow-x-hidden ...">
```

| Propietat | Per què |
|-----------|---------|
| `min-w-0` | Permet que flex children es comprimeixin |
| `overflow-x-hidden` | Evita que contingut ample expandeixi el contenidor |

### Pattern header responsive

```tsx
<header className="flex items-center justify-between gap-2">
  {/* Bloc esquerra: degradable */}
  <div className="flex min-w-0 flex-1 items-center gap-2">
    {/* Breadcrumb amb truncate */}
  </div>
  {/* Bloc dreta: fix */}
  <div className="flex shrink-0 items-center gap-2">
    <HelpSheet />
    <NotificationBell />
  </div>
</header>
```

**Regla**: El bloc dreta (`shrink-0`) mai es comprimeix. El breadcrumb es trunca si cal.

---

## 15. Next.js 15 — Canvis importants

### searchParams és Promise

A Next 15, `searchParams` a les pàgines és un `Promise`:

```tsx
// ❌ Next 14 (no funciona a Next 15)
export default function Page({ searchParams }: { searchParams: Record<string, string> }) {
  const value = searchParams.key;
}

// ✅ Next 15
export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const value = params.key;
}
```

**Fitxers afectats**: Qualsevol `page.tsx` que usi `searchParams`.

**Error típic**: `TS2344: Type '{ searchParams: Record<...> }' does not satisfy the constraint 'PageProps'`

---

*Última actualització: 2026-01-03*
