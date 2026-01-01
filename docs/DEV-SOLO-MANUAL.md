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

L'entorn DEMO és una instància completament separada de producció, amb dades 100% sintètiques per a demostracions i captures.

### Característiques

| Aspecte | Comportament |
|---------|--------------|
| **Firebase project** | `summa-social-demo` (separat de prod) |
| **Dades** | 100% sintètiques, regenerables |
| **Rols UI** | No hi ha fricció per rols (qualsevol pot navegar tot) |
| **Regeneració** | Només SuperAdmin (botó a `/admin`) |
| **Integracions** | Visibles en mode "desconnectat" (Stripe, banc, email) |
| **ACL Firestore** | Intacte (el backend no canvia) |

### Com arrencar DEMO

```bash
# 1. Assegura't que tens .env.demo omplert amb credencials del projecte demo
# 2. Assegura't que tens secrets/serviceAccountKey-demo.json

# 3. Arrenca amb:
npm run dev:demo
```

### Fitxers clau

| Fitxer | Funció |
|--------|--------|
| `.env.demo` | Variables d'entorn per Firebase demo |
| `secrets/serviceAccountKey-demo.json` | Service account Admin SDK |
| `src/lib/demo/isDemoOrg.ts` | Helper `isDemoEnv()`, `isDemoOrg()` |
| `src/lib/demo/demoIntegrations.ts` | Estat d'integracions en demo |
| `scripts/run-demo-dev.mjs` | Runner que carrega .env.demo |

### Regenerar dades demo

1. Entra a `/admin` (cal ser SuperAdmin)
2. Secció "Entorn DEMO" visible només en mode demo
3. Clicar "Regenerar demo" → confirmació obligatòria
4. Esperar 10-30s segons el volum

### Volums de seed

| Entitat | Quantitat |
|---------|-----------|
| Donants | 120 |
| Proveïdors | 35 |
| Treballadors | 12 |
| Transaccions | ~700 (18 mesos) |
| Projectes | 4 |
| Partides | 40 |
| Despeses off-bank | 160 |
| PDFs Storage | 30 |

### Guardrails DEMO

- ❌ **No hi ha rols a UI** — però l'ACL de Firestore és el mateix
- ❌ **No es fan calls reals** — Stripe, email, banc desconnectats
- ❌ **Regenerar només SuperAdmin** — amb confirmació obligatòria
- ✅ **Identificació clara** — Badge "DEMO" a navbar i admin

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

*Última actualització: 2026-01-01*
