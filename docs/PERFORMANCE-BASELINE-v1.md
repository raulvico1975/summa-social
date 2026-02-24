# PERFORMANCE BASELINE v1

## Context de mesura

- Data de mesura: 2026-02-17
- Build analitzat: `npm run build` (Next.js 15.5.7)
- Fitxer de build output: `tmp/performance-build-output.log`
- Baseline JSON: `docs/PERFORMANCE-BASELINE-v1.json`
- Script d'anàlisi: `scripts/performance/analyze-build-size.mjs`

Nota: per aquesta worktree, el build ha requerit variables Firebase dummy per completar el prerender (sense impacte en lògica de negoci):
`NEXT_PUBLIC_FIREBASE_PROJECT_ID` i `NEXT_PUBLIC_FIREBASE_API_KEY`.

## Estat actual

Llindars d'estat usats en aquest informe:
- 🔴 Crític: `> 600 kB` First Load JS
- 🟡 Alt: `350–600 kB` First Load JS
- 🟢 Controlat: `< 350 kB` First Load JS

| Ruta | First Load JS | Estat |
|---|---:|---|
| `/admin` | 753 kB | 🔴 Crític |
| `/[orgSlug]/dashboard/donants` | 739 kB | 🔴 Crític |
| `/[orgSlug]/dashboard/movimientos` | 719 kB | 🔴 Crític |
| `/[orgSlug]/dashboard/informes` | 706 kB | 🔴 Crític |
| `/[orgSlug]/dashboard` | 642 kB | 🔴 Crític |
| `/[orgSlug]/dashboard/project-module/projects/[projectId]/budget` | 640 kB | 🔴 Crític |
| `/[orgSlug]/dashboard/configuracion` | 629 kB | 🔴 Crític |
| `/[orgSlug]/login` | 372 kB | 🟡 Alt |
| `/registre` | 374 kB | 🟡 Alt |
| `/public/[lang]` | 111 kB | 🟢 Controlat |

## Dades clau de bundle

- Largest route (First Load JS): `/admin` amb `753 kB`
- First Load JS shared by all (build output): `102 kB`
- Shared chunks JS (manifest, mida en disc): `451.57 kB`
- Top 3 chunks >200 kB detectats:
  - `static/chunks/5823-56b73bfaa283ecfe.js` → `1125.5 kB` (admin)
  - `static/chunks/563-94840d2c4dbea18c.js` → `465.04 kB` (28 rutes)
  - `static/chunks/2170a4aa-f45f143aeaf194ed.js` → `399.71 kB` (8 rutes)

## Top 5 rutes més pesades

(Pes total de JS per ruta segons manifest + First Load JS de sortida Next)

| Ruta | JS total per ruta (manifest) | First Load JS (build) |
|---|---:|---:|
| `/admin` | 2723.55 kB | 753 kB |
| `/[orgSlug]/dashboard/donants` | 2344.68 kB | 739 kB |
| `/[orgSlug]/dashboard/movimientos` | 2319.05 kB | 719 kB |
| `/[orgSlug]/dashboard/informes` | 2231.15 kB | 706 kB |
| `/[orgSlug]/dashboard` | 2048.33 kB | 642 kB |

## Chunk 5823 forensic

- Fitxer: `.next/static/chunks/5823-56b73bfaa283ecfe.js` (`1,152,508 bytes`, ~`1.10 MB`)
- Sourcemap: `.next/static/chunks/5823-56b73bfaa283ecfe.js.map` (`46 KB`)
- Evidència generada amb:
  - `scripts/performance/inspect-chunk-sourcemap.mjs`
  - `scripts/performance/find-chunk-owners.mjs`
  - outputs: `tmp/chunk-5823-sourcemap-analysis.json`, `tmp/chunk-5823-owners.json`

### Owners (rutes detectades)

- App manifest entries: `/admin/page`, `/layout`
- Rutes normalitzades: `/admin`, `/layout`
- Shared chunk global (`rootMainFiles/polyfillFiles`): **No**

### Top node_modules packages (sourcemap)

| Package | Count |
|---|---:|
| _No hi ha entrades `node_modules` al sourcemap d'aquest chunk_ | 0 |

Indicadors de llibreries pesades al `sources[]` (xlsx/pdf/charts/editor/firebase/genkit): **cap coincidència directa**.

### Top local sources (sourcemap)

| Carpeta local | Count |
|---|---:|
| `src/i18n` | 1 |
| `src/hooks` | 1 |
| `src/lib` | 1 |

### Local imports detectats dins sourcesContent

| Fitxer local resolt | Mida |
|---|---:|
| `src/i18n/locales/fr.json` | 293.43 kB |
| `src/i18n/locales/pt.json` | 292.70 kB |
| `src/i18n/locales/es.json` | 285.58 kB |
| `src/i18n/locales/ca.json` | 281.04 kB |

### Hipòtesis tècniques (origen del pes)

1. `src/i18n/json-runtime.ts` importa de forma estàtica `ca/es/fr/pt` (`./locales/*.json`), i la suma d'aquests fitxers és ~`1.15 MB`; això encaixa amb la mida del chunk 5823.
2. El chunk també inclou codi de `src/lib/system-incidents.ts` i `src/hooks/use-toast.ts`, que enllaça codi d'incidents/admin dins el mateix paquet carregat a `/admin`.

### Fix mínim recomanat (estat feb 2026)

- `lazy import`: carregar bundle d'idioma sota demanda (no importar `ca/es/fr/pt` tots al mateix mòdul client d'entrada). **Pendent.**
- `split component`: a `/admin`, carregar seccions pesades (diagnòstic/incidents/ajudes) només quan s'obren. **Pendent.**
- `server-only` quan sigui viable: moure lògica/textos de suport cap a API/server layer. **Pendent.**

**Millores implementades (v1 → post-split, feb 2026):**
- `xlsx` i `jspdf` convertits a `import()` dinàmic dins handlers (lazy loading sota demanda)
- Reducció First Load JS: `/informes` −42%, `/movimientos` −25%

## Components sospitosos

1. `src/components/transactions-table.tsx`
   - Importa `xlsx` i `StripeImporter` en el camí crític de moviments.
   - Correlaciona amb chunk propi de ruta de moviments de `341.45 kB`.

2. `src/components/transaction-importer.tsx`
   - Importa `papaparse` + `xlsx` a inicialització de component.
   - Penalitza rutes de dashboard/moviments.

3. `src/app/[orgSlug]/dashboard/informes/page.tsx`
   - Munta directament `DonationsReportGenerator`, `SuppliersReportGenerator` i `DonationCertificateGenerator`.
   - Aquests generadors importen `xlsx`, `papaparse` i `jspdf`.

4. `src/app/[orgSlug]/dashboard/project-module/projects/[projectId]/budget/page.tsx`
   - Importa utilitats d'export pesades (`project-justification-export` amb `xlsx` i `project-justification-attachments-zip` amb `jszip`).

5. `src/app/admin/page.tsx`
   - Super-pàgina molt carregada de seccions i dependències; concentra chunk únic de `1125.5 kB`.

## Recomanacions tècniques prioritzades

### 🟢 Fàcil (quick wins)

- Lazy load de blocs de report a `src/app/[orgSlug]/dashboard/informes/page.tsx` amb `next/dynamic`.
- Carregar `StripeImporter` i funcionalitat d'export només quan l'usuari obre modal/acció.
- Lazy load de subseccions admin no crítiques (diagnòstic, editorial, i18n tools).

### 🟡 Mitjà

- Dividir `TransactionsTable` en shell lleuger + mòduls de fluxs pesats (importació, split Stripe, export).
- Separar utilitats d'export (`xlsx`, `papaparse`, `jspdf`, `jszip`) en imports dinàmics dins handlers.
- Fer split de `DonorManager` i components auxiliars de detall/export per reduir càrrega de `/donants`.

### 🔴 Complex

- Re-dissenyar `/admin` en subrutes (control tower, editorial, diagnòstic, super-admin) per evitar un únic bundle massiu.
- Replantejar estratègia d'exports client-side cap a server-side per reduir payload client estructural.
- Revisar arquitectura de chunks compartits del dashboard per reduir la propagació de chunks >400 kB entre rutes.

## Guardrails complerts

- Sense refactors massius.
- Sense canvis de lògica de negoci.
- Sense canvis Firestore/remeses/fiscal.
- Sense Lighthouse ni dependències noves.
